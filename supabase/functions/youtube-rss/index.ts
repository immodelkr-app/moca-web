// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const channelId = url.searchParams.get('channel_id') || 'UCkH1XHCioWJKNv0TBu9V8Jg'
        
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
        const response = await fetch(rssUrl)
        
        if (!response.ok) {
            throw new Error(`YouTube responded with ${response.status}`)
        }
        
        const xml = await response.text()
        
        return new Response(xml, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'application/xml; charset=utf-8',
            },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
