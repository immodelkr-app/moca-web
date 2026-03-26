import React, { useEffect, useState } from 'react';
import { fetchKimDaepyoVideos } from '../services/youtubeService';
import { fetchFeaturedVideos } from '../services/mocaTVService';

const PLATFORM_BADGE = {
    instagram: { label: 'Reels', color: 'bg-gradient-to-r from-[#E1306C] to-[#F77737]', icon: 'photo_camera' },
    tiktok: { label: 'TikTok', color: 'bg-black border border-white/20', icon: 'music_note' },
    youtube: { label: 'Shorts', color: 'bg-red-500', icon: 'smart_display' },
};

const KimDaepyoTV = () => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState(null);

    useEffect(() => {
        const loadAll = async () => {
            let youtubeVideos = [];
            let featuredVideos = [];

            try {
                [youtubeVideos, featuredVideos] = await Promise.all([
                    fetchKimDaepyoVideos().catch(e => { console.warn('[MocaTV] 유튜브 로드 실패:', e); return []; }),
                    fetchFeaturedVideos().catch(e => { console.warn('[MocaTV] 피처드 로드 실패:', e); return []; }),
                ]);
            } catch (e) {
                console.error('[MocaTV] 전체 로드 실패:', e);
            }

            console.log(`[MocaTV] 유튜브: ${youtubeVideos.length}개, 피처드: ${featuredVideos.length}개`);

            // 콜라주 효과: 유튜브와 인스타를 번갈아 배치
            const collage = [];
            let yi = 0, fi = 0;
            while (yi < youtubeVideos.length || fi < featuredVideos.length) {
                if (yi < youtubeVideos.length) collage.push(youtubeVideos[yi++]);
                if (fi < featuredVideos.length) collage.push(featuredVideos[fi++]);
                if (yi < youtubeVideos.length) collage.push(youtubeVideos[yi++]);
            }

            setVideos(collage);
            setLoading(false);
        };
        loadAll();
    }, []);

    const handleVideoClick = (video) => {
        // 피처드 영상(릴스/틱톡)이고 embedUrl 없으면 새 탭으로
        if (video.isFeatured && !video.embedUrl) {
            window.open(video.link, '_blank', 'noopener,noreferrer');
            return;
        }
        setSelectedVideo(video);
    };

    const getPlatformBadge = (video) => {
        if (video.isFeatured) {
            return PLATFORM_BADGE[video.platform] || PLATFORM_BADGE.youtube;
        }
        if (video.isShorts) return PLATFORM_BADGE.youtube;
        return null;
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col relative overflow-hidden">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-[#6C63FF]/10 blur-[120px]" />
                <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-[#A78BFA]/5 blur-[120px]" />
            </div>

            {/* Header */}
            <div className="relative z-10 px-5 pt-10 pb-4 max-w-7xl mx-auto w-full">
                <div className="flex items-end justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-[#6C63FF] to-[#A78BFA]" />
                            <h1 className="text-2xl font-black text-white tracking-tight">모카TV</h1>
                        </div>
                        <p className="text-white/40 text-xs ml-4 pl-3 mt-1">유튜브 · 릴스 · 틱톡 영상을 한곳에서</p>
                    </div>
                    <div className="flex items-center gap-2 text-white/30 text-xs">
                        <span className="material-symbols-outlined text-[16px]">grid_view</span>
                        <span className="font-bold">{videos.length}개 영상</span>
                    </div>
                </div>
            </div>

            {/* Collage Video Grid */}
            <div className="relative z-10 px-5 pb-20 max-w-7xl mx-auto w-full flex-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                        <p className="text-white/30 text-sm">영상을 불러오는 중...</p>
                    </div>
                ) : videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <span className="material-symbols-outlined text-[48px] text-white/20">videocam_off</span>
                        <p className="text-white/30 text-sm">등록된 영상이 없습니다.</p>
                    </div>
                ) : (
                    <div className="columns-2 sm:columns-2 md:columns-3 lg:columns-4 gap-3 sm:gap-4">
                        {videos.map((video, idx) => {
                            const badge = getPlatformBadge(video);
                            const isVertical = video.isShorts || video.isFeatured;
                            return (
                                <div
                                    key={`${video.id || video.link}-${idx}`}
                                    onClick={() => handleVideoClick(video)}
                                    className="break-inside-avoid relative rounded-2xl overflow-hidden bg-[#1a1a24] border border-white/10 group cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:shadow-[#6C63FF]/10 transition-all duration-300 mb-3 sm:mb-4 inline-block w-full"
                                >
                                    {/* Thumbnail */}
                                    <div className={`relative w-full ${isVertical ? 'aspect-[9/16]' : 'aspect-video'} bg-black overflow-hidden`}>
                                        {video.thumbnail ? (
                                            <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-[#0f0f1a]">
                                                <span className="material-symbols-outlined text-[64px] text-white/10">
                                                    {video.platform === 'instagram' ? 'photo_camera' : video.platform === 'tiktok' ? 'music_note' : 'smart_display'}
                                                </span>
                                            </div>
                                        )}

                                        {/* Bottom Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                                        {/* Play Icon */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <div className="w-12 h-12 rounded-full bg-[#6C63FF]/80 backdrop-blur-sm flex items-center justify-center pl-1 shadow-[0_0_15px_rgba(108,99,255,0.5)]">
                                                <span className="material-symbols-outlined text-white text-[28px]">play_arrow</span>
                                            </div>
                                        </div>

                                        {/* Platform Badge (Top Left) */}
                                        {badge && (
                                            <div className={`absolute top-3 left-3 px-2 py-1 rounded ${badge.color} text-white text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-lg`}>
                                                <span className="material-symbols-outlined text-[12px]">bolt</span>
                                                {badge.label}
                                            </div>
                                        )}

                                        {/* YouTube Long-form badge */}
                                        {!video.isShorts && !video.isFeatured && (
                                            <div className="absolute top-3 left-3 px-2 py-1 rounded bg-red-600 text-white text-[10px] font-black tracking-wider uppercase flex items-center gap-1 shadow-lg">
                                                <span className="material-symbols-outlined text-[12px]">smart_display</span>
                                                YouTube
                                            </div>
                                        )}

                                        {/* Duration Badge (Top Right, 일반 유튜브만) */}
                                        {!video.isShorts && video.duration && (
                                            <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/60 backdrop-blur-md text-white text-[10px] font-bold">
                                                {video.duration}
                                            </div>
                                        )}

                                        {/* Title */}
                                        <div className="absolute bottom-3 left-3 right-3">
                                            <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 drop-shadow-md">
                                                {video.title}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Video Player Modal */}
            {selectedVideo && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-lg p-0 sm:p-4 lg:p-10"
                    onClick={() => setSelectedVideo(null)}
                >
                    <div
                        className="relative flex items-center justify-center w-full h-full max-w-6xl mx-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close */}
                        <button
                            onClick={() => setSelectedVideo(null)}
                            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 sm:bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/20 sm:border-transparent"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>

                        {/* iframe */}
                        <div className={`relative flex justify-center items-center w-full h-full sm:h-auto ${selectedVideo.isShorts || selectedVideo.isFeatured ? 'max-w-full' : 'max-w-5xl'}`}>
                            <iframe
                                src={
                                    selectedVideo.isFeatured
                                        ? selectedVideo.embedUrl
                                        : `https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&mute=0`
                                }
                                title={selectedVideo.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className={`bg-black shadow-2xl border-none ${selectedVideo.isShorts || selectedVideo.isFeatured
                                    ? 'w-full h-full sm:max-w-[400px] sm:h-[90vh] aspect-[9/16] sm:rounded-3xl'
                                    : 'w-full aspect-video sm:rounded-3xl'
                                    }`}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default KimDaepyoTV;
