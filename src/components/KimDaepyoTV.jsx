import React, { useEffect, useState } from 'react';
import { fetchKimDaepyoVideos } from '../services/youtubeService';
import { fetchFeaturedVideos } from '../services/mocaTVService';

const PLATFORM_BADGE = {
    instagram: { label: 'Reels', color: 'bg-gradient-to-r from-[#E1306C] to-[#F77737]' },
    tiktok: { label: 'TikTok', color: 'bg-black border border-white/20' },
    youtube: { label: 'Shorts', color: 'bg-red-500' },
};

const KimDaepyoTV = () => {
    const [videos, setVideos] = useState([]);
    const [filteredVideos, setFilteredVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('전체보기');
    const [selectedVideo, setSelectedVideo] = useState(null);

    const tabs = ['전체보기', '에이전시투어', '광고프로필', '표정&포즈', '광고Q&A'];

    useEffect(() => {
        const loadAll = async () => {
            const [youtubeVideos, featuredVideos] = await Promise.all([
                fetchKimDaepyoVideos(),
                fetchFeaturedVideos(),
            ]);

            // 유튜브 + 릴스/틱톡 합산 후 최신순 정렬
            const merged = [...youtubeVideos, ...featuredVideos].sort(
                (a, b) => new Date(b.pubDate) - new Date(a.pubDate)
            );

            setVideos(merged);
            setFilteredVideos(merged);
            setLoading(false);
        };
        loadAll();
    }, []);

    useEffect(() => {
        if (activeTab === '전체보기') {
            setFilteredVideos(videos);
        } else {
            setFilteredVideos(videos.filter(v => v.category === activeTab));
        }
    }, [activeTab, videos]);

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
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-7 rounded-full bg-gradient-to-b from-[#6C63FF] to-[#A78BFA]" />
                            <h1 className="text-2xl font-black text-white tracking-tight">모카TV</h1>
                        </div>
                        <p className="text-white/40 text-xs ml-4 pl-3 mt-1">유튜브 · 릴스 · 틱톡 영상을 한곳에서</p>
                    </div>

                    {/* Scrollable Tabs */}
                    <div className="w-full md:w-auto overflow-x-auto hide-scrollbar mt-4 md:mt-0 pb-2 md:pb-0">
                        <div className="flex gap-2 min-w-max justify-start md:justify-end">
                            {tabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-5 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${activeTab === tab
                                        ? 'bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white shadow-lg shadow-[#6C63FF]/30 border border-transparent'
                                        : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Grid */}
            <div className="relative z-10 px-5 pb-20 max-w-7xl mx-auto w-full flex-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                        <p className="text-white/30 text-sm">영상을 불러오는 중...</p>
                    </div>
                ) : filteredVideos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <span className="material-symbols-outlined text-[48px] text-white/20">videocam_off</span>
                        <p className="text-white/30 text-sm">해당 카테고리의 영상이 없습니다.</p>
                    </div>
                ) : (
                    <div className="flex flex-col sm:block sm:columns-2 md:columns-3 lg:columns-4 gap-5 sm:gap-4">
                        {filteredVideos.map((video, idx) => {
                            const badge = getPlatformBadge(video);
                            return (
                                <div
                                    key={idx}
                                    onClick={() => handleVideoClick(video)}
                                    className="break-inside-avoid relative rounded-2xl overflow-hidden bg-[#1a1a24] border border-[#6C63FF]/20 group cursor-pointer hover:scale-[1.02] hover:shadow-xl hover:shadow-[#6C63FF]/10 transition-all duration-300 sm:mb-4 inline-block w-full"
                                >
                                    {/* Thumbnail */}
                                    <div className={`relative w-full ${video.isShorts ? 'aspect-[9/16]' : 'aspect-video'} bg-black overflow-hidden`}>
                                        {video.thumbnail ? (
                                            <img
                                                src={video.thumbnail}
                                                alt={video.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            /* 썸네일 없을 때 플랫폼 아이콘 placeholder */
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
                        <div className={`relative flex justify-center items-center w-full h-full sm:h-auto ${selectedVideo.isShorts ? 'max-w-full' : 'max-w-5xl'}`}>
                            <iframe
                                src={
                                    selectedVideo.isFeatured
                                        ? selectedVideo.embedUrl
                                        : `https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&mute=0`
                                }
                                title={selectedVideo.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className={`bg-black shadow-2xl border-none ${selectedVideo.isShorts
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
