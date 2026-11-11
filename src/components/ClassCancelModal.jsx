import React, { useEffect, useState } from 'react';

// 결제한 클래스의 참석취소(=환불) 모달. 환불 가능 여부는 서버가 판단한다(수업 시작 3일 전까지 전액).
const call = async (action, applicationId, userId) => {
    const r = await fetch('/api/class-pay', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, applicationId, userId }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, ...j };
};

const fmtDate = (iso) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });

const ClassCancelModal = ({ cls, applicationId, userId, onClose, onCancelled }) => {
    const [info, setInfo] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        call('refund_info', applicationId, userId).then(r => (r.ok ? setInfo(r) : setError(r.error || '환불 정보를 불러오지 못했습니다.')));
    }, [applicationId, userId]);

    const refund = async () => {
        setBusy(true); setError('');
        const r = await call('refund', applicationId, userId);
        setBusy(false);
        if (r.ok) { setDone(true); onCancelled?.(); } else setError(r.error || '환불 처리에 실패했습니다.');
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={() => !busy && onClose()} />
            <div className="relative w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl z-10 p-8 pb-[12vh] sm:pb-8">
                {done ? (
                    <div className="text-center">
                        <h3 className="text-xl font-black text-[var(--moca-text)] mb-3">참석이 취소되었습니다</h3>
                        <p className="text-sm font-bold text-[var(--moca-text-3)] leading-relaxed mb-6">결제하신 {Number(info?.amount || 0).toLocaleString()}원이 환불됩니다.<br />카드사에 따라 취소 반영까지 며칠 걸릴 수 있어요.</p>
                        <button onClick={onClose} className="w-full bg-indigo-600 text-white font-black py-4 rounded-[24px]">확인했습니다</button>
                    </div>
                ) : (
                    <>
                        <h3 className="text-xl font-black text-[var(--moca-text)] mb-1">참석 취소</h3>
                        <p className="text-xs font-bold text-[var(--moca-text-3)] mb-5">{cls?.title}</p>
                        {!info && !error && <p className="text-sm font-bold text-[var(--moca-text-3)] py-6 text-center">확인 중...</p>}
                        {info && (
                            <div className="bg-[var(--moca-surface-2,#F8F5FF)] rounded-2xl p-5 mb-4 text-sm font-bold space-y-2">
                                <div className="flex justify-between"><span className="text-[var(--moca-text-3)]">결제 금액</span><span className="font-black">{Number(info.amount).toLocaleString()}원</span></div>
                                {info.start_at && <div className="flex justify-between"><span className="text-[var(--moca-text-3)]">수업 시작</span><span className="font-black">{fmtDate(info.start_at)}</span></div>}
                                <p className={`pt-2 text-[12px] leading-relaxed ${info.refundable ? 'text-indigo-600' : 'text-red-500'}`}>
                                    {info.refundable
                                        ? '수업 시작 3일 전까지는 전액 환불됩니다.'
                                        : '수업 시작 3일 전이 지나 환불이 불가합니다. 사정이 있으시면 문의해주세요.'}
                                </p>
                            </div>
                        )}
                        {error && <p className="text-red-500 text-xs font-black text-center mb-4 bg-red-50 p-3 rounded-2xl border border-red-100">{error}</p>}
                        <div className="space-y-2.5">
                            {info?.refundable && (
                                <button onClick={refund} disabled={busy} className="w-full bg-red-500 text-white font-black py-4 rounded-[24px] disabled:opacity-50">
                                    {busy ? '처리 중...' : '환불하고 참석 취소하기'}
                                </button>
                            )}
                            <button onClick={onClose} disabled={busy} className="w-full bg-gray-100 text-gray-500 font-black py-3 rounded-[24px]">닫기</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ClassCancelModal;
