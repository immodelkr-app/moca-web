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
            <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[#13131f] border border-white/10 overflow-hidden shadow-2xl">
                {/* Top gradient bar */}
                <div className="h-1 w-full bg-gradient-to-r from-[#FFD700] via-[#FFA500] to-[#FF8C00]" />

                <div className="p-6 flex flex-col items-center gap-5">
                    {/* Crown icon */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/10 border border-[#FFD700]/30 flex items-center justify-center">
                        <span className="text-4xl">👑</span>
                    </div>

                    {/* Title */}
                    <div className="text-center">
                        <h2 className="text-white font-black text-lg leading-tight mb-1">
                            골드 멤버십 안내
                        </h2>
                        <p className="text-white/40 text-xs">
                            실버 멤버 하루 8회 한도 도달
                        </p>
                    </div>

                    {/* Info cards */}
                    <div className="w-full flex flex-col gap-2.5">
                        {/* 3일 후 재사용 안내 */}
                        <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-[#6C63FF]/10 border border-[#6C63FF]/20">
                            <span className="material-symbols-outlined text-[20px] text-[#818CF8] flex-shrink-0 mt-0.5">schedule</span>
                            <div>
                                <p className="text-white font-bold text-sm leading-snug">
                                    {isAlreadyBlocked
                                        ? `앞으로 ${daysLeft}일 후 다시 사용 가능합니다`
                                        : '3일 후 다시 사용하실 수 있습니다'}
                                </p>
                                <p className="text-white/40 text-xs mt-0.5">
                                    프로필발송 · 에이전시주소 · 투어일지
                                </p>
                            </div>
                        </div>

                        {/* 골드 혜택 안내 */}
                        <div className="flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-[#FFD700]/8 border border-[#FFD700]/20">
                            <span className="material-symbols-outlined text-[20px] text-[#FFD700] flex-shrink-0 mt-0.5">workspace_premium</span>
                            <div>
                                <p className="text-white font-bold text-sm leading-snug">
                                    골드 회원은 무제한 이용 가능
                                </p>
                                <p className="text-white/40 text-xs mt-0.5">
                                    횟수 제한 없이 모든 기능을 자유롭게 사용하세요
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Benefit list */}
                    <div className="w-full px-1">
                        <p className="text-white/30 text-[11px] font-bold uppercase tracking-wider mb-2">골드 전용 혜택</p>
                        <div className="flex flex-col gap-1.5">
                            {[
                                '프로필 무제한 발송',
                                '에이전시 이메일 주소 공개',
                                '투어일지 무제한 작성',
                                '골드 전용 캐스팅 정보 열람',
                            ].map((item) => (
                                <div key={item} className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[14px] text-[#FFD700]">check_circle</span>
                                    <span className="text-white/70 text-xs font-medium">{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="w-full flex flex-col gap-2 mt-1">
                        <button
                            onClick={handleUpgrade}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#1a1200] font-black text-sm tracking-wide hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
                        >
                            골드 멤버십 업그레이드
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-white/50 font-bold text-sm hover:bg-white/8 transition-colors"
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
