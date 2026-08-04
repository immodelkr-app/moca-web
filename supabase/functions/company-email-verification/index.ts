import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CODE_TTL_MS = 10 * 60 * 1000; // 10분
const RESEND_COOLDOWN_MS = 60 * 1000; // 60초
const HOURLY_SEND_LIMIT = 5;
const MAX_VERIFY_ATTEMPTS = 5;

const esc = (s: unknown): string =>
    String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const json = (body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        status: 200, // Supabase JS SDK 호환성: 에러도 HTTP 200으로 반환하고 body.success로 구분
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { action, email, code, purpose = "company_signup" } = await req.json();

        if (!email || !String(email).includes("@")) {
            return json({ success: false, error: "올바른 이메일 주소를 입력해 주세요." });
        }

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        if (action === "send") {
            const { data: recent } = await supabase
                .from("email_verifications")
                .select("id, created_at")
                .eq("email", email)
                .eq("purpose", purpose)
                .order("created_at", { ascending: false })
                .limit(HOURLY_SEND_LIMIT);

            const now = Date.now();
            if (recent && recent.length > 0) {
                const lastSentMs = new Date(recent[0].created_at).getTime();
                if (now - lastSentMs < RESEND_COOLDOWN_MS) {
                    return json({ success: false, error: "잠시 후 다시 시도해 주세요." });
                }
                const withinHour = recent.filter((r: { created_at: string }) => now - new Date(r.created_at).getTime() < 60 * 60 * 1000);
                if (withinHour.length >= HOURLY_SEND_LIMIT) {
                    return json({ success: false, error: "인증번호 요청 횟수를 초과했습니다. 1시간 후 다시 시도해 주세요." });
                }
            }

            const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
            const expiresAt = new Date(now + CODE_TTL_MS).toISOString();

            const { error: insertError } = await supabase
                .from("email_verifications")
                .insert([{ email, code: verificationCode, purpose, expires_at: expiresAt }]);

            if (insertError) {
                console.error("[company-email-verification] insert 실패:", insertError);
                return json({ success: false, error: "인증번호 생성 중 오류가 발생했습니다." });
            }

            const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
            if (!RESEND_API_KEY) {
                console.error("RESEND_API_KEY 환경변수가 누락되었습니다.");
                return json({ success: false, error: "서버 설정 오류 (API Key 미설정)" });
            }

            const html = `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:32px 24px;background:#f0f0f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Malgun Gothic',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,0.14);">
    <div style="background:linear-gradient(135deg,#6C63FF 0%,#A78BFA 100%);padding:32px;text-align:center;">
      <p style="margin:0 0 6px;color:rgba(255,255,255,0.85);font-size:12px;font-weight:700;letter-spacing:0.5px;">🎯 아임모카 · 업체 회원가입</p>
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">이메일 인증번호</h1>
    </div>
    <div style="padding:36px 32px;text-align:center;">
      <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.7;">아래 인증번호를 회원가입 화면에 입력해 주세요.<br>인증번호는 <strong>10분간</strong> 유효합니다.</p>
      <div style="display:inline-block;background:#ede9ff;border:1px solid #c4b5fd;border-radius:16px;padding:18px 32px;font-size:32px;font-weight:800;letter-spacing:8px;color:#4C1D95;">${esc(verificationCode)}</div>
      <p style="margin:24px 0 0;color:#C0C0C0;font-size:11px;line-height:1.6;">본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p>
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
                    from: `아임모카 <immodel@immodel.kr>`,
                    to: [email],
                    subject: `[아임모카] 이메일 인증번호 ${verificationCode}`,
                    html,
                }),
            });

            const result = await resendResponse.json();
            if (!resendResponse.ok) {
                console.error("[company-email-verification] Resend 오류:", result);
                return json({ success: false, error: result.message || "이메일 발송에 실패했습니다." });
            }

            return json({ success: true });
        }

        if (action === "verify") {
            if (!code) return json({ success: false, error: "인증번호를 입력해 주세요." });

            const { data: rows, error: selectError } = await supabase
                .from("email_verifications")
                .select("id, code, verified, attempts, expires_at")
                .eq("email", email)
                .eq("purpose", purpose)
                .order("created_at", { ascending: false })
                .limit(1);

            if (selectError || !rows || rows.length === 0) {
                return json({ success: false, error: "먼저 인증번호를 발송해 주세요." });
            }

            const row = rows[0];

            if (row.verified) {
                return json({ success: true });
            }

            if (new Date(row.expires_at).getTime() < Date.now()) {
                return json({ success: false, error: "인증번호가 만료되었습니다. 다시 발송해 주세요." });
            }

            if (row.attempts >= MAX_VERIFY_ATTEMPTS) {
                return json({ success: false, error: "시도 횟수를 초과했습니다. 인증번호를 다시 발송해 주세요." });
            }

            if (String(row.code) !== String(code)) {
                await supabase
                    .from("email_verifications")
                    .update({ attempts: row.attempts + 1 })
                    .eq("id", row.id);
                return json({ success: false, error: "인증번호가 일치하지 않습니다." });
            }

            await supabase
                .from("email_verifications")
                .update({ verified: true })
                .eq("id", row.id);

            return json({ success: true });
        }

        return json({ success: false, error: "알 수 없는 요청입니다." });
    } catch (err) {
        console.error("[company-email-verification] 예외:", err);
        return json({ success: false, error: (err as Error).message || "처리 중 오류가 발생했습니다." });
    }
});
