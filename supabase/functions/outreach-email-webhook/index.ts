import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

// Resend 웹훅 수신 → email_sends 상태/이벤트 반영
// Resend 대시보드 Webhooks 에 https://<project>.supabase.co/functions/v1/outreach-email-webhook?s=<OUTREACH_WEBHOOK_SECRET> 등록
// (Resend 는 Svix 서명을 쓰지만, 의존성 없이 URL 비밀값으로 호출자를 확인한다. shortcut: 서명 검증 미적용, 비밀값 유출 시 교체)
// 클릭은 우리 /r/:token 페이지가 직접 기록하므로 email.clicked 는 무시한다.

serve(async (req) => {
    const secret = Deno.env.get("OUTREACH_WEBHOOK_SECRET") ?? "";
    const given = new URL(req.url).searchParams.get("s") ?? "";
    if (!secret || given !== secret) return new Response("unauthorized", { status: 401 });

    try {
        const payload = await req.json();
        const type: string = payload?.type ?? "";
        const resendId: string = payload?.data?.email_id ?? "";
        if (!resendId) return new Response("ok");

        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
        const { data: send } = await supabase.from("email_sends").select("id, email, open_count").eq("resend_id", resendId).maybeSingle();
        if (!send) return new Response("ok"); // 우리 발송이 아닌 메일(다른 기능의 Resend 메일)은 무시

        const now = new Date().toISOString();
        if (type === "email.delivered") {
            await supabase.from("email_sends").update({ status: "delivered", delivered_at: now }).eq("id", send.id).in("status", ["sent", "queued"]);
            await supabase.from("email_events").insert({ send_id: send.id, type: "delivered" });
        } else if (type === "email.opened") {
            await supabase.from("email_sends").update({ opened_at: now, open_count: (send.open_count ?? 0) + 1 }).eq("id", send.id);
            await supabase.from("email_events").insert({ send_id: send.id, type: "opened" });
        } else if (type === "email.bounced") {
            await supabase.from("email_sends").update({ status: "bounced" }).eq("id", send.id);
            await supabase.from("email_events").insert({ send_id: send.id, type: "bounced" });
        } else if (type === "email.complained") {
            // 스팸 신고는 즉시 영구 제외
            await supabase.from("email_sends").update({ status: "complained" }).eq("id", send.id);
            await supabase.from("email_unsubscribes").upsert({ email: String(send.email).toLowerCase() });
            await supabase.from("email_events").insert({ send_id: send.id, type: "complained" });
        }
        return new Response("ok");
    } catch (err) {
        console.error("[outreach-email-webhook] 오류:", err);
        return new Response("error", { status: 500 });
    }
});
