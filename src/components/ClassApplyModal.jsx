import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

const GRADE_EMOJI = {
    GUEST: '👤', MEMBER: '👤', SILVER: '🥈', GOLD: '🌟', VIP: '💎', VVIP: '💎', 전속모델: '👑'
};

const ClassApplyModal = ({ cls, currentUser, myPriceInfo, myPrice, onClose, onSuccess }) => {
    const [agreed1, setAgreed1] = useState(false);
    const [agreed2, setAgreed2] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const gradeKey = (currentUser?.grade || 'MEMBER').toUpperCase();
    const gradeEmoji = GRADE_EMOJI[gradeKey] || '👤';
    const gradeDisplay = myPriceInfo?.grade_label || currentUser?.grade || 'MEMBER';

    const handleSubmit = async () => {
        if (!agreed1 || !agreed2) {
            setError('아래 두 항목 모두 동의해야 신청이 가능합니다.');
            return;
        }
        setError('');
        setSubmitting(true);

        try {
            // Upsert: 중복 방지 (class_id + user_id unique)
            const { error: insertErr } = await supabase
                .from('class_applications')
                .upsert({
                    class_id: cls.id,
                    user_id: currentUser.id,
                    grade_label: gradeDisplay,
                    applied_price: myPrice,
                    payment_type: 'pending_confirm',
                    payment_status: 'pending',
                    approval_status: 'pending',
                    user_phone: currentUser.phone || '',
                }, { onConflict: 'class_id,user_id', ignoreDuplicates: false });

            if (insertErr) throw insertErr;

            setDone(true);
            if (onSuccess) onSuccess();
        } catch (err) {
            setError('신청 중 오류가 발생했습니다: ' + (err.message || '다시 시도해주세요.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={() => !submitting && onClose()} />
            <div className="relative w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl z-10 overflow-hidden animate-slideUp">

                {done ? (
                    /* ── 완료 화면 ── */
                    <div className="p-10 text-center">
                        <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30">
                            <span className="material-symbols-outlined text-4xl text-white">task_alt</span>
                        </div>
                        <h3 className="text-2xl font-black text-[var(--moca-text)] mb-3">신청 완료!</h3>
                        <p className="text-[var(--moca-text-3)] text-sm font-bold leading-relaxed mb-8">
                            수강 신청서가 접수되었습니다.<br />
                            담당자 검토 후 <span className="text-indigo-600 font-black">카카오톡 또는 문자</span>로<br />
                            결제 안내를 드립니다. (영업일 기준 1일 내)
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full bg-indigo-600 text-white font-black py-4 rounded-[24px] shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all"
                        >
                            확인했습니다
                        </button>
                    </div>
                ) : (
                    /* ── 신청서 화면 ── */
                    <div className="p-8">
                        {/* 헤더 */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Class Application</p>
                                <h3 className="text-xl font-black text-[var(--moca-text)]">수강 참여 신청서</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-[var(--moca-text-3)] hover:bg-gray-200 transition-all"
                            >
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        {/* 신청자 정보 */}
                        <div className="bg-[var(--moca-surface-2,#F8F5FF)] rounded-2xl p-5 mb-4 border border-[var(--moca-border,#E8E0FA)]">
                            <p className="text-[10px] font-black text-[var(--moca-text-3)] uppercase tracking-widest mb-4">신청자 정보</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-[var(--moca-text-3)]">이름</span>
                                    <span className="text-sm font-black text-[var(--moca-text)]">
                                        {currentUser?.name || currentUser?.nickname}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-[var(--moca-text-3)]">연락처</span>
                                    <span className="text-sm font-black text-[var(--moca-text)]">
                                        {currentUser?.phone || '미등록'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-[var(--moca-text-3)]">회원 등급</span>
                                    <span className="text-sm font-black text-indigo-600">
                                        {gradeEmoji} {gradeDisplay}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 신청 클래스 정보 */}
                        <div className="bg-indigo-50 rounded-2xl p-5 mb-6 border border-indigo-100">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">신청 클래스</p>
                            <div className="space-y-3">
                                <div className="flex justify-between items-start gap-3">
                                    <span className="text-xs font-bold text-indigo-400 flex-shrink-0">클래스</span>
                                    <span className="text-sm font-black text-[var(--moca-text)] text-right">{cls.title}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-indigo-400">일시</span>
                                    <span className="text-sm font-black text-[var(--moca-text)]">{cls.class_date}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-indigo-400">장소</span>
                                    <span className="text-sm font-black text-[var(--moca-text)]">{cls.location}</span>
                                </div>
                                <div className="pt-3 border-t border-indigo-100 flex justify-between items-center">
                                    <span className="text-xs font-black text-indigo-500 uppercase">수강료</span>
                                    <span className="text-xl font-black text-[var(--moca-text)]">₩{myPrice.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* 약관 동의 체크박스 */}
                        <div className="space-y-3 mb-6">
                            <label
                                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${agreed1 ? 'border-indigo-500 bg-indigo-50' : 'border-[var(--moca-border)] bg-white'}`}
                                onClick={() => setAgreed1(!agreed1)}
                            >
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${agreed1 ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                                    {agreed1 && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                                </div>
                                <p className="text-sm font-bold text-[var(--moca-text)] leading-relaxed">
                                    위 내용을 모두 확인했으며, <span className="text-indigo-600 font-black">{cls.title}</span> 수강을 신청합니다.
                                </p>
                            </label>

                            <label
                                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${agreed2 ? 'border-indigo-500 bg-indigo-50' : 'border-[var(--moca-border)] bg-white'}`}
                                onClick={() => setAgreed2(!agreed2)}
                            >
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${agreed2 ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}>
                                    {agreed2 && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                                </div>
                                <p className="text-sm font-bold text-[var(--moca-text)] leading-relaxed">
                                    결제는 담당자 확인 후 카카오톡/문자로 안내를 받아 진행하겠습니다.
                                </p>
                            </label>
                        </div>

                        {error && (
                            <p className="text-red-500 text-xs font-black text-center mb-4 bg-red-50 p-3 rounded-2xl border border-red-100">
                                {error}
                            </p>
                        )}

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || !agreed1 || !agreed2}
                            className={`w-full py-4 rounded-[24px] font-black text-base shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2
                                ${!agreed1 || !agreed2
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-700'
                                }`}
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                    신청 중...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">send</span>
                                    수강 신청서 제출하기
                                </>
                            )}
                        </button>

                        <p className="text-[10px] text-center text-[var(--moca-text-3)] font-medium mt-3 leading-relaxed opacity-60">
                            * 신청 즉시 담당자에게 알림이 전달되며,<br />영업일 기준 1일 내로 결제 안내를 드립니다.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassApplyModal;
