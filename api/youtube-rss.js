export default async function handler(req, res) {
    const CHANNEL_ID = 'UCkH1XHCioWJKNv0TBu9V8Jg';
    const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

    try {
        const response = await fetch(RSS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; MocaTV/1.0)',
            },
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `YouTube RSS returned ${response.status}` });
        }

        const xml = await response.text();

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600'); // 5분 캐시
        res.status(200).send(xml);
    } catch (error) {
        console.error('YouTube RSS fetch error:', error);
        res.status(500).json({ error: error.message });
    }
}
