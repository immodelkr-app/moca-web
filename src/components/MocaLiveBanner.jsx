import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { fetchActiveMocaLive } from '../services/mocaLiveService';
import { getUserGrade } from '../services/userService';

const GOLD_OR_ABOVE = ['GOLD', 'IMODEL', 'VIP'];

// RTMP(AWS IVS 등) 채널의 HLS 재생 URL을 재생하는 플레이어.
// Safari/iOS는 <video>가 HLS를 네이티브로 지원하므로 그대로 두고, 그 외 브라우저는 hls.js로 붙인다.
const RtmpPlayer = ({ src, title }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            video.play().catch(() => {});
            return;
        }

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
            return () => hls.destroy();
        }
    }, [src]);

    return (
        <video
            ref={videoRef}
            className="w-full h-full"
            controls
            autoPlay
            playsInline
            title={title}
        />
    );
};

// 모카 자체 라이브방송(김대표 소통/교육) 배너.
// 모델뷰티 판매방송(LiveStreamBanner)과 달리 모카 회원이면 누구나 앱 안에서 바로 시청할 수 있다.
const MocaLiveBanner = () => {
    const [live, setLive] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPlayer, setShowPlayer] = useState(false);

    useEffect(() => {
        let mounted = true;
        fetchActiveMocaLive().then((data) => {
            if (mounted) {
                setLive(data);
                setLoading(false);
            }
        });
        return () => { mounted = false; };
    }, []);

    if (loading || !live) return null;

    // 골드모카 등급 전용 방송은 GOLD 이상 회원에게만 노출
    if (live.target_grade === 'GOLD' && !GOLD_OR_ABOVE.includes(getUserGrade())) return null;

    const thumbnail = live.cover_image_url
        || (live.stream_type === 'rtmp' ? null : `https://img.youtube.com/vi/${live.youtube_video_id}/hqdefault.jpg`);

    return (
        <>
            <div className="px-6 mb-6">
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                    <h3 className="text-[#1F1235] font-black text-base">모카TV LIVE</h3>
                </div>

                <button
                    onClick={() => setShowPlayer(true)}
                    className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-md active:scale-[0.98] transition-all text-left bg-gradient-to-br from-gray-800 to-gray-900"
                >
                    {thumbnail && (
                        <img
                            src={thumbnail}
                            alt={live.title}
                            className="absolute inset-0 w-full h-full object-cover opacity-80"
                            loading="lazy"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <span className="absolute top-3 left-3 flex items-center gap-1 bg-red-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        LIVE
                    </span>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h4 className="text-white font-black text-[15px] leading-snug mb-0.5 line-clamp-1">{live.title}</h4>
                        <p className="text-white/80 text-xs font-bold">{live.streamer_name}</p>
                    </div>
                </button>
            </div>

            {showPlayer && (
                <div
                    className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 px-4"
                    onClick={() => setShowPlayer(false)}
                >
                    <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h4 className="text-white font-black text-sm truncate pr-3">{live.title}</h4>
                            <button onClick={() => setShowPlayer(false)} className="text-white/80 hover:text-white flex-shrink-0">
                                <span className="material-symbols-outlined text-[26px]">close</span>
                            </button>
                        </div>
                        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black">
                            {live.stream_type === 'rtmp' ? (
                                <RtmpPlayer src={live.playback_url} title={live.title} />
                            ) : (
                                <iframe
                                    src={`https://www.youtube.com/embed/${live.youtube_video_id}?autoplay=1&rel=0`}
                                    title={live.title}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MocaLiveBanner;
