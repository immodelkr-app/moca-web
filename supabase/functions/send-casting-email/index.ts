import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const {
            modelName,
            modelPhone,
            modelHeight,
            modelWeight,
            modelAge,
            modelShoeSize,
            portfolioLink,
            currentPhotoUrls = [],
            agencyName,
            agencyEmail,
        } = await req.json();

        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
        if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY 환경변수가 설정되지 않았습니다.");
        if (!agencyEmail) throw new Error("에이전시 이메일이 없습니다.");
        if (!portfolioLink) throw new Error("프로필 링크가 없습니다.");

        const subject = `${modelName}모델님 프로필입니다.`;

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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f0f5; padding: 24px 16px; width: 100% !important; }
    .wrap { width: 100%; max-width: 600px; margin: 0 auto; }
    .card { background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
    .header { background: linear-gradient(135deg, #6C63FF 0%, #A78BFA 100%); padding: 28px 32px 24px; }
    .header-badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 12px; font-size: 11px; color: rgba(255,255,255,0.9); font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px; }
    .header h1 { color: #ffffff; font-size: 22px; font-weight: 800; line-height: 1.3; }
    .header h1 span { opacity: 0.75; font-size: 14px; font-weight: 500; display: block; margin-bottom: 4px; }
    .body { padding: 28px 32px; }
    .greeting { font-size: 14px; color: #555; line-height: 1.8; margin-bottom: 24px; border-left: 3px solid #A78BFA; padding-left: 14px; }
    .greeting strong { color: #222; }
    .specs { margin-bottom: 24px; font-size: 0; }
    .current-photos { margin-bottom: 24px; }
    .current-photos-title { font-size: 11px; color: #7C3AED; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .photos-grid img { width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: 8px; display: block; }
    @media only screen and (max-width: 480px) { .photos-grid { grid-template-columns: repeat(2, 1fr); } }
    .spec-item { display: inline-block; vertical-align: top; background: #ede9ff; border: 1px solid #c4b5fd; border-radius: 10px; padding: 10px 16px; margin: 0 8px 8px 0; min-width: 110px; }
    .spec-label { font-size: 10px; color: #7C3AED; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .spec-value { font-size: 16px; font-weight: 800; color: #111827; }
    .portfolio-btn { display: block; background: linear-gradient(135deg, #6C63FF, #818CF8); color: #ffffff !important; text-decoration: none; padding: 18px 24px; border-radius: 14px; text-align: center; font-weight: 800; font-size: 15px; letter-spacing: -0.3px; margin-bottom: 20px; }
    .portfolio-btn:hover { opacity: 0.92; }
    .footer { background: #fafafa; border-top: 1px solid #f0f0f0; padding: 18px 32px; text-align: center; }
    .footer p { font-size: 11px; color: #C0C0C0; line-height: 1.7; }
    .footer strong { color: #A78BFA; }
    @media only screen and (max-width: 480px) {
      body { padding: 12px 8px !important; }
      .body { padding: 20px 16px !important; }
      .header { padding: 20px 16px 18px !important; }
      .footer { padding: 14px 16px !important; }
      .spec-item { min-width: 100px; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="header">
        <div class="header-badge">🎯 아임모카 · 스마트 캐스팅</div>
        <h1>
          <span>${agencyName} 담당자님께</span>
          ${modelName}모델님의 프로필
        </h1>
      </div>

      <div class="body">
        <p class="greeting">
          안녕하세요, <strong>${agencyName}</strong> 담당자님!<br>
          광고모델 <strong>${modelName}</strong>입니다.<br>
          아래 링크는 저의 최신 프로필입니다. 확인 부탁드립니다.<br>
          앞으로 좋은 광고건으로 함께하고 싶습니다. 🙏✨
        </p>

        <div class="specs">
          ${modelAge ? `<div class="spec-item"><div class="spec-label">출생년도</div><div class="spec-value">${modelAge}년생${manAge ? ` (만 ${manAge}세)` : ''}</div></div>` : ""}
          ${modelHeight ? `<div class="spec-item"><div class="spec-label">키</div><div class="spec-value">${modelHeight}cm</div></div>` : ""}
          ${modelWeight ? `<div class="spec-item"><div class="spec-label">몸무게</div><div class="spec-value">${modelWeight}kg</div></div>` : ""}
          ${modelShoeSize ? `<div class="spec-item"><div class="spec-label">신발사이즈</div><div class="spec-value">${modelShoeSize}mm</div></div>` : ""}
          ${modelPhone ? `<div class="spec-item"><div class="spec-label">연락처</div><div class="spec-value">${modelPhone}</div></div>` : ""}
        </div>

        ${currentPhotoUrls.length > 0 ? `
        <div class="current-photos">
          <div class="current-photos-title">📸 현재모습</div>
          <div class="photos-grid">
            ${currentPhotoUrls.slice(0, 9).map(url => `<img src="${url}" alt="현재모습" />`).join('')}
          </div>
        </div>` : ''}

        <a href="${portfolioLink}" class="portfolio-btn">
          📁 ${modelName}모델님 프로필 다운받기
        </a>

      </div>

      <div class="footer">
        <p>
          이 메일은 <strong>아임모카 앱</strong>을 통해 자동 발송되었습니다.<br>
          Powered by 아임모카 · 광고모델 스마트 캐스팅
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

        console.log("[send-casting-email] 요청 시작:", { agencyEmail, agencyName, modelName, photoCount: currentPhotoUrls.length });

        const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: `아임모카 캐스팅 <immodel@immodel.kr>`,
                to: [agencyEmail],
                subject,
                html,
            }),
        });

        const result = await resendResponse.json();
        console.log("[send-casting-email] Resend 응답:", resendResponse.status, JSON.stringify(result));

        if (!resendResponse.ok) {
            throw new Error(result.message || "Resend API 오류");
        }

        return new Response(
            JSON.stringify({ success: true, id: result.id }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err) {
        return new Response(
            JSON.stringify({ success: false, error: (err as Error).message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
