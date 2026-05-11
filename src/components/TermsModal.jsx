import React, { useState } from 'react';

export const TERMS = [
    {
        id: 'service',
        required: true,
        title: '서비스 이용약관',
        content: `제1조 (목적)
본 약관은 MOCA 서비스(이하 "서비스") 이용에 관한 조건 및 절차를 규정합니다.

제2조 (서비스 이용)
① 서비스는 MOCA 앱 가입 회원에게만 제공됩니다.
② 회원은 타인의 계정을 사용할 수 없습니다.

제3조 (책임 제한)
회사는 서비스 중단, 오류 등으로 인한 손해에 대해 법이 허용하는 범위 내에서 책임을 집니다.`
    },
    {
        id: 'privacy',
        required: true,
        title: '개인정보 수집·이용 동의',
        content: `■ 수집 항목
- 필수: 닉네임, 휴대폰번호
- 선택: 이메일

■ 수집 목적
- 회원 식별, 앱 서비스 제공
- CS 대응

■ 보유 기간
- 회원 탈퇴 시 즉시 삭제 (단, 관련 법령에 따라 거래 기록 등은 법정 기간 보관)

■ 동의 거부 시 불이익
개인정보 수집·이용에 동의하지 않으실 수 있으나, 동의 거부 시 앱 서비스 이용이 불가합니다.`
    },
    {
        id: 'marketing',
        required: false,
        title: '마케팅 정보 수신 동의 (선택)',
        content: `■ 수신 채널
카카오톡 알림, SMS

■ 발송 내용
- 회원 등급 전용 이벤트
- 서비스 공지 및 프로모션 안내

■ 수신 동의는 언제든 철회 가능합니다.
(앱 설정 > 알림 관리 > 마케팅 수신 해제)`
    },
];

const TermsModal = ({ onComplete, onClose }) => {
    const [agreed, setAgreed] = useState({
        service: false,
        privacy: false,
        marketing: false,
    });
    const [expanded, setExpanded] = useState(null);

    const allRequired = TERMS.filter(t => t.required).every(t => agreed[t.id]);
    const allAgreed = TERMS.every(t => agreed[t.id]);

    const toggleAll = () => {
        const newVal = !allAgreed;
        setAgreed(Object.fromEntries(TERMS.map(t => [t.id, newVal])));
    };

    const toggle = (id) => setAgreed(prev => ({ ...prev, [id]: !prev[id] }));

    return (
        <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0f0f1a] border border-white/15 rounded-t-3xl p-5 pb-8 max-h-[90vh] flex flex-col">
                {/* 핸들 */}
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 shrink-0" />

                {/* 헤더 */}
                <div className="flex items-center gap-3 mb-4 shrink-0">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-indigo-400">verified_user</span>
                    </div>
                    <div>
                        <h3 className="text-white font-black text-base">서비스 이용 동의</h3>
                        <p className="text-white/40 text-xs">가입 전 약관에 동의해주세요</p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="ml-auto text-white/40 hover:text-white">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>

                {/* 전체 동의 */}
                <button
                    className={`flex items-center gap-3 p-4 rounded-2xl border mb-4 transition-all shrink-0 ${allAgreed
                        ? 'bg-indigo-500/20 border-indigo-500/50 shadow-md shadow-indigo-500/10'
                        : 'bg-white/10 border-white/30 hover:bg-white/15 shadow-sm'}`}
                    onClick={toggleAll}
                >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${allAgreed ? 'bg-indigo-500 border-indigo-500' : 'border-white/50 bg-black/20'}`}>
                        {allAgreed && <span className="material-symbols-outlined text-white text-sm">check</span>}
                    </div>
                    <span className="text-white font-bold text-sm">전체 동의</span>
                    <span className="text-white/80 text-xs ml-auto">(필수+선택 포함)</span>
                </button>

                {/* 개별 약관 목록 */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {TERMS.map(term => (
                        <div key={term.id} className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.03]">
                            <div className="flex items-center gap-3 p-3">
                                <button
                                    onClick={() => toggle(term.id)}
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${agreed[term.id] ? 'bg-indigo-500 border-indigo-500' : 'border-white/30'}`}
                                >
                                    {agreed[term.id] && <span className="material-symbols-outlined text-white text-[11px]">check</span>}
                                </button>
                                <span className="text-white/80 text-sm flex-1">
                                    <span className={`text-[11px] font-black mr-1 ${term.required ? 'text-indigo-400' : 'text-white/40'}`}>
                                        {term.required ? '[필수]' : '[선택]'}
                                    </span>
                                    {term.title}
                                </span>
                                <button
                                    onClick={() => setExpanded(expanded === term.id ? null : term.id)}
                                    className="text-white/30 hover:text-white/60 text-xs border border-white/15 rounded-lg px-2 py-0.5 shrink-0"
                                >
                                    {expanded === term.id ? '닫기' : '보기'}
                                </button>
                            </div>

                            {expanded === term.id && (
                                <div className="px-4 pb-4">
                                    <pre className="text-white/50 text-[11px] leading-relaxed whitespace-pre-wrap font-sans bg-black/30 rounded-xl p-3 max-h-40 overflow-y-auto border border-white/10">
                                        {term.content}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* 동의 버튼 */}
                <div className="mt-4 shrink-0">
                    <button
                        onClick={() => allRequired && onComplete({ agreed })}
                        disabled={!allRequired}
                        className={`w-full py-4 rounded-2xl font-black text-base transition-all ${allRequired
                            ? 'bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white shadow-lg shadow-purple-500/25 hover:opacity-90'
                            : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                    >
                        {allRequired ? '동의하고 계속하기' : '필수 약관에 모두 동의해주세요'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TermsModal;
