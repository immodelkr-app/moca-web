// 모카캐스팅 공유 링크용 OG 페이지 (/s/casting/:id → 이 함수)
// 카카오톡 등 링크 미리보기 크롤러는 JS를 실행하지 않으므로, 공고 제목/마감/장소를 서버에서 메타태그로 내려준 뒤
// 실제 사용자는 앱의 모카캐스팅 상세 페이지로 즉시 이동시킨다. (GOLD 미만 회원은 앱에서 안내 팝업이 뜬다)
// 미리보기에는 공고 제목과 간단한 요약(카테고리·장소·마감)만 노출하고, 페이/지원 방법 등 상세는 담지 않는다.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zlbteyntcolscvsptxzf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = 'https://immoca.kr';
const DEFAULT_IMAGE = `${SITE_URL}/moca_app_icon_512x512.png`;

const escapeHtml = (s = '') =>
    String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const formatDeadline = (deadline) => {
    if (!deadline) return '';
    const d = new Date(`${deadline}T00:00:00Z`);
    const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${dow})까지`;
};

export default async function handler(req, res) {
    const id = String(req.query.id || '').split(/[?%/]/)[0];
    const target = /^[0-9a-f-]{36}$/i.test(id) ? `${SITE_URL}/home/castings/${id}` : `${SITE_URL}/home/castings`;

    let casting = null;
    if (SUPABASE_ANON_KEY && /^[0-9a-f-]{36}$/i.test(id)) {
        try {
            const r = await fetch(
                `${SUPABASE_URL}/rest/v1/model_castings?id=eq.${id}&select=title,category,shoot_location,deadline`,
                { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
            );
            if (r.ok) casting = (await r.json())[0] || null;
        } catch (e) {
            console.error('casting-og fetch error:', e);
        }
    }

    const title = casting ? `📢 모카캐스팅 - ${casting.title}` : '모카캐스팅 | 아임모델 모카';
    const description = casting
        ? [casting.category, casting.shoot_location && `📍 ${casting.shoot_location}`, casting.deadline && `⏰ ${formatDeadline(casting.deadline)}`]
            .filter(Boolean).join('  ') || '아임모카에서 모델 구인 공고를 확인하세요!'
        : '아임모카에서 모델 구인 공고를 확인하세요!';

    const html = `<!doctype html>
<html lang="ko"><head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="아임모델 모카" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(DEFAULT_IMAGE)}" />
<meta property="og:url" content="${escapeHtml(`${SITE_URL}/s/casting/${id}`)}" />
<meta name="twitter:card" content="summary" />
<meta http-equiv="refresh" content="0;url=${escapeHtml(target)}" />
</head><body>
<script>location.replace(${JSON.stringify(target)});</script>
<a href="${escapeHtml(target)}">모카캐스팅 보러가기</a>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);
}
