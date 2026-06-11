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
    const FEEDNAMI_URL = `https://api.feednami.com/api/v1/feeds/load?url=${encodeURIComponent(RSS_URL)}`;

    const response = await fetch(FEEDNAMI_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
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
