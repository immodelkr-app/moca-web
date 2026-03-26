import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';

const TOSS_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

const PLANS = [
    { id: 'gold_1m',  months: 1,  price: 10000,  label: '1개월',  monthly: 10000, popular: false },
    { id: 'gold_3m',  months: 3,  price: 30000,  label: '3개월',  monthly: 10000, popular: false },
    { id: 'gold_6m',  months: 6,  price: 50000,  label: '6개월',  monthly: 8333,  popular: true,  discountPct: 17 },
    { id: 'gold_12m', months: 12, price: 100000, label: '12개월', monthly: 8333,  popular: false, discountPct: 17 },
];

// ── 등급별 혜택 비교 데이터 ──────────────────────────────────────────────────
const FEATURES = [
    { name: '에이전시 조회', silver: '하루 8회', gold: '무제한', icon: 'search' },
    { name: '프로필 등록 & 이메일 발송', silver: true, gold: true, icon: 'forward_to_inbox' },
    { name: '모카 에디트 (쇼핑)', silver: true, gold: true, icon: 'shopping_bag' },
    { name: '현재모습 사진등록', silver: false, gold: true, icon: 'photo_library' },
    { name: '디지털 멤버십 카드', silver: true, gold: true, icon: 'badge' },
    { name: '모카라운지 · 모카TV', silver: true, gold: true, icon: 'live_tv' },
    { name: '투어 다이어리', silver: true, gold: true, icon: 'auto_stories' },
    { name: '우선 캐스팅 노출', silver: false, gold: true, icon: 'star' },
    { name: '전용 쿠폰 혜택', silver: false, gold: true, icon: 'confirmation_number' },
];

const UpgradePage = () => {
    const navigate = useNavigate();
    const user = getUser();
    const userGrade = user?.grade || 'SILVER';
    const isAlreadyGold = ['GOLD', 'VIP', 'VVIP'].includes(userGrade);

    const [selectedPlan, setSelectedPlan] = useState(PLANS[2]); // 6개월 기본 선택
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState('compare'); // compare | plans

    // ── 토스 결제 ───────────────────────────────────────────────────────────
    const handlePayment = async () => {
        if (!user) { alert('로그인이 필요합니다.'); navigate('/login'); return; }
        setIsProcessing(true);
        try {
            const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk').catch(() => null) || {};
            if (loadTossPayments) {
                const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
                const orderId = `SUBS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
                const safeCustomerKey = (user.id || user.nickname || 'guest').toString().replace(/[^a-zA-Z0-9_-]/g, '') || 'ANONYMOUS';

                localStorage.setItem('moca_pending_subscription', JSON.stringify({
                    planId: selectedPlan.id,
                    months: selectedPlan.months,
                    price: selectedPlan.price,
                    userId: user.id || user.nickname,
                }));

                const payment = tossPayments.payment({ customerKey: safeCustomerKey });
                await payment.requestPayment({
                    method: 'CARD',
                    amount: { currency: 'KRW', value: selectedPlan.price },
                    orderId,
                    orderName: `골드모카 멤버십 ${selectedPlan.label} 구독`,
                    customerName: user.name || user.nickname || '모카회원',
                    successUrl: `${window.location.origin}/upgrade?payment=success&orderId=${orderId}`,
                    failUrl: `${window.location.origin}/upgrade?payment=fail`,
                });
            } else {
                setIsProcessing(false);
                alert(`[테스트] 골드모카 ${selectedPlan.label} 구독 결제 (${selectedPlan.price.toLocaleString()}원)`);
            }
        } catch (err) {
            setIsProcessing(false);
            if (err?.code !== 'USER_CANCEL') alert('결제 처리 중 오류가 발생했습니다.');
        }
    };

    // ── 결제 결과 ───────────────────────────────────────────────────────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const payment = params.get('payment');
        if (payment === 'success') {
            alert('골드모카 결제가 정상 처리되었습니다!');
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate('/home');
        } else if (payment === 'fail') {
            alert('결제가 취소되었거나 실패했습니다.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [navigate]);

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white pb-32">

            {/* ── 배경 ── */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#F59E0B]/6 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-[#6C63FF]/5 rounded-full blur-[120px]" />
            </div>

            {/* ── 헤더 ── */}
            <div className="relative z-10 px-5 pt-8 pb-2 flex items-center gap-3">
                <button onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-white/60">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-xl font-black tracking-tight">모카앱 플랜</h1>
                    <p className="text-white/30 text-xs mt-0.5">나에게 맞는 플랜을 선택하세요</p>
                </div>
            </div>

            <div className="relative z-10 px-5 space-y-5">

                {/* ── 현재 등급 배너 ── */}
                <div className={`rounded-2xl p-4 border flex items-center gap-3 ${isAlreadyGold
                    ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30'
                    : 'bg-white/5 border-white/10'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAlreadyGold ? 'bg-[#F59E0B]/20' : 'bg-white/10'}`}>
                        <span className="text-xl">{isAlreadyGold ? '👑' : '🤍'}</span>
                    </div>
                    <div>
                        <p className={`text-sm font-black ${isAlreadyGold ? 'text-[#FCD34D]' : 'text-white/60'}`}>
                            현재 등급: {userGrade === 'VIP' ? '전속모델' : userGrade}
                        </p>
                        <p className="text-white/30 text-xs">
                            {isAlreadyGold ? '골드 혜택을 이용 중입니다' : '무료 실버 플랜 사용 중'}
                        </p>
                    </div>
                </div>

                {/* ── 탭 전환 ── */}
                <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-1">
                    {[
                        { id: 'compare', label: '등급별 혜택 비교', icon: 'compare' },
                        { id: 'plans', label: '구독 플랜 선택', icon: 'credit_card' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-[#F59E0B]/20 text-[#FCD34D] border border-[#F59E0B]/30'
                                    : 'text-white/40 hover:text-white/60'
                            }`}>
                            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ══ 등급별 혜택 비교 탭 ══ */}
                {activeTab === 'compare' && (
                    <div className="space-y-4 animate-fadeIn">
                        {/* 등급 카드 비교 */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* 실버 카드 */}
                            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-center">
                                <div className="w-12 h-12 mx-auto rounded-full bg-slate-500/15 flex items-center justify-center mb-3">
                                    <span className="text-2xl">🤍</span>
                                </div>
                                <h3 className="text-white font-black text-base mb-1">SILVER</h3>
                                <p className="text-emerald-400 font-black text-lg">무료</p>
                                <p className="text-white/25 text-[10px] mt-1">기본 회원</p>
                            </div>
                            {/* 골드 카드 */}
                            <div className="bg-[#F59E0B]/8 border-2 border-[#F59E0B]/40 rounded-2xl p-4 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-[#F59E0B] text-black text-[9px] font-black px-2.5 py-0.5 rounded-bl-xl">추천</div>
                                <div className="w-12 h-12 mx-auto rounded-full bg-[#F59E0B]/20 flex items-center justify-center mb-3">
                                    <span className="text-2xl">👑</span>
                                </div>
                                <h3 className="text-[#FCD34D] font-black text-base mb-1">GOLD</h3>
                                <p className="text-[#FCD34D] font-black text-lg">월 10,000원~</p>
                                <p className="text-[#FCD34D]/40 text-[10px] mt-1">프리미엄 회원</p>
                            </div>
                        </div>

                        {/* 기능 비교 리스트 */}
                        <div className="bg-white/[0.03] border border-white/8 rounded-2xl overflow-hidden">
                            <div className="grid grid-cols-[1fr_70px_70px] px-4 py-3 border-b border-white/8 bg-white/[0.02]">
                                <span className="text-white/30 text-[11px] font-bold">기능</span>
                                <span className="text-white/30 text-[11px] font-bold text-center">SILVER</span>
                                <span className="text-[#FCD34D]/50 text-[11px] font-bold text-center">GOLD</span>
                            </div>
                            {FEATURES.map((feat, i) => (
                                <div key={i} className={`grid grid-cols-[1fr_70px_70px] px-4 py-3 items-center ${i < FEATURES.length - 1 ? 'border-b border-white/5' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[14px] text-white/25">{feat.icon}</span>
                                        <span className="text-white/70 text-xs font-bold">{feat.name}</span>
                                    </div>
                                    <div className="flex justify-center">
                                        {typeof feat.silver === 'string' ? (
                                            <span className="text-white/40 text-[10px] font-bold">{feat.silver}</span>
                                        ) : feat.silver ? (
                                            <span className="material-symbols-outlined text-[16px] text-emerald-400">check_circle</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-[16px] text-white/15">cancel</span>
                                        )}
                                    </div>
                                    <div className="flex justify-center">
                                        {typeof feat.gold === 'string' ? (
                                            <span className="text-[#FCD34D] text-[10px] font-black">{feat.gold}</span>
                                        ) : feat.gold ? (
                                            <span className="material-symbols-outlined text-[16px] text-[#FCD34D]">check_circle</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-[16px] text-white/15">cancel</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 구독하기 CTA */}
                        {!isAlreadyGold && (
                            <button onClick={() => setActiveTab('plans')}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FCD34D] to-[#F59E0B] text-black font-black text-base shadow-lg shadow-[#F59E0B]/20 hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                                <span className="text-lg">👑</span>
                                골드 구독하기
                            </button>
                        )}
                    </div>
                )}

                {/* ══ 구독 플랜 선택 탭 ══ */}
                {activeTab === 'plans' && (
                    <div className="space-y-4 animate-fadeIn">

                        {/* 플랜 카드들 */}
                        <div className="space-y-3">
                            {PLANS.map(plan => {
                                const isSelected = selectedPlan.id === plan.id;
                                return (
                                    <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                                        className={`w-full relative p-4 rounded-2xl border-2 transition-all text-left ${
                                            isSelected
                                                ? 'border-[#F59E0B] bg-[#F59E0B]/10 shadow-lg shadow-[#F59E0B]/10'
                                                : 'border-white/10 bg-white/[0.03] hover:border-white/25'
                                        }`}>
                                        {plan.popular && (
                                            <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-[#F59E0B] to-[#E58300] text-black text-[10px] font-black px-3 py-0.5 rounded-full shadow-sm">
                                                BEST
                                            </span>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isSelected ? 'border-[#F59E0B] bg-[#F59E0B]' : 'border-white/20'
                                                }`}>
                                                    {isSelected && <span className="material-symbols-outlined text-[14px] text-black">check</span>}
                                                </div>
                                                <div>
                                                    <p className={`font-black ${isSelected ? 'text-[#FCD34D]' : 'text-white'}`}>
                                                        {plan.label}
                                                    </p>
                                                    <p className="text-white/30 text-xs mt-0.5">
                                                        월 {plan.monthly.toLocaleString()}원
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-lg font-black ${isSelected ? 'text-[#FCD34D]' : 'text-white'}`}>
                                                    {plan.price.toLocaleString()}원
                                                </p>
                                                {plan.discountPct && (
                                                    <span className="text-[10px] font-black text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">
                                                        {plan.discountPct}% 할인
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 선택된 플랜 요약 */}
                        <div className="bg-[#14141f] border border-[#F59E0B]/20 rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-white/40 text-sm">선택한 플랜</span>
                                <span className="text-[#FCD34D] font-black">{selectedPlan.label} 구독</span>
                            </div>
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/8">
                                <span className="text-white/40 text-sm">결제 금액</span>
                                <span className="text-white font-black text-xl">{selectedPlan.price.toLocaleString()}원</span>
                            </div>

                            {/* 결제 버튼 */}
                            <button onClick={handlePayment} disabled={isProcessing || isAlreadyGold}
                                className={`w-full py-4 rounded-2xl font-black text-base shadow-lg transition-all flex items-center justify-center gap-2 ${
                                    isAlreadyGold
                                        ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-[#FCD34D] to-[#F59E0B] text-black shadow-[#F59E0B]/25 hover:opacity-90 active:scale-[0.97]'
                                } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {isAlreadyGold ? (
                                    <>이미 골드 회원입니다</>
                                ) : isProcessing ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        결제창 여는 중...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[20px]">credit_card</span>
                                        {selectedPlan.price.toLocaleString()}원 결제하기
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 카카오 문의 */}
                        <button onClick={() => window.open('http://pf.kakao.com/_zlMUxj/chat', '_blank')}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#FEE500]/8 border border-[#FEE500]/15 text-[#FADA0B] font-bold text-sm hover:bg-[#FEE500]/15 transition-all">
                            <span className="material-symbols-outlined text-[18px]">chat</span>
                            골드모카 문의하기
                        </button>

                        {/* 안내 */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-2">
                            <p className="text-white/30 text-[11px] font-bold flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[12px]">info</span>
                                이용 안내
                            </p>
                            <ul className="text-white/25 text-[11px] space-y-1 pl-4">
                                <li>• 결제 완료 후 즉시 골드 등급이 적용됩니다.</li>
                                <li>• 구독 기간 만료 시 자동으로 실버로 변경됩니다.</li>
                                <li>• 환불 문의는 카카오톡 채널로 연락해주세요.</li>
                                <li>• 부가세(VAT) 포함 금액입니다.</li>
                            </ul>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default UpgradePage;
