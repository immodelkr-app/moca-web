import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { TEMPLATE } from "./template.ts";

// 업체 대상 모카캐스팅 홍보 메일 (관리자 전용). 액션: send(분할 발송) | test(본인 테스트) | stats(현황)
// 광고성 메일 법규 대응: (광고) 제목 강제, 수신거부 링크/발신자 주소 필수, 야간 발송 차단, 수신거부 업체 자동 제외

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 관리자 키(로그인으로 발급된 세션 토큰) 검증은 DB의 admin_key_ok RPC(service_role 전용)에 맡긴다
async function isAdminKey(key: unknown): Promise<boolean> {
    if (typeof key !== "string" || !key) return false;
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const sk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const r = await fetch(`${url}/rest/v1/rpc/admin_key_ok`, {
        method: "POST",
        headers: { apikey: sk, Authorization: `Bearer ${sk}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_key: key }),
    });
    return r.ok && (await r.json()) === true;
}

const SITE = "https://immoca.kr";
const FROM = "아임모카 <immodel@immodel.kr>";
const REPLY_TO = "immodelkr@gmail.com";
const MAX_PER_CALL = 50;        // 한 번에 보낼 수 있는 최대 업체 수
const SEND_GAP_MS = 700;        // 건당 간격 (Resend 초당 요청 제한 + 스팸 방지)
const BREAKER_MIN_SENT = 20;    // 이 건수 이상 보낸 뒤부터 반송률을 본다
const BREAKER_RATE = 0.05;      // 반송+스팸신고 5% 초과 시 발송 중단
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

const json = (body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), {
        status: 200, // SDK 호환: 에러도 200 + success:false
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

const esc = (s: unknown) =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const sha256Hex = async (s: string) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 한국시간 08:00~21:00 에만 발송 허용 (정보통신망법: 밤 9시~아침 8시 광고 전송 제한)
const isAllowedHourKst = () => {
    const h = (new Date().getUTCHours() + 9) % 24;
    return h >= 8 && h < 21;
};

const withAdPrefix = (subject: string) => {
    const s = subject.trim();
    return s.startsWith("(광고)") ? s : `(광고) ${s}`;
};

const render = (companyName: string, token: string, senderAddress: string) =>
    TEMPLATE
        .split("{{COMPANY_NAME}}").join(esc(companyName || "업체"))
        .split("{{CTA_URL}}").join(`${SITE}/r/${token}`)
        .split("{{UNSUBSCRIBE_URL}}").join(`${SITE}/unsubscribe/${token}`)
        .split("{{SENDER_ADDRESS}}").join(esc(senderAddress));

const renderText = (companyName: string, token: string, senderAddress: string) =>
    `(광고) ${companyName || "업체"} 담당자님, 안녕하세요.\n\n광고모델을 찾으세요? 모카에서 찾으세요.\n공고만 올리면 가입 모델이 이메일로 바로 지원합니다. 등록은 무료입니다.\n\n공고 등록하기: ${SITE}/r/${token}\n등록 문의: ${REPLY_TO}\n\n발신: 아임모카 · ${senderAddress}\n수신거부: ${SITE}/unsubscribe/${token}`;

const sendOne = async (apiKey: string, to: string, subject: string, companyName: string, token: string, senderAddress: string) => {
    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            from: FROM,
            to: [to],
            reply_to: REPLY_TO,
            subject,
            html: render(companyName, token, senderAddress),
            text: renderText(companyName, token, senderAddress),
            headers: { "List-Unsubscribe": `<${SITE}/unsubscribe/${token}>` },
        }),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, error: String(result?.message || result?.error || `HTTP ${res.status}`) };
    return { ok: true as const, id: String(result?.id || "") };
};

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const body = await req.json();
        const { action, adminKey } = body;

        if (!(await isAdminKey(adminKey))) {
            return json({ success: false, error: "관리자 인증에 실패했습니다." });
        }

        const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

        // ── 현황 조회 ──────────────────────────────────────────
        if (action === "stats") {
            const [{ data: campaigns }, { data: sends }, { data: unsubs }] = await Promise.all([
                supabase.from("email_campaigns").select("id, name, subject, created_at").order("created_at", { ascending: false }),
                supabase.from("email_sends")
                    .select("campaign_id, email, company_name, batch_no, status, sent_at, delivered_at, opened_at, clicked_at, open_count, click_count, error")
                    .order("sent_at", { ascending: false, nullsFirst: false }).limit(5000),
                supabase.from("email_unsubscribes").select("email"),
            ]);
            return json({ success: true, campaigns: campaigns ?? [], sends: sends ?? [], unsubscribed: (unsubs ?? []).map((u: { email: string }) => u.email) });
        }

        const apiKey = Deno.env.get("RESEND_API_KEY");
        const senderAddress = (Deno.env.get("OUTREACH_SENDER_ADDRESS") ?? "").trim();
        if (!apiKey) return json({ success: false, error: "RESEND_API_KEY 환경변수가 없습니다." });
        if (!senderAddress) return json({ success: false, error: "OUTREACH_SENDER_ADDRESS(발신자 사업장 주소) 환경변수가 없습니다. 광고 메일 필수 정보라 설정 전에는 발송할 수 없습니다." });

        // ── 본인 테스트 발송 (기록 안 남김, 야간 제한 없음) ─────────
        if (action === "test") {
            const to = String(body.to ?? "").trim();
            if (!EMAIL_RE.test(to)) return json({ success: false, error: "받는 이메일 형식이 올바르지 않습니다." });
            const r = await sendOne(apiKey, to, `[테스트] ${withAdPrefix(String(body.subject ?? "모카캐스팅 업체 안내"))}`, "테스트업체", "test", senderAddress);
            return r.ok ? json({ success: true }) : json({ success: false, error: r.error });
        }

        // ── 분할 발송 ──────────────────────────────────────────
        if (action === "send") {
            const campaignName = String(body.campaignName ?? "").trim();
            const subject = withAdPrefix(String(body.subject ?? ""));
            if (!campaignName) return json({ success: false, error: "캠페인 이름을 입력해 주세요." });
            if (subject === "(광고)") return json({ success: false, error: "메일 제목을 입력해 주세요." });
            if (!isAllowedHourKst()) return json({ success: false, error: "광고 메일은 한국시간 오전 8시~오후 9시에만 발송할 수 있습니다." });

            const input: { email: string; companyName?: string }[] = Array.isArray(body.recipients) ? body.recipients : [];
            const seen = new Set<string>();
            const cleaned = input
                .map((r) => ({ email: String(r.email ?? "").trim().toLowerCase(), companyName: String(r.companyName ?? "").trim() }))
                .filter((r) => EMAIL_RE.test(r.email) && !seen.has(r.email) && seen.add(r.email));
            if (cleaned.length === 0) return json({ success: false, error: "발송할 유효한 이메일이 없습니다." });
            if (cleaned.length > MAX_PER_CALL) return json({ success: false, error: `한 번에 최대 ${MAX_PER_CALL}곳까지 발송할 수 있습니다. (선택 ${cleaned.length}곳)` });

            // 캠페인 확보 (같은 이름이면 재사용)
            let { data: campaign } = await supabase.from("email_campaigns").select("id, subject").eq("name", campaignName).maybeSingle();
            if (!campaign) {
                const { data: created, error } = await supabase.from("email_campaigns").insert({ name: campaignName, subject }).select("id, subject").single();
                if (error || !created) return json({ success: false, error: `캠페인 생성 실패: ${error?.message}` });
                campaign = created;
            }

            // 자동 중단: 이미 충분히 보냈고 반송+스팸신고 비율이 높으면 발송 차단
            const { data: prev } = await supabase.from("email_sends").select("status, batch_no").eq("campaign_id", campaign.id);
            const prevSent = (prev ?? []).filter((p: { status: string }) => p.status !== "queued" && p.status !== "failed");
            if (prevSent.length >= BREAKER_MIN_SENT) {
                const bad = prevSent.filter((p: { status: string }) => p.status === "bounced" || p.status === "complained").length;
                if (bad / prevSent.length > BREAKER_RATE) {
                    return json({ success: false, error: `반송·스팸신고 비율이 ${(bad / prevSent.length * 100).toFixed(1)}%로 높아 발송을 중단했습니다. 주소 목록을 점검해 주세요.` });
                }
            }

            // 이전에 발송 실패한 기록은 지우고 다시 시도할 수 있게 한다 (campaign+email 유니크 제약 때문)
            const emails = cleaned.map((r) => r.email);
            await supabase.from("email_sends").delete().eq("campaign_id", campaign.id).eq("status", "failed").in("email", emails);

            // 제외: 수신거부 / 이 캠페인에 이미 기록된 이메일
            const [{ data: unsubs }, { data: dup }] = await Promise.all([
                supabase.from("email_unsubscribes").select("email").in("email", emails),
                supabase.from("email_sends").select("email").eq("campaign_id", campaign.id).in("email", emails),
            ]);
            const unsubSet = new Set((unsubs ?? []).map((u: { email: string }) => u.email));
            const dupSet = new Set((dup ?? []).map((u: { email: string }) => u.email));
            const targets = cleaned.filter((r) => !unsubSet.has(r.email) && !dupSet.has(r.email));
            if (targets.length === 0) {
                return json({ success: true, batchNo: null, sent: 0, failed: 0, skippedUnsub: unsubSet.size, skippedDup: dupSet.size });
            }

            const batchNo = ((prev ?? []).reduce((m: number, p: { batch_no: number }) => Math.max(m, p.batch_no), 0)) + 1;
            const { data: rows, error: insErr } = await supabase
                .from("email_sends")
                .insert(targets.map((t) => ({ campaign_id: campaign!.id, email: t.email, company_name: t.companyName, batch_no: batchNo })))
                .select("id, email, company_name, token");
            if (insErr || !rows) return json({ success: false, error: `발송 기록 생성 실패: ${insErr?.message}` });

            let sent = 0, failed = 0;
            for (const row of rows as { id: string; email: string; company_name: string; token: string }[]) {
                const r = await sendOne(apiKey, row.email, subject, row.company_name, row.token, senderAddress);
                if (r.ok) {
                    sent++;
                    await supabase.from("email_sends").update({ status: "sent", resend_id: r.id, sent_at: new Date().toISOString() }).eq("id", row.id);
                } else {
                    failed++;
                    await supabase.from("email_sends").update({ status: "failed", error: r.error }).eq("id", row.id);
                }
                await sleep(SEND_GAP_MS);
            }
            return json({ success: true, batchNo, sent, failed, skippedUnsub: unsubSet.size, skippedDup: dupSet.size });
        }

        return json({ success: false, error: "알 수 없는 요청입니다." });
    } catch (err) {
        console.error("[outreach-email] 오류:", err);
        return json({ success: false, error: err instanceof Error ? err.message : "서버 오류가 발생했습니다." });
    }
});
