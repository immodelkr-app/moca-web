import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const esc = (s: unknown): string =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        console.log("[send-casting-application-email] 요청 수신:", JSON.stringify(body));

        const {
            modelName,
            modelPhone,
            modelHeight,
            modelWeight,
            modelAge,
            modelShoeSize,
            portfolioLink,
            careerAd = "",
            careerOther = "",
            castingTitle,
            roleName = "",
            companyName,
            companyEmail,
        } = body;

        // 업체가 이메일을 등록하지 않은 구계정인 경우 - 지원 자체는 이미 DB에 저장됐으므로
        // 여기서는 실패로 처리하되 앱이 막히지 않도록 success:false만 반환한다.
        if (!companyEmail) {
            return new Response(
                JSON.stringify({ success: false, error: "업체 이메일이 등록되어 있지 않습니다." }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }
        if (!portfolioLink) throw new Error("모델 프로필(포트폴리오) 링크가 없습니다.");

        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (!RESEND_API_KEY) {
            console.error("RESEND_API_KEY 환경변수가 누락되었습니다.");
            throw new Error("서버 설정 오류 (API Key 미설정)");
        }

        const subject = `[모델캐스팅] "${esc(castingTitle)}"에 ${esc(modelName)}님이 지원했습니다`;
        const currentYear = new Date().getFullYear();
        const manAge = modelAge ? currentYear - parseInt(modelAge) : null;

        const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif; background: #f0f0f5; padding: 32px 24px; width: 100% !important; }
    .wrap { width: 100%; max-width: 720px; margin: 0 auto; }
    .card { background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 12px 48px rgba(0,0,0,0.14); }
    .header { background: linear-gradient(135deg, #6C63FF 0%, #A78BFA 100%); padding: 36px 48px 30px; }
    .header-badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 5px 14px; font-size: 12px; color: rgba(255,255,255,0.9); font-weight: 700; letter-spacing: 0.5px; margin-bottom: 14px; }
    .header h1 { color: #ffffff; font-size: 24px; font-weight: 800; line-height: 1.3; }
    .header h1 span { opacity: 0.75; font-size: 15px; font-weight: 500; display: block; margin-bottom: 6px; }
    .body { padding: 36px 48px; }
    .greeting { font-size: 15px; color: #555; line-height: 1.9; margin-bottom: 28px; border-left: 4px solid #A78BFA; padding-left: 16px; }
    .greeting strong { color: #222; }
    .role-badge { display: inline-block; background: #ede9ff; color: #7C3AED; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 999px; margin-bottom: 20px; }
    .section-title { font-size: 11px; color: #7C3AED; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    .section-title::after { content: ''; flex: 1; height: 1px; background: #ede9ff; }
    .specs { margin-bottom: 28px; }
    .specs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .spec-item { background: #ede9ff; border: 1px solid #c4b5fd; border-radius: 12px; padding: 12px 16px; }
    .spec-label { font-size: 10px; color: #7C3AED; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .spec-value { font-size: 17px; font-weight: 800; color: #111827; }
    .career { margin-bottom: 28px; }
    .career-item { background: #f8f7ff; border: 1px solid #e0d9ff; border-radius: 12px; padding: 14px 18px; margin-bottom: 10px; }
    .career-label { font-size: 10px; color: #7C3AED; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .career-value { font-size: 14px; color: #333; line-height: 1.75; white-space: pre-wrap; }
    .portfolio-btn { display: block; background: linear-gradient(135deg, #6C63FF, #818CF8); color: #ffffff !important; text-decoration: none; padding: 20px 28px; border-radius: 16px; text-align: center; font-weight: 800; font-size: 17px; letter-spacing: -0.3px; margin-bottom: 12px; }
    .portfolio-btn:hover { opacity: 0.92; }
    .hint { font-size: 12px; color: #9CA3AF; text-align: center; margin-bottom: 8px; }
    .footer { background: #fafafa; border-top: 1px solid #f0f0f0; padding: 20px 48px; text-align: center; }
    .footer p { font-size: 12px; color: #C0C0C0; line-height: 1.7; }
    .footer strong { color: #A78BFA; }
    @media only screen and (max-width: 600px) {
      body { padding: 12px 8px !important; }
      .body { padding: 24px 20px !important; }
      .header { padding: 24px 20px 20px !important; }
      .footer { padding: 16px 20px !important; }
      .specs-grid { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <div class="header-badge">📋 아임모카 · 모델캐스팅 지원 접수</div>
        <h1>
          <span>${esc(companyName)} 담당자님께</span>
          "${esc(castingTitle)}"에 새 지원자가 도착했습니다.
        </h1>
      </div>

      <div class="body">
        <p class="greeting">
          안녕하세요, <strong>${esc(companyName)}</strong> 담당자님!<br>
          등록하신 모델캐스팅 공고에 <strong>${esc(modelName)}</strong>님이 지원했습니다.<br>
          아래 프로필을 확인해 주세요.
        </p>

        ${roleName ? `<div class="role-badge">지원 역할 · ${esc(roleName)}</div>` : ""}

        <div class="specs">
          <div class="section-title">모델 프로필</div>
          <div class="specs-grid">
            ${modelAge ? `<div class="spec-item"><div class="spec-label">출생년도</div><div class="spec-value">${esc(modelAge)}년생${manAge ? ` (만 ${manAge}세)` : ''}</div></div>` : ""}
            ${modelHeight ? `<div class="spec-item"><div class="spec-label">키</div><div class="spec-value">${esc(modelHeight)}cm</div></div>` : ""}
            ${modelWeight ? `<div class="spec-item"><div class="spec-label">몸무게</div><div class="spec-value">${esc(modelWeight)}kg</div></div>` : ""}
            ${modelShoeSize ? `<div class="spec-item"><div class="spec-label">신발사이즈</div><div class="spec-value">${esc(modelShoeSize)}mm</div></div>` : ""}
            ${modelPhone ? `<div class="spec-item"><div class="spec-label">연락처</div><div class="spec-value">${esc(modelPhone)}</div></div>` : ""}
          </div>
        </div>

        ${careerAd || careerOther ? `
        <div class="career">
          <div class="section-title">경력</div>
          ${careerAd ? `
          <div class="career-item">
            <div class="career-label">광고모델 경력</div>
            <div class="career-value">${esc(careerAd)}</div>
          </div>` : ""}
          ${careerOther ? `
          <div class="career-item">
            <div class="career-label">그외 경력사항 (방송·연극·패션쇼)</div>
            <div class="career-value">${esc(careerOther)}</div>
          </div>` : ""}
        </div>` : ""}

        <a href="${esc(portfolioLink)}" class="portfolio-btn">
          📁 ${esc(modelName)}모델님 프로필 다운받기
        </a>
        <p class="hint">지원자 전체 목록은 아임모카 업체 계정으로 로그인해 확인하실 수 있습니다.</p>
      </div>

      <div class="footer">
        <p>
          이 메일은 <strong>아임모카 앱</strong>을 통해 자동 발송되었습니다.<br>
          Powered by 아임모카 · 모델캐스팅
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

        const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: `아임모카 캐스팅 <immodel@immodel.kr>`,
                to: [companyEmail],
                subject,
                html,
            }),
        });

        const result = await resendResponse.json();
        console.log("[send-casting-application-email] Resend 응답:", resendResponse.status, JSON.stringify(result));

        if (!resendResponse.ok) {
            throw new Error(result.message || "Resend API 오류");
        }

        return new Response(
            JSON.stringify({ success: true, id: result.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error('[send-casting-application-email] 오류 발생:', err);
        return new Response(
            JSON.stringify({ success: false, error: (err as Error).message }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
