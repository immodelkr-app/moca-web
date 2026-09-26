import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 🔐 쏠라피 키 — Supabase Edge Function Secrets에서 로드 (절대 하드코딩 금지)
// Supabase 대시보드 > Edge Functions > aligo-send > Secrets 에 아래 키 등록 필요:
//   SOLAPI_API_KEY, SOLAPI_SECRET_KEY, SOLAPI_PF_ID (발신번호는 아래 상수로 고정)
const SOLAPI_API_KEY    = Deno.env.get("SOLAPI_API_KEY") ?? "";
const SOLAPI_SECRET_KEY = Deno.env.get("SOLAPI_SECRET_KEY") ?? "";
const PF_ID             = Deno.env.get("SOLAPI_PF_ID") ?? ""; // 카톡 채널 PF ID
const SOLAPI_SENDER     = "01055439674"; // 인증된 발신번호 (고정)

// 쏠라피 인증 헤더 생성기 (Web Crypto API 사용)
async function getSolapiAuth() {
    const date = new Date().toISOString();
    const salt = crypto.randomUUID().replace(/-/g, '');
    const data = date + salt;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(SOLAPI_SECRET_KEY);
    
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signatureBuf = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
    const signatureArray = Array.from(new Uint8Array(signatureBuf));
    const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return `HMAC-SHA256 apiKey=${SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${signatureHex}`;
}

// 🌐 네트워크 오류 발생 시 재시도 로직
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
    let lastError: any = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error: any) {
            lastError = error;
            console.warn(`[aligo-send] Fetch attempt ${attempt} failed:`, error.message || error);
            
            if (attempt === maxRetries) {
                break;
            }
            // 500ms, 1000ms 간격으로 지수 백오프 대기
            await new Promise(resolve => setTimeout(resolve, attempt * 500));
        }
    }
    throw lastError || new Error(`Fetch failed after ${maxRetries} attempts`);
}

// 📤 쏠라피 다건 발송 (send-many/detail: 건별 접수 실패 목록을 함께 반환)
// 일부만 실패해도 HTTP 200이므로 failedMessageList로 실제 성공/실패 건수를 계산한다.
async function sendMany(messages: any[], label: string): Promise<Response> {
    const response = await fetchWithRetry('https://api.solapi.com/messages/v4/send-many/detail', {
        method: 'POST',
        headers: {
            'Authorization': await getSolapiAuth(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages })
    });
    const responseData = await response.json();

    if (!response.ok || responseData.errorCode) {
        throw new Error(responseData.errorMessage || JSON.stringify(responseData));
    }

    const failed: any[] = responseData.failedMessageList || [];
    const total = messages.length;
    const successCount = total - failed.length;
    const failReasons = [...new Set(failed.map((f: any) => f.statusMessage).filter(Boolean))];

    console.log(`[aligo-send] ${label} 발송: 총 ${total}건 / 접수성공 ${successCount}건 / 실패 ${failed.length}건`, failReasons);

    const body = {
        success: successCount > 0,
        message: failed.length === 0
            ? `${label} ${total}건 발송 접수 완료`
            : `${label} 접수성공 ${successCount}건 / 실패 ${failed.length}건${failReasons.length ? ` (${failReasons.join(', ')})` : ''}`,
        error: successCount === 0 ? `${label} 전체 발송 실패: ${failReasons.join(', ') || '원인 미상'}` : undefined,
        total,
        successCount,
        failedCount: failed.length,
        failedList: failed.map((f: any) => ({ to: f.to, statusCode: f.statusCode, statusMessage: f.statusMessage })),
        data: responseData.groupInfo
    };
    return new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 🔐 환경변수 누락 조기 검증
        if (!SOLAPI_API_KEY || !SOLAPI_SECRET_KEY) {
            console.error('[aligo-send] SOLAPI_API_KEY 또는 SOLAPI_SECRET_KEY 환경변수가 설정되지 않았습니다.');
            return new Response(
                JSON.stringify({ success: false, error: '서버 설정 오류: 메시지 발송 키가 등록되지 않았습니다. 관리자에게 문의하세요.' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }
        if (!PF_ID) {
            console.warn('[aligo-send] SOLAPI_PF_ID 환경변수가 없습니다. 카카오 알림톡이 실패할 수 있습니다.');
        }

        const payload = await req.json()
        const type = payload.type || 'sms'

        if (type === 'kakao') {
            const { receivers, templateCode, templateId: payloadTemplateId } = payload
            // templateId 우선, 없으면 templateCode(하위호환) fallback
            const defaultTemplateId = payloadTemplateId || templateCode;

            if (!receivers || receivers.length === 0 || !defaultTemplateId) {
                throw new Error('카카오 알림톡은 수신자 목록(receivers)과 템플릿 ID(templateId)가 필수입니다.')
            }

            // 🟢 알리고 형식을 쏠라피 형식으로 변환 (단건 메시지로 발송하게 될 경우의 처리)
            // 빈 전화번호 필터링
            const validReceivers = receivers.filter((u: any) => u?.phone);
            if (validReceivers.length === 0) {
                throw new Error('유효한 수신자 전화번호가 없습니다.');
            }

            const messages = validReceivers.map((user: any) => {
                const cleanPhone = user.phone.replace(/-/g, '')
                // receiver별 templateId/pfId가 있으면 우선 사용 (없으면 payload 전역값 사용)
                const msgTemplateId = user.templateId || defaultTemplateId;
                const msgPfId      = user.pfId || PF_ID;

                const solapiButtons: any[] = [];
                if (user.button && user.button.button && user.button.button.length > 0) {
                    user.button.button.forEach((btn: any) => {
                        solapiButtons.push({
                            buttonType: btn.linkType,     // WL 등
                            buttonName: btn.name,         // 버튼 이름
                            linkMo: btn.linkM || btn.linkMo, // 모바일 링크
                            linkPc: btn.linkP || btn.linkPc  // PC 링크
                        });
                    });
                }

                // 변수 이름에 #{ } 씌우기 (쏠라피 필수 형식)
                const formattedVariables: any = {}
                if (user.variables) {
                    for (const [key, value] of Object.entries(user.variables)) {
                        formattedVariables[`#{${key}}`] = String(value);
                    }
                }

                return {
                    to: cleanPhone,
                    from: SOLAPI_SENDER,
                    kakaoOptions: {
                        pfId: msgPfId,
                        templateId: msgTemplateId,
                        variables: Object.keys(formattedVariables).length > 0 ? formattedVariables : undefined,
                        buttons: solapiButtons.length > 0 ? solapiButtons : undefined
                    }
                }
            })

            return await sendMany(messages, '카카오 알림톡');

        } else if (type === 'friendtalk') {
            // 🟢 친구톡 - 카카오 친구톡은 2025.12.31 종료 → 브랜드 메시지 자유형(BMS_FREE, 텍스트)으로 발송
            // 본문은 반드시 최상위 text 필드에 넣어야 함 (kakaoOptions.content 아님)
            // 채널 친구가 아니거나 수신 불가 시 문자(LMS)로 대체 발송 (disableSms: false)
            const { receivers } = payload
            if (!receivers || receivers.length === 0) {
                throw new Error('친구톡은 수신자 목록(receivers)이 필수입니다.')
            }

            const validFTReceivers = receivers.filter((u: any) => u?.phone && u?.content);
            if (validFTReceivers.length === 0) {
                throw new Error('유효한 수신자(전화번호+내용)가 없습니다.');
            }

            if (!PF_ID) {
                throw new Error('서버 설정 오류: 카카오 채널 PF ID(SOLAPI_PF_ID)가 등록되지 않았습니다.');
            }

            const messages = validFTReceivers.map((user: any) => ({
                to: user.phone.replace(/-/g, ''),
                from: SOLAPI_SENDER,
                text: user.content,
                type: 'BMS_FREE',
                kakaoOptions: {
                    pfId: PF_ID,
                    disableSms: false,
                    bms: {
                        targeting: 'I',
                        chatBubbleType: 'TEXT'
                    }
                }
            }))

            return await sendMany(messages, '친구톡(브랜드 메시지)');

        } else {
            // 🟢 일반 SMS도 쏠라피로 통합하여 발송
            const { phoneNumbers, message } = payload
            if (!phoneNumbers || phoneNumbers.length === 0 || !message) {
                throw new Error('일반 문자는 전화번호 목록과 내용이 필수입니다.')
            }

            const messages = phoneNumbers.map((p: string) => ({
                to: p.replace(/-/g, ''),
                from: SOLAPI_SENDER,
                text: message
            }))

            return await sendMany(messages, '문자');
        }

    } catch (error: any) {
        console.error('[aligo-send] 발송 에러:', error);
        // ⚠️ 에러도 HTTP 200으로 반환해야 Supabase JS SDK가 data를 정상 파싱함
        // (status 400/500이면 SDK가 자동으로 error 객체로 변환 → data가 null이 됨)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }
})
