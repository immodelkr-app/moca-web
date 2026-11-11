import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { getUser } from '../services/userService';
import ClassCancelModal from './ClassCancelModal';

// 결제 완료(페이앱)와 기존 방식(입금확인)을 구분해 보여준다. awaiting_payment(결제 전)는 신청으로 보지 않아 숨긴다.
const statusInfo = (a) => {
    const paidByCard = a.approval_status === 'paid' && a.payment_type === 'payapp';
    if (paidByCard) return { label: '결제완료 · 참석확정', cls: 'bg-green-100 text-green-700' };
    return ({
        paid: { label: '참석확정', cls: 'bg-green-100 text-green-700' },
        approved: { label: '승인 · 안내 확인', cls: 'bg-indigo-100 text-indigo-700' },
        pending: { label: '신청 접수 (확인 중)', cls: 'bg-amber-100 text-amber-700' },
        waitlisted: { label: '대기 중', cls: 'bg-amber-100 text-amber-700' },
        cancelled: { label: '취소됨', cls: 'bg-slate-100 text-slate-500' },
    })[a.approval_status] || { label: a.approval_status, cls: 'bg-slate-100 text-slate-500' };
};

const MyClassesPage = () => {
    const navigate = useNavigate();
    const user = getUser();
    const [apps, setApps] = useState(null);
    const [cancelTarget, setCancelTarget] = useState(null);

    const load = async () => {
        if (!user?.id) { setApps([]); return; }
        const { data } = await supabase
            .from('class_applications')
            .select('id, class_id, approval_status, payment_type, applied_price, selected_dates, created_at, paid_at, classes(title, class_date, location, status)')
            .eq('user_id', user.id)
            .neq('approval_status', 'awaiting_payment')
            .order('created_at', { ascending: false });
        setApps(data || []);
    };
    useEffect(() => { load(); }, []);

    return (
        <div className="max-w-2xl mx-auto px-4 pb-24 pt-4">
            <div className="flex items-center gap-2 mb-5">
                <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                </button>
                <h1 className="text-xl font-black text-[var(--moca-text)]">내 클래스</h1>
            </div>

            {apps === null && <p className="text-sm font-bold text-[var(--moca-text-3)] py-10 text-center">불러오는 중...</p>}
            {apps?.length === 0 && (
                <div className="text-center py-16">
                    <p className="text-sm font-bold text-[var(--moca-text-3)] mb-4">신청한 클래스가 없습니다.</p>
                    <button onClick={() => navigate('/home/class')} className="px-5 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-black">클래스 보러가기</button>
                </div>
            )}

            <div className="space-y-3">
                {(apps || []).map(a => {
                    const st = statusInfo(a);
                    const canCancel = a.approval_status === 'paid' && a.payment_type === 'payapp' && a.classes?.status !== 'completed';
                    const dates = (a.selected_dates || []).map(d => d.label).join(' / ') || a.classes?.class_date;
                    return (
                        <div key={a.id} className="bg-white border border-[var(--moca-border)] rounded-2xl p-4">
                            <button onClick={() => navigate(`/home/class/${a.class_id}`)} className="w-full text-left">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black mb-2 ${st.cls}`}>{st.label}</span>
                                <p className="text-[15px] font-black text-[var(--moca-text)] leading-snug">{a.classes?.title}</p>
                                {dates && <p className="text-xs font-bold text-[var(--moca-text-3)] mt-1">📅 {dates}</p>}
                                {a.classes?.location && <p className="text-xs font-bold text-[var(--moca-text-3)]">📍 {a.classes.location}</p>}
                                {a.payment_type === 'payapp' && a.applied_price > 0 && a.approval_status === 'paid' && (
                                    <p className="text-xs font-black text-indigo-600 mt-1">결제 {Number(a.applied_price).toLocaleString()}원</p>
                                )}
                            </button>
                            {canCancel && (
                                <button onClick={() => setCancelTarget(a)} className="mt-3 w-full py-2.5 rounded-xl text-sm font-black text-red-500 bg-red-50 border border-red-100">
                                    참석 취소
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {cancelTarget && (
                <ClassCancelModal
                    cls={cancelTarget.classes}
                    applicationId={cancelTarget.id}
                    userId={user.id}
                    onClose={() => setCancelTarget(null)}
                    onCancelled={load}
                />
            )}
        </div>
    );
};

export default MyClassesPage;
