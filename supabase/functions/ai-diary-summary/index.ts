import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase Edge Function Secrets에 등록 필요:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        if (!GEMINI_API_KEY) {
            return new Response(
                JSON.stringify({ success: false, error: "GEMINI_API_KEY 환경변수를 설정해주세요." }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const { agencyName } = await req.json();
        if (!agencyName) {
            return new Response(
                JSON.stringify({ success: false, error: "agencyName이 필요합니다." }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // 최근 60일간 해당 에이전시의 투어일지 조회
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
        const { data: diaries, error: diaryError } = await supabase
            .from('tour_diaries')
            .select('nickname, date, content, timestamp')
            .eq('agency_name', agencyName)
            .gte('timestamp', sixtyDaysAgo)
            .order('timestamp', { ascending: false })
            .limit(50);

        if (diaryError) throw diaryError;

        const diariesList = diaries || [];

        if (diariesList.length === 0) {
            return new Response(
                JSON.stringify({ success: false, error: "최근 60일간 이 에이전시에 대한 투어일지가 없습니다." }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 투어일지 텍스트 조합
        const diaryTexts = diariesList
            .filter(d => d.content && d.content.trim())
            .map((d, i) => `[${i + 1}] ${d.date || ''} - ${d.content.trim()}`)
            .join('\n\n');

        if (!diaryTexts) {
            return new Response(
                JSON.stringify({ success: false, error: "분석할 내용이 있는 투어일지가 없습니다." }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Gemini API 호출 (재시도 및 폴백 로직 적용)
        const prompt = `당신은 모델 에이전시 캐스팅 모니터링 전문가입니다. 아래는 "${agencyName}" 에이전시에 방문한 모델들이 남긴 투어일지들입니다. 이 내용들을 분석하여 반드시 아래 JSON 형식으로만 응답하세요. JSON 외에 다른 텍스트는 절대 포함하지 마세요.

일부 일지는 이미 아래 4개 섹션 형식(🎬 영상촬영 진행 / 📋 영상촬영 중 특이사항 / 🏢 에이전시 분위기 / 📝 기타메모)으로 구분되어 작성되어 있습니다. 해당 섹션 내용을 최우선으로 참고하고, 형식이 없는 자유 텍스트 일지는 문맥으로 분류하세요.

{
  "auditioning": "영상촬영 진행 절차/순서 요약 (50자 이내, 없으면 '정보 없음')",
  "tips": "영상촬영 중 특이사항이나 촬영자의 주문내용 (50자 이내, 없으면 '특이사항 없음')",
  "atmosphere": "에이전시 분위기 - 촬영자의 친절도, 대기실 분위기 등 (50자 이내, 없으면 '정보 없음')",
  "memo": "그 외 공유할 기타 메모나 참고사항 (50자 이내, 없으면 '없음')",
  "overall": "전체 요약 한줄 (30자 이내)"
}

--- 투어일지 목록 (총 ${diariesList.length}건) ---
${diaryTexts}`;

        const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
        let rawText = '';
        let lastErrorMsg = '';

        for (const model of models) {
            let attempts = 0;
            const maxAttempts = 2; // 각 모델당 최대 2회 시도
            
            while (attempts < maxAttempts) {
                try {
                    console.log(`[ai-diary-summary] Calling Gemini API (${model}), attempt ${attempts + 1}...`);
                    const geminiRes = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }],
                                generationConfig: {
                                    temperature: 0.3,
                                    maxOutputTokens: 2048,
                                    responseMimeType: "application/json",
                                    responseSchema: {
                                        type: "OBJECT",
                                        properties: {
                                            auditioning: { type: "STRING" },
                                            tips: { type: "STRING" },
                                            atmosphere: { type: "STRING" },
                                            memo: { type: "STRING" },
                                            overall: { type: "STRING" },
                                        },
                                        required: ["auditioning", "tips", "atmosphere", "memo", "overall"],
                                    },
                                    // gemini-2.5 계열은 내부 reasoning("thinking") 토큰이 maxOutputTokens 예산을
                                    // 잠식해 실제 답변이 중간에 잘리는 문제가 있어 이 작업(단순 요약/분류)에는 비활성화
                                    ...(model.includes('2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
                                },
                            }),
                        }
                    );

                    if (geminiRes.status === 200) {
                        const geminiData = await geminiRes.json();
                        rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                        if (rawText.trim()) {
                            console.log(`[ai-diary-summary] Successfully generated content using ${model}`);
                            break;
                        }
                    }

                    const errText = await geminiRes.text();
                    lastErrorMsg = `API Error [${model}] status ${geminiRes.status}: ${errText}`;
                    console.warn(`[ai-diary-summary] ${lastErrorMsg}`);

                    // 400 대 에러(클라이언트 에러)면서 429(Rate limit), 408(Timeout)이 아닌 경우는 재시도 없이 해당 모델 중단
                    if (geminiRes.status >= 400 && geminiRes.status < 500 && geminiRes.status !== 429 && geminiRes.status !== 408) {
                        break;
                    }
                } catch (e: any) {
                    lastErrorMsg = `Fetch error on ${model}: ${e.message}`;
                    console.error(`[ai-diary-summary] ${lastErrorMsg}`);
                }

                attempts++;
                if (attempts < maxAttempts) {
                    // 대기 시간: 1초, 2초 지수 백오프
                    console.log(`[ai-diary-summary] Waiting ${attempts}s before retry...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                }
            }

            if (rawText.trim()) {
                break; // 성공 시 다음 모델 시도 중단
            }
        }

        if (!rawText.trim()) {
            throw new Error(`Gemini API 오류: 모든 모델 호출에 실패했습니다. 마지막 오류: ${lastErrorMsg}`);
        }

        // JSON 파싱
        let summary: any = {};
        try {
            // 마크다운 코드블록 제거 후 파싱
            const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            let parsed = JSON.parse(cleaned);
            // 모델이 단일 객체 대신 배열을 반환한 경우 첫 항목을 사용
            if (Array.isArray(parsed)) {
                parsed = parsed[0] ?? {};
            }
            if (!parsed || typeof parsed !== 'object') throw new Error('unexpected shape');
            summary = parsed;
        } catch (_) {
            // 파싱 실패 시 사용자에게는 일반 오류 메시지만 노출 (raw text는 로그로만 남김)
            console.warn('[ai-diary-summary] JSON 파싱 실패, rawText:', rawText.slice(0, 500));
            summary = {
                auditioning: '분석 중 오류가 발생했습니다.',
                tips: '정보 없음',
                atmosphere: '정보 없음',
                memo: '없음',
                overall: '분석에 실패했습니다. 잠시 후 다시 시도해주세요.',
            };
        }

        return new Response(
            JSON.stringify({
                success: true,
                agencyName,
                diaryCount: diariesList.length,
                summary,
                generatedAt: new Date().toISOString(),
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[ai-diary-summary] 에러:', error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
