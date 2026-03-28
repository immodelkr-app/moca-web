import React, { useState, useEffect } from 'react';
import { fetchAllSubscriptions, updateSubscriptionStatus, expireOverdueSubscriptions } from '../services/subscriptionService';
import { sendAlimtalk } from '../services/aligoService';

const STATUS_MAP = {
    active: { label: '활성', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    expired: { label: '만료', color: 'text-gray-500', bg: 'bg-gray-50', border: 'border-gray-200' },
    cancelled: { label: '취소', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
};

const PLAN_LABELS = {
    gold_1m: '1개월',
    gold_3m: '3개월',
    gold_6m: '6개월',
    gold_12m: '12개월',
};

// 7일 전 만료 알림 템플릿 코드
const EXPIRATION_7D_TEMPLATE_ID = 'KA01TP260326062454437Q6Ayvq3TtUS';

const AdminSubscriptions = () => {
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, active, expired, cancelled
    const [expireResult, setExpireResult] = useState('');
    const [isSendingAlimtalk, setIsSendingAlimtalk] = useState(false);

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

    // 만료 7일 전 알림톡 발송
    const handleSendExpiryNotification = async (targetSubs) => {
        if (!window.confirm(`총 ${targetSubs.length}명에게 만료 7일 전 안내 알림톡을 발송하시겠습니까?`)) return;

        setIsSendingAlimtalk(true);
        try {
            // 실제 발송 로직 (템플릿 문구는 사장님께서 승인받으신 내용으로 적용)
            const receivers = targetSubs.map(s => {
                const expiresStr = new Date(s.expires_at).toLocaleDateString('ko-KR');
                const userName = s.user_nickname || '회원';
                
                // 승인된 실제 문구 (토씨 하나 틀리지 않게 작성)
                const templateText = `안녕하세요 ${userName}님, 모두의 캐스팅 매니저, 아임모카(IM MOCA)입니다.\n\n${userName}님의 골드모카 멤버십 만료 안내드립니다.\n\n■ 현재 등급: GOLD ■ 만료 예정일: ${expiresStr}\n\n만료 후에는 아래 서비스 이용이 제한됩니다.\n\n에이전시 무제한 조회\n현재모습 사진등록\n골드 전용 혜택\n멤버십 관련 자세한 내용은 마이페이지에서 확인하실 수 있습니다.`;

                return {
                    phone: s.phone || '',
                    name: userName,
                    message: templateText,
                    variables: {
                        "이름": userName,
                        "만료일": expiresStr
                    },
                    button: {
                        "button": [
                            {
                                "name": "마이페이지 확인하기",
                                "linkType": "WL",
                                "linkTypeName": "웹링크",
                                "linkM": "https://immoca.kr/app",
                                "linkP": "https://immoca.kr/app"
                            }
                        ]
                    }
                };
            }).filter(r => r.phone);

            if (receivers.length === 0) {
                throw new Error('발송 가능한 유효한 연락처가 없습니다. (전화번호 확인 필요)');
            }

            const res = await sendAlimtalk(EXPIRATION_7D_TEMPLATE_ID, receivers);
            setExpireResult('7일 전 알림톡이 발송되었습니다.');
            console.log('알림톡 발송 결과:', res);
        } catch (err) {
            console.error('알림톡 발송 에러:', err);
            setExpireResult('발송 실패: ' + err.message);
        } finally {
            setIsSendingAlimtalk(false);
            setTimeout(() => setExpireResult(''), 4000);
        }
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
                <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-1 rounded-lg">group</span>
                        <span className="text-[var(--moca-text-2)] text-sm font-bold">활성 구독자</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-700">{activeCount.toLocaleString()}<span className="text-base text-gray-400 ml-1">명</span></p>
                </div>
                <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-amber-600 bg-amber-50 p-1 rounded-lg">payments</span>
                        <span className="text-[var(--moca-text-2)] text-sm font-bold">누적 매출</span>
                    </div>
                    <p className="text-3xl font-black text-amber-700">{totalRevenue.toLocaleString()}<span className="text-base text-gray-400 ml-1">원</span></p>
                </div>
                <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-orange-600 bg-orange-50 p-1 rounded-lg">schedule</span>
                        <span className="text-[var(--moca-text-2)] text-sm font-bold">7일 내 만료 예정</span>
                    </div>
                    <p className="text-3xl font-black text-orange-700">{expiringSoon.length}<span className="text-base text-gray-400 ml-1">명</span></p>
                </div>
            </div>

            {/* 만료 예정 알림 */}
            {expiringSoon.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-orange-700 text-sm font-black flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[18px]">announcement</span>
                            7일 내 만료 예정 안내 ({expiringSoon.length}명)
                        </p>
                        <button
                            onClick={() => handleSendExpiryNotification(expiringSoon)}
                            disabled={isSendingAlimtalk}
                            className="bg-orange-500 text-white text-[11px] font-black px-4 py-2 rounded-xl hover:bg-orange-600 active:scale-95 transition-all shadow-sm shadow-orange-500/30 disabled:opacity-50"
                        >
                            {isSendingAlimtalk ? '발송 중...' : '전체 알림톡 발송'}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {expiringSoon.map(s => (
                            <span key={s.id} className="text-xs bg-white border border-orange-200 text-orange-700 px-3 py-1.5 rounded-full font-bold shadow-sm">
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
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${filter === f ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-500/20' : 'bg-white text-gray-500 border-gray-200 hover:text-gray-700 shadow-sm'}`}>
                            {f === 'all' ? '전체' : (STATUS_MAP[f]?.label || f)}
                            {f === 'all' ? ` (${subs.length})` : ` (${subs.filter(s => s.status === f).length})`}
                        </button>
                    ))}
                </div>
                <button onClick={handleExpireCheck}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold hover:bg-orange-100 transition-all shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">refresh</span>
                    만료 구독 일괄 처리
                </button>
            </div>

            {expireResult && (
                <p className="text-emerald-700 text-sm font-bold animate-pulse bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 inline-block">{expireResult}</p>
            )}

            {/* 구독 목록 */}
            {loading ? (
                <div className="text-center py-20 text-[var(--moca-text-3)]">
                    <div className="w-10 h-10 border-4 border-gray-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                    데이터를 불러오는 중입니다...
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                    <span className="material-symbols-outlined text-4xl text-gray-300 block mb-3">credit_card_off</span>
                    <p className="text-gray-400 font-bold">구독 내역이 없습니다</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(sub => {
                        const st = STATUS_MAP[sub.status] || STATUS_MAP.expired;
                        return (
                            <div key={sub.id} className={`bg-white border rounded-2xl p-4 transition-all shadow-sm hover:shadow-md ${sub.status === 'active' ? 'border-emerald-100' : 'border-gray-100'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <span className="text-gray-900 font-black text-sm">{sub.user_nickname}</span>
                                            <span className={`text-[10px] font-black rounded-full px-2 py-0.5 border ${st.bg} ${st.color} ${st.border}`}>
                                                {st.label}
                                            </span>
                                            <span className="text-gray-500 text-[10px] font-bold bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                                                {PLAN_LABELS[sub.plan_id] || sub.plan_id}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">결제 <span className="text-amber-700 font-bold">{formatPrice(sub.price)}</span></span>
                                            <span className="flex items-center gap-1 text-gray-400">시작 {formatDate(sub.started_at)}</span>
                                            <span className="flex items-center gap-1">만료 <span className={sub.status === 'active' ? 'text-orange-700 font-bold' : 'text-gray-400'}>{formatDate(sub.expires_at)}</span></span>
                                        </div>
                                        {sub.status === 'active' && (
                                            <p className="text-emerald-700 font-bold text-[11px] mt-2 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">{daysLeft(sub.expires_at)}</p>
                                        )}
                                        {sub.order_id && <p className="text-gray-300 text-[10px] mt-2 font-mono tracking-tighter">ORDER_ID: {sub.order_id}</p>}
                                    </div>
                                    <div className="flex flex-col gap-2 shrink-0">
                                        <select value={sub.status} onChange={e => handleStatusChange(sub.id, e.target.value)}
                                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 text-xs font-bold focus:outline-none focus:border-indigo-400 shadow-sm">
                                            <option value="active">활성</option>
                                            <option value="expired">만료</option>
                                            <option value="cancelled">취소</option>
                                        </select>
                                    </div>
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
