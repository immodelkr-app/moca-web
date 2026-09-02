import React, { useEffect, useState } from 'react';
import { useModelBeautyDeepLink } from '../hooks/useModelBeautyDeepLink';
import { fetchLiveStreams } from '../services/liveStreamService';

// 모델뷰티에서 지금 진행 중인 라이브방송을 모카 홈에 노출한다.
// 시청/채팅/구매는 전부 모델뷰티 쪽에서 처리되므로, 이 컴포넌트는 "지금 라이브 중"
// 노출과 딥링크(모델뷰티 앱의 해당 라이브 상세로 바로 이동)만 담당한다.
const LiveStreamBanner = () => {
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const { openApp, showInstallModal, handleInstall, handleContinueWeb, closeModal } = useModelBeautyDeepLink();

    useEffect(() => {
        let mounted = true;
        fetchLiveStreams().then((data) => {
            if (mounted) {
                setStreams(data);
                setLoading(false);
            }
        });
        return () => { mounted = false; };
    }, []);

    if (loading || streams.length === 0) return null;

    return (
        <>
            <div className="px-6 mb-6">
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                    <h3 className="text-[#1F1235] font-black text-base">지금 라이브 중</h3>
                </div>

                <div className="flex flex-col gap-3">
                    {streams.slice(0, 2).map((s) => (
                        <button
                            key={s.id}
                            onClick={() => openApp(`/live/${s.id}`)}
                            className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-md active:scale-[0.98] transition-all text-left bg-gradient-to-br from-gray-800 to-gray-900"
                        >
                            {s.coverImageUrl && (
                                <img
                                    src={s.coverImageUrl}
                                    alt={s.title}
                                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                                    loading="lazy"
                                />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                            <span className="absolute top-3 left-3 flex items-center gap-1 bg-red-500 text-white text-[11px] font-black px-2.5 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                LIVE
                            </span>
                            {typeof s.viewerCount === 'number' && (
                                <span className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white text-[11px] font-black px-2.5 py-1 rounded-full">
                                    <span className="material-symbols-outlined text-[13px]">visibility</span>
                                    {s.viewerCount}
                                </span>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                <h4 className="text-white font-black text-[15px] leading-snug mb-0.5 line-clamp-1">{s.title}</h4>
                                <p className="text-white/80 text-xs font-bold">{s.streamerName}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {showInstallModal && (
                <div
                    className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 px-6"
                    onClick={closeModal}
                >
                    <div
                        className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#F3E8FF] flex items-center justify-center">
                            <span className="text-2xl">🔴</span>
                        </div>
                        <h3 className="text-lg font-black text-[#1F1235] mb-2">모델뷰티 앱 설치하기</h3>
                        <p className="text-sm font-medium text-[#6B7280] leading-relaxed mb-6">
                            앱을 설치하면 라이브방송 시청과<br />채팅에 바로 참여할 수 있어요!
                        </p>
                        <div className="space-y-2.5">
                            <button
                                onClick={handleInstall}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 text-white font-black active:scale-[0.98] transition-all"
                            >
                                앱 설치하기
                            </button>
                            <button
                                onClick={handleContinueWeb}
                                className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-500 font-bold active:scale-[0.98] transition-all"
                            >
                                웹으로 계속하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LiveStreamBanner;
