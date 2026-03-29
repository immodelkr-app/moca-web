import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { applyForClass } from '../services/classService';

const TOSS_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

// 카카오뱅크 계좌 정보
const BANK_INFO = {
    bankName: '카카오뱅크',
    accountNumber: '3333-34-9903852',
    accountHolder: '아임모델 (김대희)',
};

const ClassDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [cls, setCls] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isApplying, setIsApplying] = useState(false);
    const [isApplied, setIsApplied] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [success, setSuccess] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('transfer'); // 'transfer' | 'card'
    const [isTossLoading, setIsTossLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const GRADE_INFO = { SILVER: '🥈', GOLD: '🌟', VIP: '👑' };

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: userData } = await supabase
                .from('users')
                .select('id, nickname, name, phone, grade')
                .eq('id', user.id)
                .single();
            setCurrentUser(userData);

            const { data: app } = await supabase
                .from('class_applications')
                .select('id')
                .eq('class_id', id)
                .eq('user_id', user.id)
                .maybeSingle();
            if (app) setIsApplied(true);
        }

        const { data: classData } = await supabase
            .from('classes')
            .select('*, class_pricing (*)')
            .eq('id', id)
            .single();
        if (classData) setCls(classData);
        setLoading(false);
    };

    // 계좌이체 신청 처리
    const handleTransferApply = async () => {
        if (!currentUser) { alert('로그인이 필요합니다.'); return; }
        setIsApplying(true);
        const myPrice = cls.class_pricing.find(p => p.grade === currentUser.grade)?.price || 0;
        const { error } = await applyForClass({
            classId: cls.id,
            userId: currentUser.id,
            userGrade: currentUser.grade,
            appliedPrice: myPrice,
            paymentType: 'transfer',
        });
        if (error) {
            alert('신청 중 오류: ' + error.message);
        } else {
            setSuccess(true);
            setIsApplied(true);
        }
        setIsApplying(false);
    };

    // 카드결제 (토스페이먼츠) 처리
    const handleCardApply = async () => {
        if (!currentUser) { alert('로그인이 필요합니다.'); return; }
        setIsTossLoading(true);

        const myPrice = cls.class_pricing.find(p => p.grade === currentUser.grade)?.price || 0;

        try {
            // 먼저 신청 DB 레코드 생성 (payment_status = 'pending_card')
            const { data: application, error: applyError } = await applyForClass({
                classId: cls.id,
                userId: currentUser.id,
                userGrade: currentUser.grade,
                appliedPrice: myPrice,
                paymentType: 'card',
            });
            if (applyError) throw applyError;

            // 토스페이먼츠 주문 ID 생성 (영문+숫자만)
            const orderId = `CLASS-${cls.id.slice(0, 8).toUpperCase()}-${Date.now()}`;

            // 결제 콜백에서 복원할 정보 저장
            localStorage.setItem('moca_pending_class_order', JSON.stringify({
                orderId,
                classId: cls.id,
                applicationId: application?.id,
                classTitle: cls.title,
                finalPrice: myPrice,
                userGrade: currentUser.grade,
                userName: currentUser.name || currentUser.nickname,
            }));

            // 토스페이먼츠 SDK 로드
            const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
            const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
            const safeCustomerKey = (currentUser.nickname || 'ANONYMOUS').replace(/[^a-zA-Z0-9_-]/g, '') || 'ANONYMOUS';
            const payment = tossPayments.payment({ customerKey: safeCustomerKey });

            await payment.requestPayment({
                method: 'CARD',
                amount: { currency: 'KRW', value: myPrice },
                orderId,
                orderName: `모카 클래스 - ${cls.title}`,
                successUrl: `${window.location.origin}/payment/class-success`,
                failUrl: `${window.location.origin}/payment/fail`,
                customerName: currentUser.name || currentUser.nickname,
                customerMobilePhone: (currentUser.phone || '').replace(/-/g, ''),
            });
        } catch (err) {
            if (err?.code !== 'USER_CANCEL') {
                alert('결제 중 오류: ' + (err?.message || JSON.stringify(err)));
            }
        } finally {
            setIsTossLoading(false);
        }
    };

    const handleCopyAccount = () => {
        navigator.clipboard.writeText(`${BANK_INFO.accountNumber}`);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--moca-bg)]">
                <span className="material-symbols-outlined text-indigo-500 animate-spin text-4xl">progress_activity</span>
            </div>
        );
    }

    if (!cls) return <div className="text-center py-20 text-[var(--moca-text)]">클래스를 찾을 수 없습니다.</div>;

    const myPriceObj = cls.class_pricing?.find(p => p.grade === currentUser?.grade);
    const myPrice = myPriceObj ? myPriceObj.price : 0;

    return (
        <div className="min-h-screen bg-white pb-32">
            {/* Hero */}
            <div className="h-[40vh] w-full bg-gray-100 relative">
                {cls.image_url ? (
                    <img src={cls.image_url} alt={cls.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                        <span className="material-symbols-outlined text-indigo-200 text-[100px]">school</span>
                    </div>
                )}
                <div className="absolute top-0 left-0 right-0 p-5 flex items-center justify-between z-10">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center border border-white/20">
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                    <span className="px-3 py-1 rounded-lg bg-indigo-500 text-white text-[11px] font-black mb-2 inline-block">모카 클래스</span>
                    <h1 className="text-white text-2xl font-black mb-1">{cls.title}</h1>
                    <p className="text-indigo-100/80 text-sm font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {cls.location}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="px-6 py-8">
                {/* 등급별 가격표 */}
                <div className="mb-10">
                    <h2 className="text-lg font-black text-[var(--moca-text)] mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">payments</span>
                        멤버 등급별 참가비
                    </h2>
                    <div className="bg-[var(--moca-surface-2)] rounded-2xl overflow-hidden border border-[var(--moca-border)] shadow-sm">
                        {(cls.class_pricing || []).map((p, idx) => {
                            const isMyGrade = currentUser?.grade === p.grade;
                            return (
                                <div key={p.id} className={`flex items-center justify-between px-5 py-4 ${idx !== cls.class_pricing.length - 1 ? 'border-b border-[var(--moca-border)]' : ''} ${isMyGrade ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{GRADE_INFO[p.grade]}</span>
                                        <p className={`text-sm font-black ${isMyGrade ? 'text-indigo-600' : 'text-[var(--moca-text)]'}`}>
                                            {p.grade === 'VIP' ? '전속모델' : p.grade} 회원
                                            {isMyGrade && <span className="ml-2 text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded-full">내 등급</span>}
                                        </p>
                                    </div>
                                    <p className={`text-lg font-black ${isMyGrade ? 'text-indigo-600' : 'text-[var(--moca-text-2)]'}`}>
                                        {p.price.toLocaleString()}원
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                    {currentUser?.grade === 'SILVER' && (
                        <button onClick={() => navigate('/upgrade')} className="w-full mt-3 text-center text-xs font-bold text-indigo-500">
                            골드/전속 등급 업그레이드하고 할인가 받기 →
                        </button>
                    )}
                </div>

                {/* 상세 설명 */}
                <div className="mb-10">
                    <h2 className="text-lg font-black text-[var(--moca-text)] mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">description</span>
                        클래스 안내
                    </h2>
                    <div className="text-[var(--moca-text-2)] text-sm leading-relaxed whitespace-pre-wrap">
                        {cls.description || '상세 내용이 준비 중입니다.'}
                    </div>
                </div>

                {/* 일시/장소 */}
                <div className="mb-10">
                    <h2 className="text-lg font-black text-[var(--moca-text)] mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-500">pin_drop</span>
                        장소 / 일시
                    </h2>
                    <div className="bg-[var(--moca-bg)] p-5 rounded-2xl border border-[var(--moca-border)] space-y-3">
                        <div className="flex gap-3">
                            <span className="material-symbols-outlined text-indigo-500">calendar_month</span>
                            <div>
                                <p className="text-[var(--moca-text)] font-black text-sm">{cls.class_date}</p>
                                <p className="text-[var(--moca-text-3)] text-xs mt-0.5">교육 시작 10분 전까지 입실해주세요.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <span className="material-symbols-outlined text-indigo-500">location_on</span>
                            <div>
                                <p className="text-[var(--moca-text)] font-black text-sm">{cls.location}</p>
                                <p className="text-[var(--moca-text-3)] text-xs mt-0.5">상세 주소는 신청 확정 후 별도 안내드립니다.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 하단 고정 CTA */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--moca-border)] px-6 py-4 flex items-center gap-4 shadow-2xl z-40" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                <div className="flex-1">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{currentUser?.grade} 회원 특별가</p>
                    <p className="text-xl font-black text-[var(--moca-text)]">{myPrice.toLocaleString()}원</p>
                </div>
                {isApplied ? (
                    <button disabled className="bg-indigo-500/20 text-indigo-500 px-8 py-3.5 rounded-2xl font-black text-[15px] border border-indigo-500/30">
                        신청 완료 ✓
                    </button>
                ) : (
                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-8 py-3.5 rounded-2xl font-black text-[15px] shadow-lg shadow-indigo-500/25 active:scale-[0.97] transition-all"
                    >
                        지금 신청하기
                    </button>
                )}
            </div>

            {/* ── 신청 모달 ── */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isApplying && !isTossLoading && setShowModal(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] p-7 shadow-2xl z-10">

                        {/* 성공 후 입금안내 */}
                        {success ? (
                            <div className="text-center py-4">
                                <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-green-500 text-4xl">check_circle</span>
                                </div>
                                <h3 className="text-xl font-black text-[var(--moca-text)] mb-1">신청 완료!</h3>
                                <p className="text-sm text-[var(--moca-text-3)] mb-6">아래 계좌로 입금해주시면 최종 확정됩니다.</p>

                                <div className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-2xl p-5 mb-5 text-left">
                                    <p className="text-[10px] text-yellow-600 font-black mb-2 uppercase tracking-widest">입금 계좌 정보</p>
                                    <div className="flex items-center justify-between mb-1">
                                        <div>
                                            <p className="text-[var(--moca-text)] font-black text-lg">{BANK_INFO.bankName}</p>
                                            <p className="text-[var(--moca-text)] font-black text-xl tracking-widest select-all">{BANK_INFO.accountNumber}</p>
                                            <p className="text-[var(--moca-text-2)] text-sm font-bold mt-0.5">{BANK_INFO.accountHolder}</p>
                                        </div>
                                        <button onClick={handleCopyAccount} className={`ml-4 px-4 py-2 rounded-xl text-sm font-black transition-all border ${copySuccess ? 'bg-green-500 text-white border-green-500' : 'bg-white text-indigo-500 border-indigo-200 hover:bg-indigo-50'}`}>
                                            {copySuccess ? '복사됨 ✓' : '복사'}
                                        </button>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-yellow-200">
                                        <p className="text-yellow-700 text-xs font-bold">
                                            💰 입금 금액: <span className="text-base font-black">{myPrice.toLocaleString()}원</span>
                                        </p>
                                        <p className="text-yellow-600 text-[11px] mt-1">입금 후 매니저가 확인하여 연락드립니다.</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => { setShowModal(false); setSuccess(false); }}
                                    className="w-full bg-[var(--moca-text)] text-white font-black py-4 rounded-2xl"
                                >
                                    확인
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* 헤더 */}
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-xl font-black text-[var(--moca-text)]">모카 클래스 신청</h3>
                                    <button onClick={() => setShowModal(false)} className="material-symbols-outlined text-[var(--moca-text-3)]">close</button>
                                </div>

                                {/* 신청 정보 요약 */}
                                <div className="bg-[var(--moca-surface-2)] rounded-2xl p-4 mb-5 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[var(--moca-text-3)] text-sm">이름</span>
                                        <span className="text-[var(--moca-text)] font-black">{currentUser?.name || currentUser?.nickname}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[var(--moca-text-3)] text-sm">연락처</span>
                                        <span className="text-[var(--moca-text)] font-black">{currentUser?.phone}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[var(--moca-text-3)] text-sm">등급</span>
                                        <span className="text-indigo-500 font-black">{GRADE_INFO[currentUser?.grade]} {currentUser?.grade}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-[var(--moca-border)]">
                                        <span className="text-[var(--moca-text-3)] text-sm">결제금액</span>
                                        <span className="text-xl font-black text-indigo-600">{myPrice.toLocaleString()}원</span>
                                    </div>
                                </div>

                                {/* 결제 방법 선택 */}
                                <div className="mb-5">
                                    <p className="text-[var(--moca-text-2)] text-sm font-black mb-3">결제 방법 선택</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setPaymentMethod('transfer')}
                                            className={`py-3.5 px-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'transfer' ? 'border-yellow-400 bg-yellow-50' : 'border-[var(--moca-border)] bg-white hover:border-yellow-300'}`}
                                        >
                                            <span className="text-2xl">🏦</span>
                                            <span className={`text-[12px] font-black ${paymentMethod === 'transfer' ? 'text-yellow-700' : 'text-[var(--moca-text-2)]'}`}>계좌이체</span>
                                            <span className={`text-[10px] font-bold ${paymentMethod === 'transfer' ? 'text-yellow-600' : 'text-[var(--moca-text-3)]'}`}>카카오뱅크</span>
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('card')}
                                            className={`py-3.5 px-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'card' ? 'border-indigo-500 bg-indigo-50' : 'border-[var(--moca-border)] bg-white hover:border-indigo-300'}`}
                                        >
                                            <span className="text-2xl">💳</span>
                                            <span className={`text-[12px] font-black ${paymentMethod === 'card' ? 'text-indigo-700' : 'text-[var(--moca-text-2)]'}`}>카드결제</span>
                                            <span className={`text-[10px] font-bold ${paymentMethod === 'card' ? 'text-indigo-600' : 'text-[var(--moca-text-3)]'}`}>토스페이먼츠</span>
                                        </button>
                                    </div>
                                </div>

                                {/* 계좌이체 안내 미리보기 */}
                                {paymentMethod === 'transfer' && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-5 text-sm">
                                        <p className="text-yellow-700 font-black text-[11px] mb-1">신청 완료 후 아래 계좌로 입금</p>
                                        <p className="text-[var(--moca-text)] font-black">{BANK_INFO.bankName} {BANK_INFO.accountNumber}</p>
                                        <p className="text-[var(--moca-text-2)] text-[11px]">{BANK_INFO.accountHolder}</p>
                                    </div>
                                )}
                                {paymentMethod === 'card' && (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-5 text-sm">
                                        <p className="text-indigo-600 font-bold text-[11px]">
                                            토스페이먼츠 결제창이 열립니다. 카드 정보를 입력하시면 즉시 결제됩니다.
                                        </p>
                                    </div>
                                )}

                                {/* 최종 버튼 */}
                                {paymentMethod === 'transfer' ? (
                                    <button
                                        onClick={handleTransferApply}
                                        disabled={isApplying}
                                        className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-black py-4 rounded-2xl shadow-lg shadow-yellow-400/20 active:scale-[0.98] transition-all disabled:opacity-50"
                                    >
                                        {isApplying ? '신청 처리 중...' : '🏦 계좌이체로 신청하기'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCardApply}
                                        disabled={isTossLoading}
                                        className="w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isTossLoading ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                결제창 여는 중...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[18px]">credit_card</span>
                                                💳 카드로 {myPrice.toLocaleString()}원 결제
                                            </>
                                        )}
                                    </button>
                                )}

                                <p className="text-center text-[var(--moca-text-3)] text-[10px] mt-3">
                                    * 신청 정보는 가입 정보를 기반으로 자동 제출됩니다.
                                </p>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassDetailPage;
