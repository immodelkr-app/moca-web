import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { getUser } from '../services/userService';
import ClassCancelModal from './ClassCancelModal';

const won = (n) => `${Number(n || 0).toLocaleString()}원`;
const md = (iso) => new Date(iso).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' });

// 상태 표시. awaiting_payment(결제 전)는 신청으로 보지 않아 목록에서 제외한다.
const statusInfo = (a, ended) => {
    const confirmed = a.approval_status === 'paid' || a.approval_status === 'approved';
    if (ended && confirmed) return { label: '수강 완료', cls: 'bg-slate-100 text-slate-600' };
    if (a.approval_status === 'paid' && a.payment_type === 'payapp') return { label: '결제완료 · 참석확정', cls: 'bg-green-100 text-green-700' };
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
    const [payments, setPayments] = useState({}); // application_id -> 결제/환불 이력
    const [cancelTarget, setCancelTarget] = useState(null);

    const load = async () => {
        if (!user?.id) { setApps([]); return; }
        const [{ data }, { data: pays }] = await Promise.all([
            supabase.from('class_applications')
                .select('id, class_id, approval_status, payment_type, applied_price, selected_dates, created_at, classes(title, class_date, location, status)')
                .eq('user_id', user.id)
                .neq('approval_status', 'awaiting_payment')
                .order('created_at', { ascending: false }),
            supabase.rpc('my_class_payments', { p_user_id: user.id }),
        ]);
        const byApp = {};
        (pays || []).forEach(p => { (byApp[p.application_id] ||= []).push(p); });
        setPayments(byApp);
        setApps(data || []);
    };
    useEffect(() => { load(); }, []);

    // 진행·예정 / 수강 완료 / 취소·미확정 으로 나눠 보여준다
    const ended = (a) => a.classes?.status === 'completed';
    const confirmed = (a) => a.approval_status === 'paid' || a.approval_status === 'approved';
    const sections = [
        ['진행 · 예정', (apps || []).filter(a => a.approval_status !== 'cancelled' && !ended(a))],
        ['수강 완료', (apps || []).filter(a => ended(a) && confirmed(a))],
        ['취소 · 미확정', (apps || []).filter(a => a.approval_status === 'cancelled' || (ended(a) && !confirmed(a)))],
    ];

    const renderCard = (a) => {
        const st = statusInfo(a, ended(a));
        const canCancel = a.approval_status === 'paid' && a.payment_type === 'payapp' && !ended(a);
        const dates = (a.selected_dates || []).map(d => d.label).join(' / ') || a.classes?.class_date;
        const history = payments[a.id] || [];
        return (
            <div key={a.id} className="bg-white border border-[var(--moca-border)] rounded-2xl p-4">
                <button onClick={() => navigate(`/home/class/${a.class_id}`)} className="w-full text-left">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black mb-2 ${st.cls}`}>{st.label}</span>
                    <p className="text-[15px] font-black text-[var(--moca-text)] leading-snug">{a.classes?.title}</p>
                    {dates && <p className="text-xs font-bold text-[var(--moca-text-3)] mt-1">📅 {dates}</p>}
                    {a.classes?.location && <p className="text-xs font-bold text-[var(--moca-text-3)]">📍 {a.classes.location}</p>}
                </button>
                {history.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dashed border-[var(--moca-border)] space-y-1">
                        {history.map((p, i) => (
                            <p key={i} className="text-[11px] font-bold text-[var(--moca-text-3)]">
                                💳 {md(p.paid_at)} 결제 {won(p.amount)}
                                {p.status === 'cancelled' && p.cancelled_at && <span className="text-red-500"> → {md(p.cancelled_at)} 환불 완료</span>}
                            </p>
                        ))}
                    </div>
                )}
                {canCancel && (
                    <button onClick={() => setCancelTarget(a)} className="mt-3 w-full py-2.5 rounded-xl text-sm font-black text-red-500 bg-red-50 border border-red-100">
                        참석 취소
                    </button>
                )}
            </div>
        );
    };

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

            {sections.map(([title, list]) => list.length > 0 && (
                <div key={title} className="mb-6">
                    <p className="text-[11px] font-black text-[var(--moca-text-3)] uppercase tracking-widest mb-2">{title} · {list.length}</p>
                    <div className="space-y-3">{list.map(renderCard)}</div>
                </div>
            ))}

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
