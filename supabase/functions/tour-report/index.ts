import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase Edge Function Secrets에 등록 필요:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SLACK_WEBHOOK_URL, DISCORD_WEBHOOK_URL
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const SLACK_WEBHOOK_URL = Deno.env.get("SLACK_WEBHOOK_URL") ?? "";
const DISCORD_WEBHOOK_URL = Deno.env.get("DISCORD_WEBHOOK_URL") ?? "";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        let manualDestination = ""; // webhookUrl or email address
        let webhookType = "email"; // 'slack' | 'discord' | 'email'
        try {
            const body = await req.json();
            manualDestination = body?.webhookUrl ?? ""; // UI에서 넘어오는 값 (이메일 주소 또는 웹훅 URL)
            webhookType = body?.webhookType ?? "email";
        } catch (_) {}

        if (webhookType === 'email' && !RESEND_API_KEY) {
             return new Response(
                JSON.stringify({ success: false, error: "RESEND_API_KEY 환경변수를 설정해주세요." }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 최근 7일간 투어일지 조회
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: diaries, error: diaryError } = await supabase
            .from('tour_diaries')
            .select('agency_name, nickname, date, content, timestamp')
            .gte('timestamp', sevenDaysAgo)
            .order('timestamp', { ascending: false });

        if (diaryError) throw diaryError;

        const diariesList = diaries || [];
        const totalCount = diariesList.length;

        // 에이전시별 그룹
        const groupedByAgency: Record<string, typeof diariesList> = {};
        diariesList.forEach(d => {
            const key = d.agency_name || '미기재';
            if (!groupedByAgency[key]) groupedByAgency[key] = [];
            groupedByAgency[key].push(d);
        });

        // 에이전시 TOP 5 (방문 건수 기준)
        const top5 = Object.entries(groupedByAgency)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 5);

        // 총 작성 회원 수 (닉네임 유니크)
        const uniqueWriters = new Set(diariesList.map(d => d.nickname).filter(Boolean)).size;

        // 날짜 문자열
        const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
        const weekAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

        if (webhookType === 'email') {
            const emailTarget = manualDestination || "admin@immodel.kr"; // 기본 이메일 설정 필요시
            if (!emailTarget.includes('@')) {
                 return new Response(
                    JSON.stringify({ success: false, error: "유효한 이메일 주소를 입력해주세요." }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                <h1 style="color: #6366f1; font-size: 24px; text-align: center; border-bottom: 2px solid #e0e7ff; padding-bottom: 15px;">📒 아임모델 주간 투어일지 리포트</h1>
                <p style="text-align: center; color: #6b7280; font-size: 14px;">기간: ${weekAgoStr} ~ ${todayStr}</p>
                
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; display: flex; justify-content: space-around; text-align: center;">
                    <div><div style="font-size: 12px; color: #64748b;">총 투어일지</div><div style="font-size: 20px; font-weight: bold; color: #0f172a;">${totalCount}건</div></div>
                    <div><div style="font-size: 12px; color: #64748b;">참여 회원</div><div style="font-size: 20px; font-weight: bold; color: #0f172a;">${uniqueWriters}명</div></div>
                    <div><div style="font-size: 12px; color: #64748b;">에이전시 수</div><div style="font-size: 20px; font-weight: bold; color: #0f172a;">${top5.length}개</div></div>
                </div>

                <h2 style="font-size: 18px; color: #334155; margin-top: 30px;">🏢 에이전시별 방문 TOP 5</h2>
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    ${top5.map(([agency, entries], i) => {
                        const writers = new Set(entries.map(e => e.nickname).filter(Boolean)).size;
                        const latestEntry = entries[0];
                        const preview = (latestEntry?.content || '').slice(0, 80) + ((latestEntry?.content || '').length > 80 ? '...' : '');
                        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                        return `
                        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #fafafa;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <div style="font-weight: bold; font-size: 16px; color: #3b82f6;">${medals[i] || `${i + 1}.`} ${agency}</div>
                                <div style="font-size: 13px; background: #e0e7ff; color: #4f46e5; padding: 2px 8px; border-radius: 12px; font-weight: bold;">${entries.length}건 / ${writers}명 작성</div>
                            </div>
                            <div style="font-size: 13px; color: #475569; line-height: 1.5; background: #f1f5f9; padding: 10px; border-radius: 6px; border-left: 3px solid #cbd5e1;">
                                "${preview || '(내용 없음)'}"
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8;">
                    아임모델 어드민 자동 리포트 · ${todayStr}
                </div>
            </div>`;

            const resendResponse = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: `아임모델 어드민 <immodel@immodel.kr>`,
                    to: [emailTarget],
                    subject: `[아임모델] 주간 투어일지 리포트 (${weekAgoStr} ~ ${todayStr})`,
                    html,
                }),
            });

            const result = await resendResponse.json();
            if (!resendResponse.ok) {
                throw new Error(`Resend API 오류: ${result.message || resendResponse.status}`);
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `이메일 발송 완료 (${emailTarget})`,
                    summary: { total: totalCount, writers: uniqueWriters, agencies: top5.length }
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );

        } else {
            // 기존 Slack / Discord 로직
            const webhookUrl = manualDestination || SLACK_WEBHOOK_URL || DISCORD_WEBHOOK_URL;
            if (!webhookUrl) {
                return new Response(
                    JSON.stringify({ success: false, error: "SLACK_WEBHOOK_URL 또는 DISCORD_WEBHOOK_URL 환경변수를 설정해주세요." }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const isDiscord = webhookType === 'discord' || (DISCORD_WEBHOOK_URL && !SLACK_WEBHOOK_URL && !manualDestination);
            let payload: any;

            if (isDiscord) {
                const fields = top5.map(([agency, entries], i) => {
                    const writers = new Set(entries.map(e => e.nickname).filter(Boolean)).size;
                    const latestEntry = entries[0];
                    const preview = (latestEntry?.content || '').slice(0, 80) + ((latestEntry?.content || '').length > 80 ? '...' : '');
                    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                    return {
                        name: `${medals[i] || `${i + 1}.`} ${agency}  ·  ${entries.length}건`,
                        value: `👤 ${writers}명 작성\n> ${preview || '(내용 없음)'}`,
                        inline: false,
                    };
                });

                payload = {
                    embeds: [{
                        title: `📒 아임모델 주간 투어일지 리포트`,
                        description: `${weekAgoStr} ~ ${todayStr} 기간의 투어 현황을 요약했습니다.`,
                        color: 0x7C3AED,
                        fields: [
                            { name: '📊 주간 통계', value: `총 **${totalCount}건**의 투어일지  ·  **${uniqueWriters}명** 참여  ·  **${top5.length}개** 에이전시`, inline: false },
                            ...fields,
                        ],
                        footer: { text: '아임모델 어드민 자동 리포트' },
                        timestamp: new Date().toISOString(),
                    }],
                };
            } else {
                const topAgencyBlocks = top5.map(([agency, entries], i) => {
                    const writers = new Set(entries.map(e => e.nickname).filter(Boolean)).size;
                    const latestEntry = entries[0];
                    const preview = (latestEntry?.content || '').slice(0, 100) + ((latestEntry?.content || '').length > 100 ? '...' : '');
                    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                    return {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*${medals[i] || `${i + 1}.`} ${agency}*  ·  ${entries.length}건 / ${writers}명 작성\n> ${preview || '(내용 없음)'}`,
                        },
                    };
                });

                payload = {
                    blocks: [
                        { type: "header", text: { type: "plain_text", text: "📒 아임모델 주간 투어일지 리포트", emoji: true } },
                        { type: "section", text: { type: "mrkdwn", text: `*기간*: ${weekAgoStr} ~ ${todayStr}\n*총 투어일지*: \`${totalCount}건\` · *참여 회원*: \`${uniqueWriters}명\` · *에이전시 수*: \`${top5.length}개\`` } },
                        { type: "divider" },
                        { type: "section", text: { type: "mrkdwn", text: "*🏢 에이전시별 방문 TOP 5*" } },
                        ...topAgencyBlocks,
                        { type: "divider" },
                        { type: "context", elements: [{ type: "mrkdwn", text: `아임모델 어드민 자동 리포트 · ${todayStr}` }] },
                    ],
                };
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Webhook 발송 실패: ${response.status} ${text}`);
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `리포트 발송 완료 (총 ${totalCount}건, TOP ${top5.length}개 에이전시)`,
                    summary: { total: totalCount, writers: uniqueWriters, agencies: top5.length }
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

    } catch (error: any) {
        console.error('[tour-report] 에러:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
