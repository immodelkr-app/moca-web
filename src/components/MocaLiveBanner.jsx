import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
    fetchActiveMocaLive, fetchUpcomingMocaLive, subscribeToMocaLiveState,
    isSubscribedToLiveReminder, addLiveReminderSubscription, removeLiveReminderSubscription,
} from '../services/mocaLiveService';
import { openLiveViewerPresence, closeLiveViewerPresence } from '../services/mocaLiveEngagementService';
import { getUserGrade, getUser } from '../services/userService';
import MocaLiveEngagement from './MocaLiveEngagement';

const GOLD_OR_ABOVE = ['GOLD', 'IMODEL', 'VIP'];

// 남은 시간을 "N일 HH:MM:SS 후 시작" 형태로 매초 갱신. 예정 시각이 지나면 "곧 시작합니다"로 고정
// (관리자가 라이브 전환/삭제하기 전까지 카운트다운이 0 밑으로 안 내려가고 문구만 바뀜).
const useCountdownLabel = (scheduledAt) => {
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (!scheduledAt) { setLabel(''); return; }
        const target = new Date(scheduledAt).getTime();

        const tick = () => {
            const diff = target - Date.now();
            if (diff <= 0) { setLabel('곧 시작합니다'); return; }
            const totalSec = Math.floor(diff / 1000);
            const days = Math.floor(totalSec / 86400);
            const hours = Math.floor((totalSec % 86400) / 3600);
            const minutes = Math.floor((totalSec % 3600) / 60);
            const seconds = totalSec % 60;
            const pad = (n) => String(n).padStart(2, '0');
            const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
            setLabel(`${days > 0 ? `${days}일 ` : ''}${clock} 후 시작`);
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [scheduledAt]);

    return label;
};

// RTMP(AWS IVS 등) 채널의 HLS 재생 URL을 재생하는 플레이어.
// MediaSource(hls.js)를 지원하는 브라우저는 전부 hls.js로 붙인다. Chrome/Android WebView는
// canPlayType('application/vnd.apple.mpegurl')에 "maybe"를 잘못 반환하는 경우가 있어
// (실제로는 네이티브 HLS 재생을 못 해 MEDIA_ERR_SRC_NOT_SUPPORTED로 조용히 실패함),
// canPlayType을 먼저 보지 않고 Hls.isSupported()를 우선 확인한다.
// 네이티브 HLS만 되고 MSE가 없는 환경(Safari/iOS)은 canPlayType 경로로 폴백한다.
export const RtmpPlayer = ({ src, title }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !src) return;

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
            return () => hls.destroy();
        }

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
            video.play().catch(() => {});
            return;
        }
    }, [src]);

    return (
        <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls
            autoPlay
            playsInline
            title={title}
        />
    );
};

// 아직 라이브 시작 전, 방송 예정 일시(scheduled_at)만 등록된 상태의 예고 카드.
// 탭해도 재생할 콘텐츠가 없으므로 버튼이 아닌 정적 카드로 표시한다.
const UpcomingMocaLiveTeaser = ({ upcoming }) => {
    const countdownLabel = useCountdownLabel(upcoming.scheduled_at);
    const thumbnail = upcoming.cover_image_url
        || (upcoming.stream_type === 'rtmp' ? null : `https://img.youtube.com/vi/${upcoming.youtube_video_id}/hqdefault.jpg`);

    const user = getUser();
    const [subscribed, setSubscribed] = useState(null); // null = 조회 중
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        let mounted = true;
        if (!user?.id) { setSubscribed(false); return; }
        isSubscribedToLiveReminder(upcoming.id, user.id).then((v) => { if (mounted) setSubscribed(v); });
        return () => { mounted = false; };
    }, [upcoming.id, user?.id]);

    // 방송 10분 전 리마인드 푸시 신청/해제. 실제 발송은 DB의 pg_cron 스케줄러가
    // 신청자 닉네임만 골라 자동으로 처리한다 (여기선 신청 여부만 저장).
    const handleToggleSubscribe = async () => {
        if (!user?.id || toggling) return;
        setToggling(true);
        if (subscribed) {
            setSubscribed(false);
            await removeLiveReminderSubscription(upcoming.id, user.id);
        } else {
            setSubscribed(true);
            await addLiveReminderSubscription(upcoming.id, user.id, user.nickname || user.name || '');
        }
        setToggling(false);
    };

    return (
        <div className="px-6 mb-6">
            <div className="flex items-center gap-1.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
                <h3 className="text-[#1F1235] font-black text-base">모카TV LIVE 예고</h3>
            </div>

            <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-md bg-gradient-to-br from-gray-800 to-gray-900">
                {thumbnail && (
                    <img
                        src={thumbnail}
                        alt={upcoming.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                        loading="lazy"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <span className="absolute top-3 left-3 flex items-center gap-1 bg-violet-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full">
                    📅 예고
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <h4 className="text-white font-black text-[15px] leading-snug mb-0.5 line-clamp-1">{upcoming.title}</h4>
                        <p className="text-amber-300 text-xs font-black">{countdownLabel}</p>
                    </div>
                    {user?.id && subscribed !== null && (
                        <button
                            onClick={handleToggleSubscribe}
                            disabled={toggling}
                            className={`flex-shrink-0 px-3 py-2 rounded-full text-[11px] font-black transition-colors disabled:opacity-60 ${
                                subscribed ? 'bg-white text-violet-700' : 'bg-violet-600 text-white'
                            }`}
                        >
                            {subscribed ? '🔔 알림 신청됨' : '🔕 알림 받기'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

// 모카 자체 라이브방송(김대표 소통/교육) 배너.
// 모델뷰티 판매방송(LiveStreamBanner)과 달리 모카 회원이면 누구나 앱 안에서 바로 시청할 수 있다.
const MocaLiveBanner = () => {
    const [live, setLive] = useState(null);
    const [upcoming, setUpcoming] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPlayer, setShowPlayer] = useState(false);
    const [viewerCount, setViewerCount] = useState(0);
    const [shareSuccess, setShareSuccess] = useState(false);

    const liveIdRef = useRef(null);
    useEffect(() => { liveIdRef.current = live?.id ?? null; }, [live]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const active = await fetchActiveMocaLive();
            if (!mounted) return;
            if (active) {
                setLive(active);
                setLoading(false);
                return;
            }
            const nextUp = await fetchUpcomingMocaLive();
            if (mounted) {
                setUpcoming(nextUp);
                setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // 관리자가 방송을 시작/종료하거나 예고를 등록/수정하면 즉시 반영 (안 하면 이미 화면을
    // 열어둔 사용자에게는 종료된 뒤에도 새로고침 전까지 눌러도 재생 안 되는 죽은 썸네일이
    // 계속 남아있게 됨)
    useEffect(() => {
        const unsubscribe = subscribeToMocaLiveState(({ active, upcoming: nextUp }) => {
            if (!active || active.id !== liveIdRef.current) setShowPlayer(false);
            setLive(active);
            setUpcoming(nextUp);
        });
        return unsubscribe;
    }, []);

    // 플레이어를 실제로 열어놓은 동안만 시청자로 집계 (닫으면 카운트에서 빠짐)
    useEffect(() => {
        if (!showPlayer || !live?.id) return;
        const channel = openLiveViewerPresence(live.id, setViewerCount, true);
        return () => {
            closeLiveViewerPresence(channel);
            setViewerCount(0);
        };
    }, [showPlayer, live?.id]);

    const handleShare = async () => {
        const shareData = {
            title: `🔴 모카TV 라이브 - ${live.title}`,
            text: `${live.streamer_name}님의 라이브 방송이 진행 중이에요! 지금 아임모카에서 함께 보세요 🎥`,
            url: window.location.href,
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (e) {}
        } else {
            await navigator.clipboard.writeText(window.location.href);
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 2500);
        }
    };

    if (loading) return null;

    if (!live) {
        if (!upcoming) return null;
        // 골드모카 등급 전용 예고는 GOLD 이상 회원에게만 노출
        if (upcoming.target_grade === 'GOLD' && !GOLD_OR_ABOVE.includes(getUserGrade())) return null;
        return <UpcomingMocaLiveTeaser upcoming={upcoming} />;
    }

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
                    className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/90 px-4 py-6 overflow-y-auto"
                    onClick={() => setShowPlayer(false)}
                >
                    <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <div className="flex items-center gap-2 min-w-0">
                                <h4 className="text-white font-black text-sm truncate">{live.title}</h4>
                                {viewerCount > 0 && (
                                    <span className="flex-shrink-0 text-[10px] font-black text-white/70">👀 {viewerCount}명 시청 중</span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <button onClick={handleShare} className={shareSuccess ? 'text-emerald-400' : 'text-white/80 hover:text-white'}>
                                    <span className="material-symbols-outlined text-[22px]">{shareSuccess ? 'check' : 'ios_share'}</span>
                                </button>
                                <button onClick={() => setShowPlayer(false)} className="text-white/80 hover:text-white">
                                    <span className="material-symbols-outlined text-[26px]">close</span>
                                </button>
                            </div>
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
                        <MocaLiveEngagement liveId={live.id} />
                    </div>
                </div>
            )}
        </>
    );
};

export default MocaLiveBanner;
