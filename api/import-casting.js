/**
 * /api/import-casting.js
 * Vercel Serverless Function - 외부 구인 공고 → 모카캐스팅 등록용 JSON 변환
 *
 * 어드민이 공고 링크(필름메이커스) 또는 직접 붙여넣은 본문(카페·밴드 등 링크로 읽을 수 없는 글)을
 * Claude가 "우리 버전"으로 요약·재구성합니다.
 * 원문 문장을 그대로 옮기지 않고 요약하며, 등록은 어드민이 결과를 확인·수정한 뒤에만 이뤄집니다.
 * 서버에서 페이지를 못 읽으면(차단 등) needText: true 를 내려 본문 붙여넣기로 폴백하게 합니다.
 *
 * POST /api/import-casting
 * headers: { 'x-admin-token': string }
 * body: { url?: string, text?: string }
 *   - text가 있으면 페이지를 가져오지 않고 그 본문을 사용 (url은 출처 표기용으로만 쓰이며 선택)
 *   - text가 없으면 url이 필름메이커스 주소여야 서버가 본문을 가져옴
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-5';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ADMIN_TOKEN = process.env.VITE_ADMIN_PASSWORD || 'immodel2024';

// SSRF 방지: 서버가 직접 가져오는 것은 허용된 출처만 (그 외 주소는 저장만 하고 읽지 않는다)
const FETCHABLE_SOURCES = {
    'filmmakers.co.kr': '필름메이커스',
    'www.filmmakers.co.kr': '필름메이커스',
};

const MAX_TEXT_CHARS = 9000;

const CATEGORIES = ['TV광고', '뮤직비디오', '화보촬영', 'TV프로그램', 'SNS/온라인예능', 'SNS/온라인광고', '홈쇼핑/라이브커머스', '교육/기업/홍보영상', '기타'];

const decodeEntities = (s) => s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");

const htmlToText = (html) => {
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const body = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr)\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ');
    const text = decodeEntities(body)
        .split('\n')
        .map((l) => l.replace(/[ \t]+/g, ' ').trim())
        .filter(Boolean)
        .join('\n');
    // 본문 앞쪽의 메뉴/스크립트 잡음을 버리고 공고 본문("구인자 정보")부터 사용
    const bodyStart = text.indexOf('구인자 정보');
    return `${decodeEntities(title).trim()}\n${bodyStart > 0 ? text.slice(bodyStart) : text}`;
};

const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

const buildPrompt = (pageText, url) => `아래는 모델/배우 구인 공고의 본문입니다.${url ? ` (출처 URL: ${url})` : ''} 페이지에는 공고 외에 다른 공고 목록이나 메뉴가 섞여 있을 수 있으니, 맨 처음에 나오는 단일 공고만 사용하세요.

이 내용을 "모카" 앱의 모카캐스팅 공고 양식으로 요약·재구성해 JSON으로만 출력하세요. 오늘 날짜는 ${todayKst()}입니다.

규칙:
- 원문 문장을 그대로 복사하지 말고 자연스럽게 요약해 다시 쓰세요 (사실 정보는 정확히 유지).
- category는 다음 중 하나: ${CATEGORIES.join(', ')}
- deadline은 YYYY-MM-DD. 연도가 없으면 오늘 이후 가장 가까운 날짜로 추정. 마감일이 없거나 알 수 없으면 null.
- roles 각 항목: roleName, gender("male"|"female"|"any"), ageMin, ageMax(정수, "30대 중반"→35, "40대 후반"→48처럼 대표값. 모르면 null), headcount(정수), pay(예: "건당 20만원"), schedule, description(역할 조건 요약, 없으면 null)
- description은 프로젝트 개요와 지원 조건을 읽기 쉽게 요약한 상세 설명 (줄바꿈 가능, 800자 이내). 연락처/이메일/전화번호는 넣지 마세요.
- applyGuide는 지원 방법 안내 문구 (이메일 주소·제목 형식·첨부서류가 원문에 있으면 포함, 제목 말머리는 원문 그대로 유지). 없으면 null.
- producerName은 제작사/구인자명. contractType은 계약서 작성 여부 요약(없으면 null).
- 확실하지 않은 값은 지어내지 말고 null.

출력 형식(JSON만, 코드블록·설명 금지):
{"title":"","category":"","projectName":"","producerName":"","shootPeriod":"","shootLocation":"","deadline":"","contractType":"","description":"","applyGuide":"","roles":[{"roleName":"","gender":"any","ageMin":null,"ageMax":null,"headcount":1,"pay":"","schedule":"","description":""}]}

--- 공고 본문 ---
${pageText}`;

const parseJson = (raw) => {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('AI 응답에서 JSON을 찾지 못했습니다.');
    return JSON.parse(raw.slice(start, end + 1));
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
        return res.status(401).json({ error: '인증되지 않은 요청입니다.' });
    }
    if (!ANTHROPIC_API_KEY) {
        console.error('[import-casting] ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.');
        return res.status(500).json({ error: 'Server configuration error: missing Claude API key.' });
    }

    const { url, text } = req.body || {};
    let pageText = typeof text === 'string' ? text.trim() : '';

    // 링크는 선택. 있으면 http(s) 형식인지만 확인 (javascript: 등은 거부)
    let sourceUrl = null;
    let sourceName = null;
    let canFetch = false;
    if (typeof url === 'string' && url.trim()) {
        let parsedUrl;
        try {
            parsedUrl = new URL(url.trim());
        } catch {
            return res.status(400).json({ error: '올바른 공고 링크가 아닙니다.' });
        }
        if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
            return res.status(400).json({ error: '링크는 http(s) 주소여야 합니다.' });
        }
        sourceName = FETCHABLE_SOURCES[parsedUrl.hostname] || null;
        canFetch = parsedUrl.protocol === 'https:' && !!sourceName;
        // 필름메이커스는 쿼리를 떼고 정규화, 그 외(카페 등)는 글 식별에 쿼리가 필요하므로 그대로 저장
        sourceUrl = canFetch ? `${parsedUrl.origin}${parsedUrl.pathname}` : parsedUrl.href;
    }

    if (!pageText) {
        if (!sourceUrl) {
            return res.status(400).json({ error: '공고 링크 또는 붙여넣을 본문이 필요합니다.' });
        }
        if (!canFetch) {
            return res.status(422).json({
                error: '이 링크는 서버에서 읽을 수 없습니다(로그인이 필요한 카페·밴드 등). 공고 본문을 복사해 붙여넣어 주세요.',
                needText: true,
            });
        }
        try {
            const pageRes = await fetch(sourceUrl, {
                headers: {
                    'user-agent': 'Mozilla/5.0 (compatible; MocaBot/1.0)',
                    'accept-language': 'ko-KR,ko;q=0.9',
                },
                redirect: 'manual',
                signal: AbortSignal.timeout(10000),
            });
            if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`);
            pageText = htmlToText(await pageRes.text());
        } catch (error) {
            console.warn('[import-casting] 페이지 가져오기 실패:', error.message);
            return res.status(422).json({
                error: '페이지를 자동으로 읽지 못했습니다. 공고 본문을 복사해 붙여넣어 주세요.',
                needText: true,
            });
        }
    }
    if (pageText.length < 40) {
        return res.status(422).json({ error: '공고 본문을 찾지 못했습니다. 본문을 붙여넣어 주세요.', needText: true });
    }

    try {
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: CLAUDE_MODEL,
                max_tokens: 2500,
                thinking: { type: 'disabled' },
                messages: [{ role: 'user', content: buildPrompt(pageText.slice(0, MAX_TEXT_CHARS), sourceUrl) }],
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            return res.status(response.status).json({ error: data?.error?.message || `Claude API 오류 (HTTP ${response.status})` });
        }

        const raw = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');
        const casting = parseJson(raw);

        return res.status(200).json({ casting, sourceUrl, sourceName });
    } catch (error) {
        console.error('[import-casting] 변환 오류:', error.message);
        return res.status(500).json({ error: '공고 내용을 정리하지 못했습니다. 다시 시도해 주세요.' });
    }
}
