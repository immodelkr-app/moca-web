import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';
import { checkGoldEligibilityWithAutoUpgrade } from '../services/goldEligibilityService';
import GoldConditionChecklist from './GoldConditionChecklist';

/**
 * GOLD 전용 기능을 SILVER 회원이 열려고 할 때 띄우는 안내 팝업
 * - "GOLD 등급부터 이용 가능" 안내 + 아래에 GOLD 신청 조건 체크리스트
 * - 조건을 이미 채운 경우 자동 승급 후 새로고침 (승급 축하는 GradeCelebrationModal이 처리)
 * @param {string} title - 팝업 제목 (예: "모카캐스팅은 GOLD 등급부터 이용할 수 있어요")
 * @param {Function} onClose
 */
const GoldGateModal = ({ title, onClose }) => {
    const navigate = useNavigate();
    const [goldEligibility, setGoldEligibility] = useState(null);

    useEffect(() => {
        let cancelled = false;
        checkGoldEligibilityWithAutoUpgrade(getUser())
            .then(({ eligibility, upgraded }) => {
                if (cancelled) return;
                setGoldEligibility(eligibility);
                if (upgraded) window.location.reload();
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, []);

    const remaining = goldEligibility
        ? Math.max(0, goldEligibility.requiredCommentCount - goldEligibility.commentCount)
        : 0;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
            <div
                className="w-full max-w-sm relative rounded-[32px] overflow-hidden border border-[#FFD700]/30 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-[#FFF9E6] via-[#FFFDE7] to-[#FFF3CD]" />
                <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/70 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px] text-[#5B4E7A]">close</span>
                </button>
                <div className="relative z-10 px-6 py-8 flex flex-col items-center text-center gap-5">
                    <div className="w-16 h-16 rounded-2xl bg-[#FFD700]/15 border border-[#FFD700]/30 flex items-center justify-center shadow-inner">
                        <span className="text-3xl">👑</span>
                    </div>
                    <p className="text-[#1F1235] font-black text-lg leading-tight">{title}</p>

                    {goldEligibility ? (
                        <GoldConditionChecklist
                            goldEligibility={goldEligibility}
                            goldEligibilityRemaining={remaining}
                            onUpgradeClick={() => { onClose(); navigate('/upgrade'); }}
                        />
                    ) : (
                        <p className="text-[#B45309] text-xs font-bold">GOLD 신청 조건을 확인하는 중...</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GoldGateModal;
