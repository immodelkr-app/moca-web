import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 모델뷰티 체험단 API에는 CORS 헤더가 없어 모카 프론트에서 직접 fetch할 수 없다.
// 이 함수가 서버-서버로 대신 호출해 CORS를 우회하고, 모카 UI에 필요한 필드만 추려 돌려준다.
const MODELBEAUTY_TRIALS_URL = "https://modelbeauty.kr/api/trials";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const upstream = await fetch(MODELBEAUTY_TRIALS_URL, {
      headers: { Accept: "application/json" },
    });

    if (!upstream.ok) {
      throw new Error(`modelbeauty /api/trials returned ${upstream.status}`);
    }

    const json = await upstream.json();
    const campaigns = Array.isArray(json?.data) ? json.data : [];

    // recruiting 상태만, 모집 종료가 임박한 순으로 노출 (selecting은 신청 불가라 홈 카드에서는 제외)
    const data = campaigns
      .filter((c: any) => c.status === "recruiting")
      .map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        campaignType: c.campaignType,
        price: c.price,
        quota: c.quota,
        applicantCount: c.applicantCount,
        recruitEnd: c.recruitEnd,
        poster: c.product?.images?.[0]?.url ?? null,
      }));

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, data: [], error: error.message }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  }
});
