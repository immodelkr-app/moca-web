import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// 모델뷰티 라이브방송 API에도 CORS 헤더가 없어 모카 프론트에서 직접 fetch할 수 없다.
// 이 함수가 서버-서버로 대신 호출해 CORS를 우회한다.
// 주의: 원본 응답에는 streamKey/ingestEndpoint/channelArn(AWS IVS 송출용 비밀값)이 함께
// 내려오므로, 절대 그대로 전달하지 않고 노출용 필드만 추려서 반환한다.
const MODELBEAUTY_LIVE_URL = "https://modelbeauty.kr/api/live?status=live";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const upstream = await fetch(MODELBEAUTY_LIVE_URL, {
      headers: { Accept: "application/json" },
    });

    if (!upstream.ok) {
      throw new Error(`modelbeauty /api/live returned ${upstream.status}`);
    }

    const json = await upstream.json();
    const streams = Array.isArray(json?.data) ? json.data : [];

    const data = streams
      .filter((s: any) => s.status === "live")
      .map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        streamerName: s.streamerName,
        coverImageUrl: s.coverImageUrl,
        viewerCount: s.viewerCount,
        startedAt: s.startedAt,
      }));

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=30",
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
