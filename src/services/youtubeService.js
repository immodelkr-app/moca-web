export const fetchKimDaepyoVideos = async () => {
    // 아임모델(김대표TV) 채널 ID
    const CHANNEL_ID = 'UCkH1XHCioWJKNv0TBu9V8Jg';
    const RSS_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
    
    // 신뢰성 확보를 위해 여러 프록시 서비스를 Fallback으로 시도함
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(RSS_URL)}`,
        `https://api.allorigins.win/get?url=${encodeURIComponent(RSS_URL)}`
    ];

    let text = null;

    for (const proxyUrl of proxies) {
        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Response not ok');
            
            // allorigins.win 응답 형식이 JSON인 경우 처리
            if (proxyUrl.includes('allorigins')) {
                const data = await response.json();
                if (data.contents) {
                    text = data.contents;
                    break;
                }
            } else {
                text = await response.text();
                if (text && text.includes('<feed')) {
                    break;
                }
            }
        } catch (e) {
            console.warn(`Proxy failed: ${proxyUrl}`, e);
        }
    }

    if (!text || !text.includes('<feed')) {
        console.error('All proxies failed to fetch YouTube RSS XML');
        return [];
    }

    try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');
        
        // entry 태그 가져오기
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
            // 숏츠 재생목록에서 왔거나 제목에 shorts가 있으면 숏츠로 간주
            const isShorts = titleLower.includes('shorts') || titleLower.includes('쇼츠') || titleLower.includes('#shorts');
            
            let category = '전체보기';
            if (titleLower.includes('투어') || titleLower.includes('에이전시')) category = '에이전시투어';
            else if (titleLower.includes('프로필')) category = '광고프로필';
            else if (titleLower.includes('표정') || titleLower.includes('포즈') || titleLower.includes('연기')) category = '표정&포즈';
            else if (titleLower.includes('q&a') || titleLower.includes('질문') || titleLower.includes('답변')) category = '광고Q&A';
            
            return {
                id: videoId,
                title: title,
                thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                link: link,
                pubDate: pubDate,
                author: author,
                isShorts: isShorts,
                category: category,
                duration: isShorts ? 'Shorts' : 'Update',
            };
        });

        // 비디오아이디 없으면 필터링
        allVideos = allVideos.filter(v => v.id);

        // 최신순 (pubDate 내림차순) 정렬
        allVideos.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

        // 최근 15개만 리턴
        return allVideos.slice(0, 15);
    } catch (error) {
        console.error('Error fetching YouTube XML:', error);
        return [];
    }
};
