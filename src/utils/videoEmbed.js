// 유튜브/비메오 링크를 iframe 임베드 URL로 변환. 지원하지 않는 링크면 null.
// autoplay: 브라우저 정책상 자동 재생은 음소거 상태에서만 허용되므로 mute를 함께 켠다.
export function getVideoEmbedUrl(rawUrl, { autoplay = false } = {}) {
    const input = (rawUrl || '').trim();
    if (!input) return null;

    let url;
    try {
        url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    } catch {
        return null;
    }
    const host = url.hostname.replace(/^(www\.|m\.)/, '');

    // YouTube
    let ytId = null;
    if (host === 'youtu.be') {
        ytId = url.pathname.split('/')[1];
    } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
        if (url.pathname === '/watch') ytId = url.searchParams.get('v');
        else {
            const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?]+)/);
            if (m) ytId = m[1];
        }
    }
    if (ytId && /^[\w-]{6,20}$/.test(ytId)) {
        return `https://www.youtube.com/embed/${ytId}?rel=0&playsinline=1${autoplay ? '&autoplay=1&mute=1' : ''}`;
    }

    // Vimeo (vimeo.com/123, vimeo.com/123/abcdef [비공개 해시], player.vimeo.com/video/123)
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
        const m = url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([\w]+))?/);
        if (m) {
            const hash = m[2] || url.searchParams.get('h');
            const params = [];
            if (hash) params.push(`h=${hash}`);
            if (autoplay) params.push('autoplay=1', 'muted=1', 'playsinline=1');
            return `https://player.vimeo.com/video/${m[1]}${params.length ? `?${params.join('&')}` : ''}`;
        }
    }

    return null;
}
