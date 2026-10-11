// 모카캐스팅 공유 링크용 OG 페이지 (/s/casting/:id → 이 함수)
// 카카오톡 등 링크 미리보기 크롤러는 JS를 실행하지 않으므로, 공고 제목/마감/장소를 서버에서 메타태그로 내려준 뒤
// 실제 사용자는 상황에 맞게 이동시킨다.
//  - 로그인 흔적이 있는 브라우저(회원) / 아이폰·PC: 모카캐스팅 상세 페이지(웹)로 이동 (GOLD 미만 회원은 안내 팝업이 뜬다)
//  - 안드로이드 비회원: 모카 앱을 먼저 열어보고(immodel://), 앱이 없으면 구글 플레이 모카 앱 페이지로 자동 이동
// 미리보기에는 공고 제목과 간단한 요약(카테고리·장소·마감)만 노출하고, 페이/지원 방법 등 상세는 담지 않는다.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zlbteyntcolscvsptxzf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SITE_URL = 'https://immoca.kr';
const DEFAULT_IMAGE = `${SITE_URL}/moca_app_icon_512x512.png`;
const APP_PACKAGE = 'com.immodel.mocapp';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_PACKAGE}`;

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
    const validId = /^[0-9a-f-]{36}$/i.test(id);
    const target = validId ? `${SITE_URL}/home/castings/${id}` : `${SITE_URL}/home/castings`;
    // 안드로이드 크롬/카카오톡 인앱 브라우저용: 앱이 설치돼 있으면 앱의 해당 공고로, 없으면 구글 플레이로 (browser_fallback_url)
    const appPath = validId ? `home/castings/${id}` : 'home/castings';
    const intentUrl = `intent://${appPath}#Intent;scheme=immodel;package=${APP_PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;

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
<noscript><meta http-equiv="refresh" content="0;url=${escapeHtml(target)}" /></noscript>
</head><body style="font-family:-apple-system,'Apple SD Gothic Neo',sans-serif;text-align:center;padding:56px 20px;color:#1F1235">
<p style="font-size:17px;font-weight:800;margin:0 0 6px">모카캐스팅을 여는 중이에요…</p>
<p style="font-size:13px;color:#6B7280;margin:0 0 20px">앱이 없으면 구글 플레이로 이동해요.</p>
<p style="font-size:14px;margin:0"><a href="${escapeHtml(PLAY_STORE_URL)}" style="color:#7C3AED;font-weight:700">모카 앱 설치하기</a> &nbsp;·&nbsp; <a href="${escapeHtml(target)}" style="color:#7C3AED;font-weight:700">웹으로 보기</a></p>
<script>
(function () {
  var target = ${JSON.stringify(target)};
  var intentUrl = ${JSON.stringify(intentUrl)};
  var playUrl = ${JSON.stringify(PLAY_STORE_URL)};
  var isAndroid = /android/i.test(navigator.userAgent || '');
  var loggedIn = false;
  try { loggedIn = !!localStorage.getItem('i_model_user'); } catch (e) {}
  // 회원(로그인 흔적)이거나 안드로이드가 아니면(아이폰·PC) 웹 화면으로
  if (loggedIn || !isAndroid) { location.replace(target); return; }
  // 안드로이드 비회원: 앱을 열어보고, 앱이 열리지 않으면(화면이 그대로면) 구글 플레이로
  location.href = intentUrl;
  setTimeout(function () { if (!document.hidden) location.replace(playUrl); }, 2500);
})();
</script>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.status(200).send(html);
}
