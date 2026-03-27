import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * SilverLimitModal
 * - 실버 멤버가 하루 8회 한도를 소진했을 때 표시
 * - 골드 회원 업그레이드 안내 + 3일 후 재사용 안내
 */
const SilverLimitModal = ({ onClose, daysLeft = 3, isAlreadyBlocked = false }) => {
    const navigate = useNavigate();

    const handleUpgrade = () => {
        onClose();
        navigate('/upgrade');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-sm rounded-[40px] bg-white border border-[#E8E0FA] overflow-hidden shadow-2xl">
                {/* Top gradient bar */}
                <div className="h-1 w-full bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FF8C00]" />

                <div className="p-8 flex flex-col items-center gap-6">
                    {/* Crown icon */}
                    <div className="w-20 h-20 rounded-3xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center shadow-inner">
                        <span className="text-4xl">👑</span>
                    </div>

                    {/* Title */}
                    <div className="text-center">
                        <h2 className="text-[#1F1235] font-black text-xl leading-tight mb-1">
                            골드 멤버십 안내
                        </h2>
                        <p className="text-[#9CA3AF] text-[13px] font-bold">
                            실버 멤버 일일 한도 소진
                        </p>
                    </div>

                    {/* Info cards */}
                    <div className="w-full flex flex-col gap-2.5">
                        {/* 3일 후 재사용 안내 */}
                        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA]">
                            <span className="material-symbols-outlined text-[20px] text-[#9333EA] flex-shrink-0 mt-0.5">schedule</span>
                            <div>
                                <p className="text-[#1F1235] font-black text-sm leading-snug">
                                    {isAlreadyBlocked
                                        ? `앞으로 ${daysLeft}일 후 다시 사용 가능합니다`
                                        : '3일 후 다시 사용하실 수 있습니다'}
                                </p>
                                <p className="text-[#9CA3AF] text-[11px] mt-1 font-bold">
                                    프로필발송 · 에이전시주소 · 투어일지
                                </p>
                            </div>
                        </div>

                        {/* 골드 혜택 안내 */}
                        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-[#FFFDE7] border border-[#FFD700]/30">
                            <span className="material-symbols-outlined text-[20px] text-[#F9A825] flex-shrink-0 mt-0.5">workspace_premium</span>
                            <div>
                                <p className="text-[#1F1235] font-black text-sm leading-snug">
                                    골드 회원은 무제한 이용 가능
                                </p>
                                <p className="text-[#9CA3AF] text-[11px] mt-1 font-bold">
                                    횟수 제한 없이 모든 기능을 자유롭게 사용하세요
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Benefit list */}
                    <div className="w-full px-2">
                        <p className="text-[#9CA3AF] text-[10px] font-black uppercase tracking-widest mb-3">골드 전용 혜택</p>
                        <div className="flex flex-col gap-2">
                            {[
                                '프로필 무제한 발송',
                                '에이전시 이메일 주소 공개',
                                '투어일지 무제한 작성',
                                '골드 전용 캐스팅 정보 열람',
                            ].map((item) => (
                                <div key={item} className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-[#FFD700] drop-shadow-sm">check_circle</span>
                                    <span className="text-[#5B4E7A] text-[13px] font-black">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="w-full flex flex-col gap-3 mt-4">
                        <button
                            onClick={handleUpgrade}
                            className="w-full py-4.5 rounded-[20px] bg-gradient-to-r from-[#FFD700] to-[#F9A825] text-[#1F1235] font-black text-base shadow-xl shadow-[#FFD700]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            골드 멤버십 업그레이드
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3.5 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] text-[#9CA3AF] font-bold text-sm hover:bg-[#F3E8FF] hover:text-[#9333EA] transition-all"
                        >
                            나중에 하기
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SilverLimitModal;
