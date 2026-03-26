import React, { useState, useEffect } from 'react';
import { fetchAllSubscriptions, updateSubscriptionStatus, expireOverdueSubscriptions } from '../services/subscriptionService';

const STATUS_MAP = {
    active: { label: '활성', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
    expired: { label: '만료', color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10' },
    cancelled: { label: '취소', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' },
};

const PLAN_LABELS = {
    gold_1m: '1개월',
    gold_3m: '3개월',
    gold_6m: '6개월',
    gold_12m: '12개월',
};

const AdminSubscriptions = () => {
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, active, expired, cancelled
    const [expireResult, setExpireResult] = useState('');

    const loadData = async () => {
        setLoading(true);
        const { data } = await fetchAllSubscriptions();
        setSubs(data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    // 만료 구독 자동 처리
    const handleExpireCheck = async () => {
        const { expired, error } = await expireOverdueSubscriptions();
        if (error) {
            setExpireResult('만료 처리 실패: ' + error.message);
        } else {
            setExpireResult(`${expired}건의 만료 구독이 처리되었습니다.`);
            loadData();
        }
        setTimeout(() => setExpireResult(''), 4000);
    };

    // 상태 변경
    const handleStatusChange = async (id, newStatus) => {
        await updateSubscriptionStatus(id, newStatus);
        setSubs(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    };

    const filtered = filter === 'all' ? subs : subs.filter(s => s.status === filter);
    const activeCount = subs.filter(s => s.status === 'active').length;
    const totalRevenue = subs.filter(s => s.status !== 'cancelled').reduce((sum, s) => sum + (s.price || 0), 0);
    const expiringSoon = subs.filter(s => {
        if (s.status !== 'active') return false;
        const diff = new Date(s.expires_at) - new Date();
        return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000; // 7일 이내
    });

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';
    const formatPrice = (p) => p ? p.toLocaleString() + '원' : '-';
    const daysLeft = (d) => {
        if (!d) return '-';
        const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
        return diff > 0 ? `${diff}일 남음` : '만료됨';
    };

    return (
        <div className="animate-fadeIn space-y-6">
            {/* 대시보드 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-emerald-400">group</span>
                        <span className="text-white/40 text-sm">활성 구독자</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-400">{activeCount}<span className="text-base text-white/30 ml-1">명</span></p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-[#FCD34D]">payments</span>
                        <span className="text-white/40 text-sm">누적 매출</span>
                    </div>
                    <p className="text-3xl font-black text-[#FCD34D]">{totalRevenue.toLocaleString()}<span className="text-base text-white/30 ml-1">원</span></p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-orange-400">schedule</span>
                        <span className="text-white/40 text-sm">7일 내 만료 예정</span>
                    </div>
                    <p className="text-3xl font-black text-orange-400">{expiringSoon.length}<span className="text-base text-white/30 ml-1">명</span></p>
                </div>
            </div>

            {/* 만료 예정 알림 */}
            {expiringSoon.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4">
                    <p className="text-orange-400 text-sm font-bold mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">warning</span>
                        7일 내 만료 예정 ({expiringSoon.length}명)
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {expiringSoon.map(s => (
                            <span key={s.id} className="text-xs bg-orange-500/20 text-orange-300 px-2.5 py-1 rounded-full font-bold">
                                {s.user_nickname} · {daysLeft(s.expires_at)}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* 액션바 */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex gap-2">
                    {['all', 'active', 'expired', 'cancelled'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-[#6C63FF]/20 text-[#818CF8] border border-[#6C63FF]/30' : 'bg-white/5 text-white/40 border border-white/10 hover:text-white/60'}`}>
                            {f === 'all' ? '전체' : STATUS_MAP[f]?.label}
                            {f === 'all' ? ` (${subs.length})` : ` (${subs.filter(s => s.status === f).length})`}
                        </button>
                    ))}
                </div>
                <button onClick={handleExpireCheck}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold hover:bg-orange-500/25 transition-all">
                    <span className="material-symbols-outlined text-[14px]">update</span>
                    만료 구독 일괄 처리
                </button>
            </div>

            {expireResult && (
                <p className="text-emerald-400 text-sm font-bold animate-pulse">{expireResult}</p>
            )}

            {/* 구독 목록 */}
            {loading ? (
                <div className="text-center py-16 text-white/30">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-[#818CF8] rounded-full animate-spin mx-auto mb-3" />
                    로딩 중...
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-white/30">
                    <span className="material-symbols-outlined text-4xl block mb-2">credit_card_off</span>
                    <p>구독 내역이 없습니다</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(sub => {
                        const st = STATUS_MAP[sub.status] || STATUS_MAP.expired;
                        return (
                            <div key={sub.id} className={`bg-[#1a1a24] border ${st.border} rounded-2xl p-4`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-white font-black text-sm">{sub.user_nickname}</span>
                                            <span className={`text-[10px] font-black rounded-full px-2 py-0.5 border ${st.bg} ${st.color} ${st.border}`}>
                                                {st.label}
                                            </span>
                                            <span className="text-white/20 text-[10px] font-bold bg-white/5 px-2 py-0.5 rounded-full">
                                                {PLAN_LABELS[sub.plan_id] || sub.plan_id}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-3 text-xs text-white/40">
                                            <span>결제 <span className="text-[#FCD34D] font-bold">{formatPrice(sub.price)}</span></span>
                                            <span>시작 {formatDate(sub.started_at)}</span>
                                            <span>만료 <span className={sub.status === 'active' ? 'text-orange-400 font-bold' : ''}>{formatDate(sub.expires_at)}</span></span>
                                        </div>
                                        {sub.status === 'active' && (
                                            <p className="text-emerald-400/60 text-[11px] mt-1 font-bold">{daysLeft(sub.expires_at)}</p>
                                        )}
                                        {sub.order_id && <p className="text-white/15 text-[10px] mt-1 font-mono">{sub.order_id}</p>}
                                    </div>
                                    <select value={sub.status} onChange={e => handleStatusChange(sub.id, e.target.value)}
                                        className="bg-black/40 border border-white/15 rounded-xl px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-400 shrink-0">
                                        <option value="active">활성</option>
                                        <option value="expired">만료</option>
                                        <option value="cancelled">취소</option>
                                    </select>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminSubscriptions;
