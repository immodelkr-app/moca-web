import React, { useEffect, useState } from 'react';
import { fetchPastMocaLiveStreams } from '../services/mocaLiveService';
import { getUserGrade } from '../services/userService';
import { RtmpPlayer } from './MocaLiveBanner';

const GOLD_OR_ABOVE = ['GOLD', 'IMODEL', 'VIP'];

// 모카TV 라이브 다시보기(VOD) - 홈 대시보드/모카TV 탭 등 여러 위치에서 재사용.
// 유튜브 라이브는 종료 후 같은 videoId가 자동으로 다시보기가 되고, RTMP는 관리자가
// 채워둔 vod_url이 있는 것만 노출된다 (mocaLiveService.fetchPastMocaLiveStreams 참고).
const MocaLiveReplaySection = ({ className = 'px-6 mb-6' }) => {
    const [replays, setReplays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        let mounted = true;
        fetchPastMocaLiveStreams().then((data) => {
            if (!mounted) return;
            const visible = (data || []).filter(
                (live) => !(live.target_grade === 'GOLD' && !GOLD_OR_ABOVE.includes(getUserGrade()))
            );
            setReplays(visible);
            setLoading(false);
        });
        return () => { mounted = false; };
    }, []);

    if (loading || replays.length === 0) return null;

    return (
        <div className={className}>
            <div className="flex items-center gap-1.5 mb-3">
                <span className="material-symbols-outlined text-[#8B5CF6] text-[18px]">movie</span>
                <h3 className="text-[#1F1235] font-black text-base">모카TV 다시보기</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
                {replays.map((live) => {
                    const thumbnail = live.cover_image_url
                        || (live.stream_type === 'youtube' ? `https://img.youtube.com/vi/${live.youtube_video_id}/hqdefault.jpg` : null);
                    return (
                        <button
                            key={live.id}
                            onClick={() => setSelected(live)}
                            className="flex-shrink-0 w-40 text-left active:scale-[0.98] transition-all"
                        >
                            <div className="relative w-40 aspect-video rounded-2xl overflow-hidden bg-gray-900 shadow-sm">
                                {thumbnail ? (
                                    <img src={thumbnail} alt={live.title} className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-white/20">
                                        <span className="material-symbols-outlined text-[32px]">movie</span>
                                    </div>
                                )}
                                <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-black">
                                    다시보기
                                </span>
                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                                    <span className="material-symbols-outlined text-white/90 text-[28px] drop-shadow">play_circle</span>
                                </div>
                            </div>
                            <p className="text-[12px] font-bold text-[#1F1235] mt-1.5 line-clamp-1">{live.title}</p>
                            <p className="text-[10px] text-[#9CA3AF] font-bold">{live.streamer_name}</p>
                        </button>
                    );
                })}
            </div>

            {selected && (
                <div
                    className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 px-4 py-6 overflow-y-auto"
                    onClick={() => setSelected(null)}
                >
                    <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h4 className="text-white font-black text-sm truncate">{selected.title}</h4>
                            <button onClick={() => setSelected(null)} className="text-white/80 hover:text-white flex-shrink-0">
                                <span className="material-symbols-outlined text-[26px]">close</span>
                            </button>
                        </div>
                        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black">
                            {selected.stream_type === 'rtmp' ? (
                                <RtmpPlayer src={selected.vod_url} title={selected.title} />
                            ) : (
                                <iframe
                                    src={`https://www.youtube.com/embed/${selected.youtube_video_id}?rel=0`}
                                    title={selected.title}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MocaLiveReplaySection;
