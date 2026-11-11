import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const PAY_TYPE = { 1: '신용카드', 2: '휴대폰', 6: '계좌이체', 7: '가상계좌', 15: '카카오페이', 16: '네이버페이', 17: '페이코' };
const STATUS = {
    paid: { label: '결제완료', cls: 'bg-green-100 text-green-700' },
    cancelled: { label: '환불/취소', cls: 'bg-red-100 text-red-600' },
    overbooked: { label: '정원초과', cls: 'bg-amber-100 text-amber-700' },
    requested: { label: '결제대기', cls: 'bg-slate-100 text-slate-500' },
};
const won = (n) => `${Number(n || 0).toLocaleString()}원`;
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '-');

// 어드민: 클래스 결제내역 (관리자 키를 확인하는 DB 함수로만 조회). 환불은 페이앱 사이트에서 취소하면 자동 반영된다.
const AdminClassPayments = ({ adminKey }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('all');
    const [classId, setClassId] = useState('all');

    const load = async () => {
        setLoading(true); setError('');
        const { data, error } = await supabase.rpc('class_payments_admin_list', { p_admin_key: adminKey });
        if (error) setError(error.message); else setRows(data || []);
        setLoading(false);
    };
    useEffect(() => { load(); }, []);

    const classes = useMemo(() => {
        const m = new Map(); rows.forEach(r => m.set(r.class_id, r.class_title)); return [...m.entries()];
    }, [rows]);
    const shown = rows.filter(r => (status === 'all' || r.status === status) && (classId === 'all' || r.class_id === classId));

    const paidSum = shown.filter(r => r.status === 'paid').reduce((s, r) => s + r.amount, 0);
    const refundSum = shown.filter(r => r.status === 'cancelled' && r.paid_at).reduce((s, r) => s + r.amount, 0);
    const returnNeeded = shown.filter(r => r.settlement_return_needed).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-black text-[var(--moca-text)]">💳 클래스 결제내역</h2>
                <button onClick={load} className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-xs font-black">새로고침</button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[['결제 합계', won(paidSum), 'text-green-600'], ['환불 합계', won(refundSum), 'text-red-500'], ['결제 건수', `${shown.filter(r => r.status === 'paid').length}건`, 'text-indigo-600'], ['정산금 반환 필요', `${returnNeeded}건`, returnNeeded ? 'text-amber-600' : 'text-slate-400']].map(([k, v, c]) => (
                    <div key={k} className="bg-white border border-[var(--moca-border)] rounded-2xl p-4">
                        <p className="text-[11px] font-bold text-[var(--moca-text-3)] mb-1">{k}</p>
                        <p className={`text-xl font-black ${c}`}>{v}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-2">
                <select value={classId} onChange={e => setClassId(e.target.value)} className="px-3 py-2 rounded-xl border border-[var(--moca-border)] text-xs font-bold bg-white">
                    <option value="all">전체 클래스</option>
                    {classes.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
                </select>
                {['all', 'paid', 'cancelled', 'overbooked', 'requested'].map(k => (
                    <button key={k} onClick={() => setStatus(k)} className={`px-3 py-2 rounded-xl text-xs font-black border ${status === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-[var(--moca-border)]'}`}>
                        {k === 'all' ? '전체' : STATUS[k].label}
                    </button>
                ))}
            </div>

            <p className="text-[11px] font-bold text-[var(--moca-text-3)] leading-relaxed">
                * 환불은 페이앱 판매자 사이트에서 결제를 취소하면 이 목록과 신청 상태에 자동 반영됩니다.
                "정산금 반환 필요"는 정산 후 취소 건으로, 페이앱에서 안내하는 방식으로 정산금을 반환해야 합니다.
            </p>

            {error && <p className="text-red-500 text-xs font-black bg-red-50 p-3 rounded-2xl">{error}</p>}
            {loading ? <p className="text-sm font-bold text-[var(--moca-text-3)]">불러오는 중...</p> : (
                <div className="overflow-x-auto bg-white border border-[var(--moca-border)] rounded-2xl">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[var(--moca-text-3)] font-black">
                            <tr>{['결제일시', '클래스', '회원', '금액', '수단', '상태', '취소일시/사유', '페이앱번호'].map(h => <th key={h} className="px-3 py-3 whitespace-nowrap">{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {shown.length === 0 && <tr><td colSpan={8} className="px-3 py-10 text-center font-bold text-[var(--moca-text-3)]">결제내역이 없습니다.</td></tr>}
                            {shown.map(r => (
                                <tr key={r.id} className="border-t border-[var(--moca-border)] align-top">
                                    <td className="px-3 py-3 whitespace-nowrap font-bold">{fmt(r.paid_at || r.created_at)}</td>
                                    <td className="px-3 py-3 font-black min-w-[140px]">
                                        {r.class_title}
                                        {r.class_deleted && <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-black">삭제된 클래스</span>}
                                        {(r.selected_dates || []).length > 0 && <div className="font-bold text-[var(--moca-text-3)]">{r.selected_dates.map(d => d.label).join(' / ')}</div>}
                                    </td>
                                    <td className="px-3 py-3 whitespace-nowrap font-bold">{r.user_name || r.user_nickname || '-'}<div className="text-[var(--moca-text-3)]">{r.user_phone || ''}</div></td>
                                    <td className="px-3 py-3 whitespace-nowrap font-black">{won(r.amount)}</td>
                                    <td className="px-3 py-3 whitespace-nowrap font-bold">{PAY_TYPE[r.pay_type] || r.pay_type || '-'}</td>
                                    <td className="px-3 py-3 whitespace-nowrap">
                                        <span className={`px-2 py-1 rounded-full font-black ${(STATUS[r.status] || STATUS.requested).cls}`}>{(STATUS[r.status] || { label: r.status }).label}</span>
                                        {r.settlement_return_needed && <span className="ml-1 px-2 py-1 rounded-full font-black bg-amber-100 text-amber-700">정산금 반환 필요</span>}
                                    </td>
                                    <td className="px-3 py-3 font-bold text-[var(--moca-text-3)]">{r.cancelled_at ? <>{fmt(r.cancelled_at)}<div>{r.cancel_reason || ''}</div></> : '-'}</td>
                                    <td className="px-3 py-3 whitespace-nowrap font-bold text-[var(--moca-text-3)]">{r.payapp_mul_no || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminClassPayments;
