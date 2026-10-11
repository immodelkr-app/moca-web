import React from 'react';

/**
 * GOLD 신청 조건 체크리스트 (에이전시 프로필 발송, 모카캐스팅 등 GOLD 전용 기능의 안내 팝업에서 공용 사용)
 */
const GoldConditionChecklist = ({ goldEligibility, goldEligibilityRemaining, onUpgradeClick }) => {
    if (!goldEligibility) return null;
    return (
        <>
            <div className="w-full max-w-xs">
                <div className="flex items-center justify-between mb-2 px-1">
                    <p className="text-[#1F1235] text-xs font-black flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-[#B45309]">checklist</span>
                        GOLD 신청 조건
                    </p>
                    <span className={`text-xs font-black ${goldEligibility.allComplete ? 'text-[#10B981]' : 'text-[#B45309]'}`}>
                        {goldEligibility.allComplete ? '신청 가능 🎉' : `${Math.min(goldEligibility.commentCount, goldEligibility.requiredCommentCount)}/${goldEligibility.requiredCommentCount} 완료`}
                    </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/70 overflow-hidden mb-3">
                    <div
                        className={`h-full rounded-full transition-all ${goldEligibility.allComplete ? 'bg-[#10B981]' : 'bg-gradient-to-r from-[#FFD700] to-[#F9A825]'}`}
                        style={{ width: `${Math.min(100, (goldEligibility.commentCount / goldEligibility.requiredCommentCount) * 100)}%` }}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    {[
                        { done: goldEligibility.profileComplete, text: '프로필관리 필수항목 작성하기' },
                        { done: goldEligibility.postComplete, text: '모카그램 게시글 1개 이상 작성하기' },
                        { done: goldEligibility.commentComplete, text: '모카그램 댓글 3개 작성하기' },
                    ].map((item) => (
                        <div key={item.text} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${item.done ? 'bg-[#D1FAE5] border-[#10B981]/30' : 'bg-white/70 border-[#FFD700]/20'}`}>
                            <span className={`material-symbols-outlined text-[15px] flex-shrink-0 ${item.done ? 'text-[#10B981]' : 'text-[#C7BEDD]'}`}>
                                {item.done ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span className={`text-xs font-bold text-left ${item.done ? 'text-[#10B981] line-through' : 'text-[#1F1235]'}`}>{item.text}</span>
                        </div>
                    ))}
                </div>
                <p className="text-[#B45309] text-xs font-black text-center pt-2">
                    {Math.min(goldEligibility.commentCount, goldEligibility.requiredCommentCount)}개의 댓글을 작성했어요
                </p>
            </div>

            {!goldEligibility.allComplete ? (
                <div className="w-full max-w-xs py-4 rounded-[20px] bg-white/70 border border-[#FFD700]/30 text-[#B45309] font-black text-sm text-center leading-snug">
                    미션 {goldEligibilityRemaining}개만 더 하면<br />골드등급이 될 수 있어요
                </div>
            ) : (
                <button
                    onClick={onUpgradeClick}
                    className="w-full max-w-xs py-4 rounded-[20px] bg-gradient-to-r from-[#FFD700] to-[#F9A825] text-[#1F1235] font-black text-base shadow-lg shadow-[#FFD700]/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                    GOLD 등급 업그레이드
                </button>
            )}
        </>
    );
};

export default GoldConditionChecklist;
