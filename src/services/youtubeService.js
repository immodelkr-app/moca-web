export const fetchKimDaepyoVideos = async () => {
    const CHANNEL_ID = 'UCkH1XHCioWJKNv0TBu9V8Jg';
    const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;

    // 1순위: 자체 Vercel API (CORS 없음, 가장 안정적)
    // 2순위: CORS 프록시 폴백
    const sources = [
        { url: '/api/youtube-rss', type: 'text', label: '자체 API' },
        { url: `https://corsproxy.io/?${encodeURIComponent(RSS_URL)}`, type: 'text', label: 'corsproxy.io' },
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`, type: 'json', label: 'allorigins' },
    ];

    let text = null;

    for (const source of sources) {
        try {
            console.log(`[MocaTV] 유튜브 소스 시도: ${source.label}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(source.url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            if (source.type === 'json') {
                const data = await response.json();
                if (data.contents && data.contents.includes('<feed')) {
                    text = data.contents;
                    console.log(`[MocaTV] ✅ ${source.label} 성공`);
                    break;
                }
            } else {
                const raw = await response.text();
                if (raw && raw.includes('<feed')) {
                    text = raw;
                    console.log(`[MocaTV] ✅ ${source.label} 성공`);
                    break;
                }
            }
        } catch (e) {
            console.warn(`[MocaTV] ❌ ${source.label} 실패:`, e.message);
        }
    }

    if (!text || !text.includes('<feed')) {
        console.error('[MocaTV] 모든 유튜브 소스 실패');
        return [];
    }

    try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');

        const entries = Array.from(xml.querySelectorAll('entry'));

        let allVideos = entries.map(entry => {
            const videoId = entry.getElementsByTagName('yt:videoId')[0]?.textContent
                || entry.getElementsByTagNameNS('*', 'videoId')[0]?.textContent
                || '';
            const title = entry.querySelector('title')?.textContent || '';
            const link = entry.querySelector('link')?.getAttribute('href') || '';
            const pubDate = entry.querySelector('published')?.textContent || '';
            const author = entry.querySelector('author > name')?.textContent || '';

            const titleLower = title.toLowerCase();
            const isShorts = titleLower.includes('shorts') || titleLower.includes('쇼츠') || titleLower.includes('#shorts');

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
        });

        allVideos = allVideos.filter(v => v.id);
        allVideos.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        console.log(`[MocaTV] 유튜브 영상 ${allVideos.length}개 로드 완료`);
        return allVideos.slice(0, 20);
    } catch (error) {
        console.error('[MocaTV] XML 파싱 오류:', error);
        return [];
    }
};
