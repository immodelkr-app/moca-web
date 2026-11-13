import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// 비밀번호 재설정(SMS 인증): send → 인증번호 문자 발송, reset → 인증번호 확인 후 비밀번호 교체.
// service role로만 users.password_hash를 바꾸므로, 앱(anon)은 인증번호 없이 비밀번호를 바꿀 수 없다.
// 필요한 시크릿: SOLAPI_API_KEY, SOLAPI_SECRET_KEY (aligo-send와 동일), SUPABASE_URL/SERVICE_ROLE_KEY(자동)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SOLAPI_API_KEY = Deno.env.get("SOLAPI_API_KEY") ?? "";
const SOLAPI_SECRET_KEY = Deno.env.get("SOLAPI_SECRET_KEY") ?? "";
const SOLAPI_SENDER = "01055439674";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 3; // shortcut: 회원 1명당 한도만 있고 IP/전체 한도는 없음, 남용이 보이면 IP·일일 총량 제한 추가

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const db = (path: string, init: RequestInit = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });

async function sha256Hex(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function solapiAuth() {
  const date = new Date().toISOString();
  const salt = crypto.randomUUID().replace(/-/g, "");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SOLAPI_SECRET_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(date + salt));
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${hex}`;
}

async function sendSms(to: string, text: string) {
  const r = await fetch("https://api.solapi.com/messages/v4/send-many/detail", {
    method: "POST",
    headers: { Authorization: await solapiAuth(), "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ to: to.replace(/\D/g, ""), from: SOLAPI_SENDER, text }] }),
  });
  const j = await r.json().catch(() => ({}));
  return r.ok && !j.errorCode && !(j.failedMessageList || []).length;
}

// 연락처는 DB에 하이픈 유무가 섞여 있어 두 형태 모두 비교
async function findUser(nickname: string, phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!nickname || digits.length < 10) return null;
  const hy = digits.length === 11 ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}` : digits;
  const q = `users?select=id,phone&nickname=eq.${encodeURIComponent(nickname)}&phone=in.(${digits},${hy})&order=created_at.desc&limit=1`;
  const r = await db(q);
  const [u] = r.ok ? await r.json() : [];
  return u || null;
}

const MISMATCH = "아이디 또는 연락처가 일치하지 않습니다.";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { action, nickname, phone, code, newHash } = await req.json();
    const user = await findUser(String(nickname || "").trim(), phone);

    if (action === "send") {
      if (!user) return json({ success: false, error: MISMATCH });
      const since = new Date(Date.now() - 3600_000).toISOString();
      const cnt = await db(`password_reset_otps?select=id&user_id=eq.${user.id}&created_at=gte.${since}`);
      if (cnt.ok && (await cnt.json()).length >= MAX_SENDS_PER_HOUR) {
        return json({ success: false, error: "인증번호 요청이 너무 많습니다. 1시간 뒤에 다시 시도해 주세요." });
      }
      const otp = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
      const ins = await db("password_reset_otps", {
        method: "POST",
        body: JSON.stringify({ user_id: user.id, code_hash: await sha256Hex(otp + user.id), expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString() }),
      });
      if (!ins.ok) return json({ success: false, error: "인증번호 생성에 실패했습니다." });
      const sent = await sendSms(user.phone, `[모카] 비밀번호 재설정 인증번호는 ${otp} 입니다. (5분 내 입력)`);
      return json(sent ? { success: true } : { success: false, error: "문자 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." });
    }

    if (action === "reset") {
      if (!user || !code || !newHash) return json({ success: false, error: "인증번호가 올바르지 않습니다." });
      const r = await db(`password_reset_otps?select=id,code_hash,attempts,expires_at&user_id=eq.${user.id}&order=created_at.desc&limit=1`);
      const [otp] = r.ok ? await r.json() : [];
      if (!otp || new Date(otp.expires_at) < new Date() || otp.attempts >= MAX_ATTEMPTS) {
        return json({ success: false, error: "인증번호가 만료되었거나 시도 횟수를 초과했습니다. 다시 요청해 주세요." });
      }
      // 맞든 틀리든 시도 횟수 먼저 올려 추측 대입을 막는다
      await db(`password_reset_otps?id=eq.${otp.id}`, { method: "PATCH", body: JSON.stringify({ attempts: otp.attempts + 1 }) });
      if ((await sha256Hex(String(code).trim() + user.id)) !== otp.code_hash) {
        return json({ success: false, error: "인증번호가 올바르지 않습니다." });
      }
      const upd = await db(`users?id=eq.${user.id}`, { method: "PATCH", body: JSON.stringify({ password_hash: newHash }) });
      await db(`password_reset_otps?user_id=eq.${user.id}`, { method: "DELETE" });
      return json(upd.ok ? { success: true } : { success: false, error: "비밀번호 변경에 실패했습니다." });
    }

    return json({ success: false, error: "잘못된 요청입니다." });
  } catch (e) {
    return json({ success: false, error: "오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
  }
});
