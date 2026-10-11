import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { getUser } from '../services/userService';
import { checkGoldEligibilityWithAutoUpgrade } from '../services/goldEligibilityService';
import { useMarketingConsent } from '../hooks/useMarketingConsent';
import GoldConditionChecklist from './GoldConditionChecklist';

/**
 * GOLD 안내 팝업 안의 마케팅 수신 동의 영역 (선택 동의)
 * 모카캐스팅 공고 알림 푸시는 전 등급에게 나가므로, 게시판에 들어올 수 없는 SILVER에게도 동의를 받을 수 있게 한다.
 * 이미 동의한 회원에게는 보이지 않는다.
 */
const MarketingConsentInline = () => {
    const { user, checking, alreadyAgreed, agreedNow, saving, error, agree } = useMarketingConsent();
    const [checked, setChecked] = useState(false);

    if (!user || user.user_type === 'company' || checking) return null;
    if (alreadyAgreed && !agreedNow) return null;

    if (agreedNow) {
        return (
            <div className="w-full max-w-xs rounded-2xl bg-white/80 border border-[#10B981]/30 p-4 text-center">
                <p className="text-xs font-black text-[#10B981]">알림 신청이 완료됐어요 🎉</p>
                <p className="text-[11px] font-bold text-[#5B4E7A] mt-1 leading-relaxed">
                    새 공고와 새 에이전시 리스트 소식을 알려드릴게요.
                    {Capacitor.isNativePlatform() && ' 알림 허용 창이 뜨면 "허용"을 눌러주세요.'}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-xs rounded-2xl bg-white/80 border border-[#FFD700]/30 p-4 text-left">
            <p className="text-xs font-black text-[#1F1235]">GOLD가 되기 전에도 새 소식을 받아보세요</p>
            <dl className="mt-2 space-y-1 text-[11px] leading-relaxed">
                <div className="flex gap-1.5"><dt className="font-black text-[#B45309] shrink-0">받는 내용</dt><dd className="font-bold text-[#5B4E7A]">모카캐스팅 새 공고, 새 에이전시 리스트</dd></div>
                <div className="flex gap-1.5"><dt className="font-black text-[#B45309] shrink-0">받는 방법</dt><dd className="font-bold text-[#5B4E7A]">앱 푸시 · 문자 · 카카오톡</dd></div>
                <div className="flex gap-1.5"><dt className="font-black text-[#B45309] shrink-0">해제 방법</dt><dd className="font-bold text-[#5B4E7A]">마이페이지의 &quot;마케팅 정보 수신 및 활용 동의&quot; 해제</dd></div>
            </dl>
            <label className="flex items-start gap-2 mt-3 cursor-pointer">
                <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-[#9333EA]" />
                <span className="text-[11px] font-bold text-[#1F1235] leading-snug">위 내용을 확인했으며 마케팅 정보 수신에 동의합니다. (선택)</span>
            </label>
            {error && <p className="text-[11px] font-bold text-red-500 mt-1.5">{error}</p>}
            <button
                onClick={agree}
                disabled={!checked || saving}
                className="w-full mt-3 py-2.5 rounded-xl bg-[#9333EA] text-white text-xs font-black disabled:opacity-40 active:scale-95 transition-all"
            >
                {saving ? '저장 중...' : '동의하고 받기'}
            </button>
        </div>
    );
};

/**
 * GOLD 전용 기능을 SILVER 회원이 열려고 할 때 띄우는 안내 팝업
 * - "GOLD 등급부터 이용 가능" 안내 + 아래에 GOLD 신청 조건 체크리스트
 * - 그 아래에 마케팅 수신 동의(선택) 영역
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
                className="w-full max-w-sm relative rounded-[32px] overflow-hidden border border-[#FFD700]/30 shadow-2xl max-h-[92vh] overflow-y-auto"
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

                    <MarketingConsentInline />
                </div>
            </div>
        </div>
    );
};

export default GoldGateModal;
