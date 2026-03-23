import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 쏠라피 키 연동 (사장님께서 제공해주신 최신 키)
const SOLAPI_API_KEY = "NCSX2JQEWPNP6K4R";
const SOLAPI_SECRET_KEY = "IB1PHQULIRPJAY6VGWMLCQEWJIU9NUND";
const PF_ID = "KA01PF260309085923456gdN56tP4xVG"; // 카톡 채널 PF ID
const SOLAPI_SENDER = "01055439674"; // 인증된 발신번호

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

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const payload = await req.json()
        const type = payload.type || 'sms'
        
        const authHeader = await getSolapiAuth();

        if (type === 'kakao') {
            const { receivers, templateCode } = payload

            if (!receivers || receivers.length === 0 || !templateCode) {
                throw new Error('카카오 알림톡은 수신자 목록(receivers)과 템플릿 코드(templateCode)가 필수입니다.')
            }

            // 🟢 알리고 형식을 쏠라피 형식으로 변환 (단건 메시지로 발송하게 될 경우의 처리)
            const messages = receivers.map((user: any) => {
                const cleanPhone = user.phone.replace(/-/g, '')

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
                const formattedVariables: any = {};
                if (user.variables) {
                    for (const [key, value] of Object.entries(user.variables)) {
                        formattedVariables[`#{${key}}`] = String(value);
                    }
                }

                return {
                    to: cleanPhone,
                    from: SOLAPI_SENDER,
                    kakaoOptions: {
                        pfId: PF_ID,
                        templateId: templateCode, // 쏠라피에서 복사해올 템플릿 ID (ex: 연동 후 12345 형태)
                        variables: formattedVariables, // 만약 변수가 있다면 (옵션)
                        buttons: solapiButtons.length > 0 ? solapiButtons : undefined
                    }
                }
            })

            const response = await fetch('https://api.solapi.com/messages/v4/send-many', {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages })
            });
            const responseData = await response.json();

            if (!response.ok || responseData.errorCode) {
                 throw new Error(responseData.errorMessage || JSON.stringify(responseData));
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `${receivers.length}건 카카오 알림톡 발송 성공 (쏠라피)`,
                    data: responseData
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )

        } else if (type === 'friendtalk') {
            // 🟢 친구톡 (FT) - 마케팅/광고성 메시지, 템플릿 심사 불필요
            const { receivers } = payload
            if (!receivers || receivers.length === 0) {
                throw new Error('친구톡은 수신자 목록(receivers)이 필수입니다.')
            }

            const messages = receivers.map((user: any) => {
                const cleanPhone = user.phone.replace(/-/g, '')
                const solapiButtons: any[] = user.buttons || []

                return {
                    to: cleanPhone,
                    from: SOLAPI_SENDER,
                    kakaoOptions: {
                        pfId: PF_ID,
                        messageType: 'FT',
                        content: user.content,
                        buttons: solapiButtons.length > 0 ? solapiButtons : undefined,
                        disableSms: false
                    }
                }
            })

            const response = await fetch('https://api.solapi.com/messages/v4/send-many', {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages })
            })
            const responseData = await response.json()

            if (!response.ok || responseData.errorCode) {
                throw new Error(responseData.errorMessage || JSON.stringify(responseData))
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `${receivers.length}건 친구톡 발송 성공 (쏠라피)`,
                    data: responseData
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )

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

            const response = await fetch('https://api.solapi.com/messages/v4/send-many', {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages })
            });
            const responseData = await response.json();
            
            if (!response.ok || responseData.errorCode) {
                 throw new Error(responseData.errorMessage || JSON.stringify(responseData));
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `${phoneNumbers.length}건 SMS 발송 성공 (쏠라피)`,
                    data: responseData
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            )
        }

    } catch (error: any) {
        console.error("발송 에러:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
