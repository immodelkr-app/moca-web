import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';

// 테스트용 임시 키 (추후 실제 토스 키로 교체 필요)
const TOSS_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

const SUBSCRIPTION_PLANS = [
    { id: 'gold_3m', months: 3, price: 30000, label: '3개월', discount: false },
    { id: 'gold_6m', months: 6, price: 50000, label: '6개월', discount: true, discountLabel: '약 16% 할인' },
    { id: 'gold_12m', months: 12, price: 100000, label: '12개월', discount: true, discountLabel: '약 16% 할인' },
];

const UpgradePage = () => {
    const navigate = useNavigate();
    const user = getUser();
    
    const [showPlansPopup, setShowPlansPopup] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(SUBSCRIPTION_PLANS[0]);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

    // ── 토스페이먼츠 결제 호출 핸들러 ──────────────────────────────────────────────
    const handlePayment = async () => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            navigate('/login');
            return;
        }

        setIsPaymentProcessing(true);
        try {
            // SDK 로드
            const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk').catch(() => null) || {};
            
            if (loadTossPayments) {
                const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
                const orderId = `SUBS-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
                const orderName = `골드모카 멤버십 ${selectedPlan.label} 구독`;

                // customerKey: 영문/숫자/_/-만 허용
                const safeCustomerKey = (user.id || user.nickname || 'guest').toString().replace(/[^a-zA-Z0-9_-]/g, '') || 'ANONYMOUS';

                // 결제 전 임시 저장 (추후 콜백에서 사용할 데이터)
                const pendingSub = {
                    planId: selectedPlan.id,
                    months: selectedPlan.months,
                    price: selectedPlan.price,
                    userId: user.id || user.nickname || 'guest'
                };
                localStorage.setItem('moca_pending_subscription', JSON.stringify(pendingSub));

                const payment = tossPayments.payment({ customerKey: safeCustomerKey });

                console.log('[TossPayments Upgrade] 결제 요청:', { orderId, price: selectedPlan.price, customerKey: safeCustomerKey });

                await payment.requestPayment({
                    method: 'CARD',
                    amount: {
                        currency: 'KRW',
                        value: selectedPlan.price,
                    },
                    orderId,
                    orderName,
                    customerName: user.name || user.nickname || '모카회원',
                    successUrl: `${window.location.origin}/upgrade?payment=success&orderId=${orderId}`,
                    failUrl: `${window.location.origin}/upgrade?payment=fail`,
                });
            } else {
                // 테스트 시뮬레이션
                setIsPaymentProcessing(false);
                alert(`[테스트] 결제 요청 완료!\n\n상품명: 골드모카 멤버십 ${selectedPlan.label}\n결제금액: ${selectedPlan.price.toLocaleString()}원\n\n(실제 토스페이먼츠 연동 완료 시 진짜 결제창이 뜹니다)`);
                navigate('/home');
            }
        } catch (err) {
            setIsPaymentProcessing(false);
            if (err?.code !== 'USER_CANCEL') {
                alert('결제 창 호출에 실패했습니다. 관리자에게 문의해주세요.');
            }
        }
    };

    // ── 결제 결과 리턴 처리 (URL 파라미터 체크) ─────────────────────────────────────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const payment = params.get('payment');
        
        if (payment === 'success') {
            // TODO: 서버(Supabase) 측 Confirm 인증 처리를 추가해야 합니다.
            alert('골드모카 결제가 정상적으로 처리되었습니다! (테스트 모드: 실제 결제 승인은 추가 서버 작업이 필요합니다)');
            
            // 더미 성공 처리 후 홈으로 보내기 (임시)
            window.history.replaceState({}, document.title, window.location.pathname);
            navigate('/home');
        } else if (payment === 'fail') {
            alert('결제가 취소되었거나 실폐했습니다. 다시 시도해주세요.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [navigate]);


    return (
        <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 w-[600px] h-[600px] bg-[#F59E0B]/5 rounded-full blur-[120px] pointer-events-none" />

            {/* Header Content */}
            <div className="relative z-10 w-full max-w-md bg-[#1a1a24] border border-white/10 rounded-3xl p-8 lg:p-10 shadow-2xl flex flex-col items-center text-center">
                {/* Crown Icon */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#FCD34D] flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.3)] mb-8">
                    <span className="text-[40px]">👑</span>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-black text-white mb-4">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FCD34D] to-[#F59E0B]">
                        골드모카
                    </span> 전용 혜택
                </h1>

                {/* Description */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-6 mb-10 w-full">
                    <p className="text-white/80 text-sm leading-relaxed mb-4 font-medium">
                        <strong className="text-white font-black">실버모카는 하루 최대 8번의 에이전시(지도/메모) 이용이 가능합니다.</strong><br />
                        <br />
                        인원/횟수 제한 없는 무제한 에이전시 열람은<br />
                        <span className="text-[#FCD34D]">골드모카</span>부터 가능합니다.
                    </p>
                    <div className="flex flex-col gap-2 border-t border-white/10 pt-4 text-left">
                        <div className="flex items-center gap-2 text-sm text-white/60">
                            <span className="material-symbols-outlined text-[#10b981] text-[18px]">check_circle</span>
                            <span><strong>광고 에이전시</strong> 무제한 조회</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/60">
                            <span className="material-symbols-outlined text-[#10b981] text-[18px]">check_circle</span>
                            <span>모델들이 많이 찾는 <strong>에이전시</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/60">
                            <span className="material-symbols-outlined text-[#10b981] text-[18px]">check_circle</span>
                            <span>신규 <strong>광고 에이전시</strong></span>
                        </div>
                    </div>
                </div>

                {/* Main Action Buttons */}
                <div className="w-full flex flex-col gap-3 mb-4">
                    <button
                        onClick={() => setShowPlansPopup(true)}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#F59E0B] hover:to-[#E58300] text-black font-black tracking-wide text-[16px] transition-all hover:-translate-y-1 shadow-[0_4px_20px_rgba(245,158,11,0.3)] cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[20px]">credit_card</span>
                        등업 결제하기
                    </button>
                    
                    <button
                        onClick={() => window.open('http://pf.kakao.com/_zlMUxj/chat', '_blank')}
                        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#FEE500]/10 hover:bg-[#FEE500]/20 text-[#FADA0B] border border-[#FEE500]/20 font-bold tracking-wide text-[14px] transition-all cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                        골드모카 신청 & 문의하기
                    </button>
                </div>

                {/* Secondary Action - Go Back */}
                <button
                    onClick={() => navigate(-1)}
                    className="w-full mt-2 py-3 rounded-xl border border-white/10 text-white/40 font-bold text-sm tracking-wide transition-colors hover:text-white hover:border-white/30 hover:bg-white/5 cursor-pointer"
                >
                    이전 페이지로 돌아가기
                </button>
            </div>

            {/* ── 구독 요금제 선택 모달 ───────────────────────────────────────── */}
            {showPlansPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isPaymentProcessing && setShowPlansPopup(false)}></div>
                    <div className="relative bg-[#1A1A24] border border-[#F59E0B]/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-slideUp">
                        
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-black text-white mb-2">골드모델멤버 구독 신청</h2>
                            <p className="text-white/50 text-xs">원하시는 구독 기간을 선택해 주세요.</p>
                        </div>

                        <div className="space-y-3 mb-8">
                            {SUBSCRIPTION_PLANS.map((plan) => (
                                <button
                                    key={plan.id}
                                    onClick={() => setSelectedPlan(plan)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                                        selectedPlan.id === plan.id 
                                        ? 'border-[#F59E0B] bg-[#F59E0B]/10' 
                                        : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                                    }`}
                                >
                                    <div className="flex flex-col items-start gap-1">
                                        <span className={`font-bold ${selectedPlan.id === plan.id ? 'text-[#FCD34D]' : 'text-white'}`}>
                                            {plan.label} 구독
                                        </span>
                                        {plan.discount && (
                                            <span className="text-[10px] font-black text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded leading-none">
                                                {plan.discountLabel}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className={`text-[17px] font-black ${selectedPlan.id === plan.id ? 'text-[#FCD34D]' : 'text-white'}`}>
                                            {plan.price.toLocaleString()}원
                                        </span>
                                        <span className="text-white/40 text-[11px] mt-0.5">
                                            월 {Math.round(plan.price / plan.months).toLocaleString()}원
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handlePayment}
                                disabled={isPaymentProcessing}
                                className={`w-full py-4 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#F59E0B] text-black font-black text-base shadow-lg transition-all ${isPaymentProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02]'}`}
                            >
                                {isPaymentProcessing ? '결제 창 여는 중...' : `${(selectedPlan.price).toLocaleString()}원 결제하기`}
                            </button>
                            
                            <button
                                onClick={() => window.open('http://pf.kakao.com/_zlMUxj/chat', '_blank')}
                                disabled={isPaymentProcessing}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#FEE500]/10 hover:bg-[#FEE500]/20 text-[#FADA0B] border border-[#FEE500]/20 font-bold tracking-wide text-[14px] transition-all cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-[18px]">chat</span>
                                궁금한 점 문의하기
                            </button>

                            <button
                                onClick={() => setShowPlansPopup(false)}
                                disabled={isPaymentProcessing}
                                className="w-full mt-1 py-3 rounded-xl border border-white/10 text-white/50 font-bold text-sm hover:text-white hover:bg-white/5"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UpgradePage;
