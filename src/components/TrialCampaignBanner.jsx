import React, { useEffect, useState } from 'react';
import { useModelBeautyDeepLink } from '../hooks/useModelBeautyDeepLink';
import { fetchTrialCampaigns, getTrialDday } from '../services/trialCampaignService';

// 모델뷰티가 운영 중인 체험단을 모카 홈에 그대로 노출한다.
// 신청/심사/배송지는 전부 모델뷰티 쪽에서 처리되므로, 이 컴포넌트는 목록 노출과
// 딥링크(모델뷰티 앱의 해당 체험단 상세로 바로 이동)만 담당한다.
const TrialCampaignBanner = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const { openApp, showInstallModal, handleInstall, handleContinueWeb, closeModal } = useModelBeautyDeepLink();

    useEffect(() => {
        let mounted = true;
        fetchTrialCampaigns().then((data) => {
            if (mounted) {
                setCampaigns(data);
                setLoading(false);
            }
        });
        return () => { mounted = false; };
    }, []);

    if (loading || campaigns.length === 0) return null;

    return (
        <>
            <div className="px-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[#1F1235] font-black text-base flex items-center gap-1.5">
                        🎁 체험단 모집중
                    </h3>
                    <button
                        onClick={() => openApp('/trials')}
                        className="text-xs font-bold text-[#EC4899] flex items-center gap-0.5"
                    >
                        전체 보기
                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                    </button>
                </div>

                <div className="flex flex-col gap-3">
                    {campaigns.slice(0, 3).map((c) => {
                        const dday = getTrialDday(c.recruitEnd);
                        return (
                            <button
                                key={c.id}
                                onClick={() => openApp(`/trials/${c.id}`)}
                                className="w-full bg-white border border-[#E8E0FA] rounded-3xl overflow-hidden shadow-2xs active:scale-[0.98] transition-all text-left"
                            >
                                <div className="relative aspect-square bg-gradient-to-br from-pink-100 to-violet-100">
                                    {c.poster && (
                                        <img
                                            src={c.poster}
                                            alt={c.title}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    )}
                                    <span className="absolute top-3 left-3 bg-pink-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full">
                                        {c.campaignType === 'paid' ? '유료 체험단' : '무료 체험단'}
                                    </span>
                                    {dday && (
                                        <span className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-[11px] font-black w-10 h-10 rounded-full flex items-center justify-center">
                                            {dday}
                                        </span>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h4 className="text-[#1F1235] font-black text-[15px] leading-snug mb-1">{c.title}</h4>
                                    <p className="text-[#9CA3AF] text-xs font-bold">모집 정원 {c.quota}명</p>
                                </div>
                            </button>
                        );
                    })}
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
                            <span className="text-2xl">🎁</span>
                        </div>
                        <h3 className="text-lg font-black text-[#1F1235] mb-2">모델뷰티 앱 설치하기</h3>
                        <p className="text-sm font-medium text-[#6B7280] leading-relaxed mb-6">
                            앱을 설치하면 체험단 신청부터<br />당첨 알림까지 바로 받을 수 있어요!
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

export default TrialCampaignBanner;
