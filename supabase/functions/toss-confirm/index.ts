// Supabase Edge Function: toss-confirm
// 토스페이먼츠 결제 승인 API 호출 (시크릿 키는 서버사이드에서만 사용)
// 배포: supabase functions deploy toss-confirm

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const TOSS_SECRET_KEY = Deno.env.get('TOSS_SECRET_KEY') ?? '';
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { paymentKey, orderId, amount } = await req.json();

        if (!paymentKey || !orderId || !amount) {
            return new Response(
                JSON.stringify({ error: '필수 파라미터가 누락되었습니다.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 토스페이먼츠 결제 승인 API 호출
        const credentials = btoa(`${TOSS_SECRET_KEY}:`);
        const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentKey, orderId, amount }),
        });

        const result = await response.json();

        if (!response.ok) {
            console.error('[toss-confirm] API 오류:', result);
            return new Response(
                JSON.stringify({ error: result.message || '결제 승인에 실패했습니다.' }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, payment: result }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (err) {
        console.error('[toss-confirm] 예외:', err);
        return new Response(
            JSON.stringify({ error: err.message || '서버 오류' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
