// 클래스 공유 링크용 OG 페이지 (/s/class/:id → 이 함수)
// 카카오톡 등 링크 미리보기 크롤러는 JS를 실행하지 않으므로, 클래스별 포스터/제목을 서버에서 메타태그로 내려준 뒤
// 실제 사용자는 앱의 클래스 상세 페이지로 즉시 이동시킨다.
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

export default async function handler(req, res) {
    const id = String(req.query.id || '').split(/[?%/]/)[0];
    const target = id ? `${SITE_URL}/home/class/${encodeURIComponent(id)}` : `${SITE_URL}/class`;

    let cls = null;
    if (id && SUPABASE_ANON_KEY && /^[0-9a-f-]{36}$/i.test(id)) {
        try {
            const r = await fetch(
                `${SUPABASE_URL}/rest/v1/classes?id=eq.${id}&select=title,class_date,location,image_url`,
                { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
            );
            if (r.ok) cls = (await r.json())[0] || null;
        } catch (e) {
            console.error('class-og fetch error:', e);
        }
    }

    const title = cls ? `🎓 모카 클래스 - ${cls.title}` : '모카 클래스 | 아임모델 모카';
    const description = cls
        ? [cls.class_date && `📅 ${cls.class_date}`, cls.location && `📍 ${cls.location}`].filter(Boolean).join('  ') || '지금 아임모카에서 신청하세요!'
        : '지금 아임모카에서 신청하세요!';
    const image = cls?.image_url || DEFAULT_IMAGE;

    const html = `<!doctype html>
<html lang="ko"><head>
<meta charset="UTF-8" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="아임모델 모카" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${escapeHtml(image)}" />
<meta property="og:url" content="${escapeHtml(`${SITE_URL}/s/class/${id}`)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta http-equiv="refresh" content="0;url=${escapeHtml(target)}" />
</head><body>
<script>location.replace(${JSON.stringify(target)});</script>
<a href="${escapeHtml(target)}">클래스 보러가기</a>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);
}
