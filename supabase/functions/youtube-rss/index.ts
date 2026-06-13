import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const CHANNEL_ID = 'UCkH1XHCioWJKNv0TBu9V8Jg';
    const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    let xmlText = "";
    let fetchedDirectly = false;

    // 1단계: 유튜브에서 직접 XML 가져오기 시도 (User-Agent 포함)
    try {
      console.log("[youtube-rss] 유튜브 직접 가져오기 시도...");
      const directResponse = await fetch(RSS_URL, {
        headers: { 'User-Agent': USER_AGENT }
      });
      
      if (directResponse.ok) {
        xmlText = await directResponse.text();
        if (xmlText.includes('<entry>')) {
          fetchedDirectly = true;
          console.log("[youtube-rss] ✅ 유튜브 직접 가져오기 성공!");
        }
      } else {
        console.warn(`[youtube-rss] 유튜브 직접 가져오기 실패 (Status: ${directResponse.status})`);
      }
    } catch (e: any) {
      console.warn("[youtube-rss] 유튜브 직접 가져오기 중 에러 발생:", e.message);
    }

    // 2단계: 직접 가져오기 실패 시 Feednami를 폴백으로 사용
    if (!fetchedDirectly) {
      console.log("[youtube-rss] 유튜브 직접 가져오기 실패로 Feednami 폴백 사용...");
      const FEEDNAMI_URL = `https://api.feednami.com/api/v1/feeds/load?url=${encodeURIComponent(RSS_URL)}`;
      const response = await fetch(FEEDNAMI_URL, {
        headers: { 'User-Agent': USER_AGENT },
      });

      if (!response.ok) {
        throw new Error(`Feednami returned status ${response.status}`);
      }

      const data = await response.json();
      const entries = data.feed?.entries || [];

      const videos = entries.map((entry: any) => {
        const videoId = entry['yt:videoid']?.['#']
          || entry.guid?.replace('yt:video:', '')
          || entry.link?.split('v=')[1]?.split('&')[0]
          || entry.link?.split('/shorts/')[1]?.split('?')[0]
          || '';
        const title = entry.title || '';
        const link = entry.link || '';
        const pubDate = entry.pubdate || entry.date || '';
        const author = entry.author || '';

        const titleLower = title.toLowerCase();
        const description = entry['media:group']?.['media:description']?.['#'] || '';
        const descLower = description.toLowerCase();

        const isShorts = titleLower.includes('shorts') || titleLower.includes('쇼츠') || titleLower.includes('#shorts')
          || descLower.includes('#shorts') || descLower.includes('쇼츠')
          || link.includes('/shorts/');

        return {
          id: videoId,
          title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          link,
          pubDate,
          author,
          isShorts,
          category: '전체보기',
          duration: isShorts ? 'Shorts' : 'YouTube',
        };
      }).filter((v: any) => v.id);

      return new Response(JSON.stringify(videos), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    // 3단계: 직접 가져온 XML을 정규식으로 직접 파싱
    const videos: any[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;
    
    while ((match = entryRegex.exec(xmlText)) !== null) {
      const content = match[1];
      const videoId = (content.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1] || '';
      const title = (content.match(/<title>([^<]+)<\/title>/) || [])[1] || '';
      const link = (content.match(/<link[^>]+href="([^"]+)"/) || [])[1] || '';
      const pubDate = (content.match(/<published>([^<]+)<\/published>/) || [])[1] || '';
      const author = (content.match(/<name>([^<]+)<\/name>/) || [])[1] || '';
      const description = (content.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || '';

      const titleLower = title.toLowerCase();
      const descLower = description.toLowerCase();

      const isShorts = titleLower.includes('shorts') || titleLower.includes('쇼츠') || titleLower.includes('#shorts')
        || descLower.includes('#shorts') || descLower.includes('쇼츠')
        || link.includes('/shorts/');

      if (videoId) {
        videos.push({
          id: videoId,
          title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          link,
          pubDate,
          author,
          isShorts,
          category: '전체보기',
          duration: isShorts ? 'Shorts' : 'YouTube',
        });
      }
    }

    return new Response(JSON.stringify(videos), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
