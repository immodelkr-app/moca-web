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
            <div className="relative w-full max-w-sm bg-[#15151A] border-2 border-[#FFD700]/30 rounded-[32px] p-8 flex flex-col items-center text-center shadow-2xl shadow-[#FFD700]/20 animate-slideUp overflow-hidden">

                {/* Background glow effect */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#FFD700]/20 blur-[60px] rounded-full pointer-events-none" />

                <div className="relative mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-[#FFF5C3] via-[#FFD700] to-[#E5B800] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(255,215,0,0.5)] animate-bounce-slight">
                        <span className="text-5xl drop-shadow-md">👑</span>
                    </div>
                    {/* Sparkles */}
                    <span className="absolute top-0 right-0 text-2xl animate-spin-slow">✨</span>
                    <span className="absolute bottom-2 left-0 text-xl animate-pulse">✨</span>
                </div>

                <h2 className="relative text-2xl font-black text-white mb-2 tracking-tight">
                    축하합니다! 🎉
                </h2>

                <div className="relative mb-6 text-center">
                    <h3 className="text-[22px] font-black tracking-tight leading-tight">
                        <span className="text-white">이제 </span>
                        <span className="bg-gradient-to-r from-[#FFD700] via-[#FFE55C] to-[#E5B800] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,215,0,0.4)]">
                            골드 모카
                        </span>
                        <span className="text-white"> 입니다</span>
                    </h3>
                </div>

                <p className="relative text-white/70 text-sm leading-relaxed mb-8 break-keep">
                    SILVER 제약 없이 에이전시 정보를 자유롭게 열람하고, 특별한 골드 멤버십 혜택을 마음껏 누려보세요. 지금부터 진정한 나만의 캐스팅 매니저가 시작됩니다.
                </p>

                <div className="relative w-full mt-2">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FFD700] to-[#E5B800] text-black font-black text-[16px] tracking-wide shadow-lg shadow-[#FFD700]/30 hover:scale-[1.02] hover:shadow-[#FFD700]/50 transition-all duration-300"
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
