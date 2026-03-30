import React, { useState, useEffect } from 'react';
import { getUser, getUserGrade } from '../services/userService';

const GradeCelebrationModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const checkGradeAndCelebrate = () => {
            const user = getUser();
            const grade = getUserGrade();

            // 골드(GOLD) 모카이고 로그인이 된 상태인지 확인
            if (user && grade === 'GOLD') {
                const userId = user.nickname || user.name || 'guest';
                const storageKey = `moca_gold_celebrated_${userId}`;

                // 만약 아직 축하를 받지 않은 골드 유저라면 (팝업을 본 적이 없다면)
                if (!localStorage.getItem(storageKey)) {
                    setIsOpen(true);

                    // 이제 팝업을 봤으므로 기록 (다음부터 안 뜸)
                    localStorage.setItem(storageKey, 'true');
                }
            }
        };

        // 처음 렌더링될 때 체크 (로그인/새로고침 직후)
        checkGradeAndCelebrate();
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fadeIn"
                onClick={() => setIsOpen(false)}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-white border border-[#E8E0FA] rounded-[40px] p-10 flex flex-col items-center text-center shadow-2xl shadow-[#FFD700]/10 animate-slideUp overflow-hidden">

                {/* Background glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FFD700]/5 blur-[60px] rounded-full pointer-events-none" />

                <div className="relative mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-[#FFF5C3] via-[#FFD700] to-[#E5B800] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.5)] animate-bounce-slight">
                        <span className="text-5xl drop-shadow-md">👑</span>
                    </div>
                    {/* Sparkles */}
                    <span className="absolute top-0 right-0 text-2xl animate-spin-slow">✨</span>
                    <span className="absolute bottom-2 left-0 text-xl animate-pulse">✨</span>
                </div>

                <h2 className="relative text-2xl font-black text-[#1F1235] mb-2 tracking-tight">
                    축하합니다! 🎉
                </h2>

                <div className="relative mb-6 text-center">
                    <h3 className="text-[22px] font-black tracking-tight leading-tight">
                        <span className="text-[#1F1235]">이제 </span>
                        <span className="bg-gradient-to-r from-[#FFD700] via-[#FBC02D] to-[#F9A825] bg-clip-text text-transparent drop-shadow-sm font-black">
                            GOLD
                        </span>
                        <span className="text-[#1F1235]"> 입니다</span>
                    </h3>
                </div>

                <p className="relative text-[#5B4E7A] text-[14px] leading-relaxed mb-10 break-keep font-medium">
                    일일 조회 제한 없이 에이전시 정보를 자유롭게 확인하고, 특별한 골드 멤버십 혜택을 마음껏 누려보세요. 지금부터 진짜 수익 창출을 위한 모델 활동이 시작됩니다.
                </p>

                <div className="relative w-full mt-2">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-full py-4.5 rounded-[20px] bg-gradient-to-r from-[#FFD700] to-[#F9A825] text-[#1F1235] font-black text-base shadow-xl shadow-[#FFD700]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        확인
                    </button>
                </div>
            </div>

            {/* Global CSS for some micro animations */}
            <style>{`
                @keyframes bounce-slight {
                    0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
                    50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
                }
                .animate-bounce-slight {
                    animation: bounce-slight 2s infinite;
                }
                .animate-spin-slow {
                    animation: spin 3s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default GradeCelebrationModal;
