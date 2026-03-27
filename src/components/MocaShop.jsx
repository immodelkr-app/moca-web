import React, { useState, useEffect, useCallback } from 'react';
import { getUser } from '../services/userService';
import { fetchShopProducts } from '../services/shopService';
import { supabase } from '../services/supabaseClient';
import FlashDealCard from './shop/FlashDealCard';
import CountdownTimer from './shop/CountdownTimer';
import OrderModal from './shop/OrderModal';
import PaymentResult from './shop/PaymentResult';
import ProductDetailModal from './shop/ProductDetailModal';
import { sendAlimtalk } from '../services/aligoService';

// 토스페이먼츠 클라이언트 키 (테스트)
const TOSS_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

const GRADE_BADGE = {
    SILVER: { label: '🤍 SILVER', cls: 'bg-slate-400/20 text-slate-300 border-slate-400/30' },
    GOLD: { label: '👑 GOLD', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' },
    VIP: { label: '💜 전속모델', cls: 'bg-purple-500/20 text-purple-300 border-purple-400/30' },
    VVIP: { label: '🔥 VVIP', cls: 'bg-pink-500/20 text-pink-300 border-pink-400/30' },
};

const MocaShop = () => {
    const user = getUser();
    const userGrade = user?.grade || 'SILVER';
    const userNickname = user?.nickname || '';

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [coupons, setCoupons] = useState([]);
    const [copiedId, setCopiedId] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedDetailProduct, setSelectedDetailProduct] = useState(null); // 상세 모달
    const [paymentResult, setPaymentResult] = useState(null);

    const gradeBadge = GRADE_BADGE[userGrade] || GRADE_BADGE.SILVER;

    // ── 상품 + 쿠폰 로드 ──────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data } = await fetchShopProducts();
            setProducts(data || []);

            // 등급에 맞는 쿠폰 로드
            if (supabase) {
                const GRADE_ORDER = ['ALL', 'SILVER', 'GOLD', 'VIP', 'VVIP'];
                const gradeIdx = GRADE_ORDER.indexOf(userGrade);
                const eligible = GRADE_ORDER.slice(0, gradeIdx + 1);
                const orFilter = `target_grade.eq.ALL,${eligible.filter(g => g !== 'ALL').map(g => `target_grade.eq.${g}`).join(',')}`;
                const { data: couponData } = await supabase
                    .from('shop_coupon_codes')
                    .select('*')
                    .eq('is_active', true)
                    .or(orFilter)
                    .order('created_at', { ascending: false });
                setCoupons(couponData || []);
            }

            setLoading(false);
        };
        load();
    }, [userGrade]);

    // ── 쿠폰 복사 ────────────────────────────────────────────────────────────
    const handleCopyCoupon = (coupon) => {
        navigator.clipboard.writeText(coupon.code).then(() => {
            setCopiedId(coupon.id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    // ── 구매 버튼 핸들러 ──────────────────────────────────────────────────────
    const handleBuyClick = useCallback((product) => {
        setSelectedProduct(product);
    }, []);

    // ── 결제 처리 (토스페이먼츠) ──────────────────────────────────────────────
    const handlePaymentConfirm = useCallback(async ({ product, form, finalPrice, couponCode, couponId, couponDiscount, userGrade, userNickname }) => {
        try {
            // 토스페이먼츠 SDK 동적 로드
            const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk').catch(() => null) || {};

            if (loadTossPayments) {
                // SDK v2 방식 (정식)
                const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
                const orderId = `MOCA-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
                const orderName = product.title;

                // customerKey: 영문/숫자/_/-만 허용 (한글 등 특수문자 제거)
                const safeCustomerKey = (userNickname || 'ANONYMOUS').replace(/[^a-zA-Z0-9_-]/g, '') || 'ANONYMOUS';

                // 결제창 넘어가기 전 정보 임시 저장 (PaymentSuccess에서 DB 저장 시 필요)
                const pendingOrder = {
                    orderId,
                    productId: product.id,
                    productTitle: product.title,
                    originalPrice: product.original_price,
                    salePrice: product.sale_price,
                    finalPrice,
                    couponCode: couponCode || null,
                    couponId: couponId || null,
                    couponDiscount: couponDiscount || 0,
                    userGrade,
                    userNickname,
                    recipientName: form.recipientName,
                    phone: form.phone,
                    address: form.address,
                    addressDetail: form.addressDetail || '',
                    memo: form.memo || '',
                    // 알림톡용 호환 필드
                    title: product.title,
                    price: finalPrice,
                    name: form.recipientName,
                };
                localStorage.setItem('moca_pending_order', JSON.stringify(pendingOrder));

                const payment = tossPayments.payment({ customerKey: safeCustomerKey });

                console.log('[TossPayments MocaShop] 결제 요청:', { orderId, finalPrice, customerKey: safeCustomerKey });

                await payment.requestPayment({
                    method: 'CARD',
                    amount: {
                        currency: 'KRW',
                        value: finalPrice,
                    },
                    orderId,
                    orderName,
                    customerName: form.recipientName,
                    customerMobilePhone: form.phone.replace(/-/g, ''),
                    successUrl: `${window.location.origin}/payment/success`,
                    failUrl: `${window.location.origin}/payment/fail`,
                });
            } else {
                // SDK 미설치 시 시뮬레이션 (개발/테스트용)
                await new Promise(r => setTimeout(r, 1500));
                const orderId = `MOCA-${Date.now()}-SIM`;

                // 👉 알림톡 자동 발송 (결제완료)
                const templateText = `안녕하세요 ${form.recipientName}님,\n모두의 캐스팅 매니저, 아임모카(IM MOCA)입니다.\n\n모카 에디트 제품주문이 안전하게 정상 처리되었습니다.\n\n■ 주문번호: ${orderId}\n■ 상품명: ${product.title}\n■ 결제금액: ${finalPrice}원\n\n소중한 주문 감사드리며, 상품 수령 및 추후 진행 과정에 대한 상세 안내는 모카앱 내 구매내역 페이지를 참고해 주시기 바랍니다.`;
                sendAlimtalk('KA01TP2603090914222939uX2yoKzF33', [{
                    phone: form.phone,
                    name: form.recipientName,
                    message: templateText,
                    variables: {
                        "이름": form.recipientName,
                        "주문번호": orderId,
                        "상품명": product.title,
                        "결제금액": String(finalPrice)
                    },
                    button: {
                        "button": [
                            {
                                "name": "주문내역 확인",
                                "linkType": "WL",
                                "linkTypeName": "웹링크",
                                "linkM": "https://immoca.kr/home/shop",
                                "linkP": "https://immoca.kr/home/shop"
                            }
                        ]
                    }
                }]).then(() => console.log('결제알림톡 발송 성공'))
                    .catch(err => console.error('결제알림톡 발송 에러:', err));

                setSelectedProduct(null);
                setPaymentResult({
                    status: 'success',
                    orderInfo: {
                        orderId,
                        productTitle: product.title,
                        finalPrice,
                        recipientName: form.recipientName,
                    }
                });
            }
        } catch (err) {
            if (err?.code === 'USER_CANCEL') {
                setSelectedProduct(null);
                return;
            }
            setSelectedProduct(null);
            setPaymentResult({ status: 'fail', orderInfo: null });
        }
    }, []);

    // ── URL 파라미터로 결제 결과 처리 ─────────────────────────────────────────
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const payment = params.get('payment');
        if (payment === 'success') {
            const orderId = params.get('orderId');
            const pendingStr = localStorage.getItem('moca_pending_order');
            const pending = pendingStr ? JSON.parse(pendingStr) : null;

            if (pending && pending.phone && pending.name) {
                // 👉 알림톡 자동 발송 (토스페이먼츠 실제 결제 완료)
                const templateText = `안녕하세요 ${pending.name}님,\n모두의 캐스팅 매니저, 아임모카(IM MOCA)입니다.\n\n모카 에디트 제품주문이 안전하게 정상 처리되었습니다.\n\n■ 주문번호: ${orderId}\n■ 상품명: ${pending.title}\n■ 결제금액: ${pending.price}원\n\n소중한 주문 감사드리며, 상품 수령 및 추후 진행 과정에 대한 상세 안내는 모카앱 내 구매내역 페이지를 참고해 주시기 바랍니다.`;
                sendAlimtalk('KA01TP2603090914222939uX2yoKzF33', [{
                    phone: pending.phone,
                    name: pending.name,
                    message: templateText,
                    variables: {
                        "이름": pending.name,
                        "주문번호": orderId,
                        "상품명": pending.title,
                        "결제금액": String(pending.price)
                    },
                    button: {
                        "button": [
                            {
                                "name": "주문내역 확인",
                                "linkType": "WL",
                                "linkTypeName": "웹링크",
                                "linkM": "https://immoca.kr/home/shop",
                                "linkP": "https://immoca.kr/home/shop"
                            }
                        ]
                    }
                }]).catch(err => console.error('결제알림톡 발송 에러:', err));

                localStorage.removeItem('moca_pending_order');
            }

            setPaymentResult({
                status: 'success',
                orderInfo: {
                    orderId: orderId,
                    productTitle: pending ? pending.title : '구매 완료',
                    finalPrice: pending ? pending.price : null,
                    recipientName: pending ? pending.name : '',
                }
            });
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (payment === 'fail') {
            setPaymentResult({ status: 'fail', orderInfo: null });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // ── 상품 없는 경우 최초 판매 시작 시간 추출 ───────────────────────────────
    const nextSaleStart = products.length > 0
        ? products.reduce((min, p) => {
            const t = new Date(p.sale_start);
            return t < min ? t : min;
        }, new Date(products[0].sale_start))
        : null;

    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[#080810] pb-24">
            {/* ── 헤더 배너 ─────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1a1040] via-[#0f0f20] to-[#1a0830] border-b border-white/10">
                {/* 배경 그라데이션 orb */}
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/20 rounded-full blur-3xl" />

                <div className="relative px-4 pt-6 pb-5">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-orange-400 text-xl">🔥</span>
                                <h1 className="text-white font-black text-xl tracking-tight">MOCA 에디트</h1>
                            </div>
                            <p className="text-white/40 text-xs text-indigo-300 font-bold">모카 멤버 타임공구</p>
                        </div>

                        <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-bold ${gradeBadge.cls}`}>
                            {gradeBadge.label}
                        </div>
                    </div>

                </div>
            </div>

            {/* ── 상품 그리드 ───────────────────────────────────────────────── */}
            <div className="px-3 pt-4">
                {loading ? (
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="rounded-2xl bg-white/5 border border-white/10 aspect-[3/4] animate-pulse" />
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <EmptyState />
                ) : (
                    <>
                        {/* 전체 판매 종료 타이머 (상품이 모두 같은 마감 시간인 경우) */}
                        {nextSaleStart && (
                            <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl px-4 py-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-orange-400 text-base">schedule</span>
                                    <span className="text-white/60 text-xs">현재 라운드 종료까지</span>
                                </div>
                                <CountdownTimer
                                    targetDate={products[0]?.sale_end}
                                    variant="inline"
                                    className="text-base"
                                />
                            </div>
                        )}

                        {/* 2열 그리드 */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* 최대 2개 노출 — 추후 상품이 많아지면 slice 제거 */}
                            {products.slice(0, 2).map((product, idx) => (
                                <FlashDealCard
                                    key={product.id}
                                    product={product}
                                    userGrade={userGrade}
                                    onBuyClick={handleBuyClick}
                                    onDetailClick={setSelectedDetailProduct}
                                    index={idx}
                                />
                            ))}
                        </div>

                        {/* 등급별 쿠폰 */}
                        <GradeInfoBanner userGrade={userGrade} coupons={coupons} copiedId={copiedId} onCopy={handleCopyCoupon} />
                    </>
                )}
            </div>

            {/* ── 모달 레이어 ───────────────────────────────────────────────── */}
            {/* 상세 페이지 모달 */}
            {selectedDetailProduct && (
                <ProductDetailModal
                    product={selectedDetailProduct}
                    onClose={() => setSelectedDetailProduct(null)}
                    onBuyClick={(product) => { setSelectedDetailProduct(null); handleBuyClick(product); }}
                />
            )}

            {selectedProduct && !paymentResult && (
                <OrderModal
                    product={selectedProduct}
                    userGrade={userGrade}
                    userNickname={userNickname}
                    onClose={() => setSelectedProduct(null)}
                    onConfirm={handlePaymentConfirm}
                />
            )}

            {paymentResult && (
                <PaymentResult
                    status={paymentResult.status}
                    orderInfo={paymentResult.orderInfo}
                    onRetry={() => { setPaymentResult(null); setSelectedProduct(selectedProduct); }}
                />
            )}
        </div>
    );
};

// ── 서브 컴포넌트 ──────────────────────────────────────────────────────────────

const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl text-white/20">storefront</span>
        </div>
        <p className="text-white/40 font-bold text-base mb-1">판매 준비 중</p>
        <p className="text-white/25 text-sm">곧 새로운 모카 에디트가 오픈됩니다!</p>
    </div>
);

const GRADE_COLORS = {
    SILVER: 'border-[#94A3B8]/50 text-[#94A3B8] bg-[#94A3B8]/10',
    GOLD: 'border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10',
    VIP: 'border-[#A78BFA]/50 text-[#A78BFA] bg-[#A78BFA]/10',
    VVIP: 'border-[#F472B6]/50 text-[#F472B6] bg-[#F472B6]/10',
    ALL: 'border-[#6C63FF]/40 text-[#9B8AFB] bg-[#6C63FF]/10',
};

const GradeInfoBanner = ({ userGrade, coupons, copiedId, onCopy }) => {
    const formatDiscount = (c) => c.discount_type === 'pct' ? `${c.discount_value}%` : `${c.discount_value.toLocaleString()}원`;
    const formatExpiry = (expiresAt) => {
        if (!expiresAt) return null;
        const d = new Date(expiresAt);
        return `${d.getMonth() + 1}/${d.getDate()} 까지`;
    };

    return (
        <div className="mt-6 bg-gradient-to-r from-[#1a1040]/60 to-[#0f0f20]/60 border border-white/10 rounded-2xl p-4">
            <h3 className="text-white/70 text-xs font-bold mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-indigo-400">confirmation_number</span>
                내 등급 사용 가능 쿠폰
            </h3>

            {coupons.length === 0 ? (
                <div className="text-center py-4">
                    <p className="text-white/30 text-xs">현재 사용 가능한 쿠폰이 없습니다.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {coupons.map(coupon => (
                        <div key={coupon.id} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                            {/* 할인율 */}
                            <div className="w-12 flex-shrink-0 text-center">
                                <p className="font-black text-base text-[#A78BFA]">{formatDiscount(coupon)}</p>
                                <p className="text-[9px] text-white/30">OFF</p>
                            </div>

                            {/* 정보 */}
                            <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-bold truncate">{coupon.description || '할인 쿠폰'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${GRADE_COLORS[coupon.target_grade] || GRADE_COLORS['ALL']}`}>
                                        {coupon.target_grade === 'ALL' ? '전체' : coupon.target_grade === 'VIP' ? '전속모델+' : `${coupon.target_grade}+`}
                                    </span>
                                    {coupon.min_price > 0 && (
                                        <span className="text-[9px] text-white/30">{coupon.min_price.toLocaleString()}원 이상</span>
                                    )}
                                    {coupon.expires_at && (
                                        <span className="text-[9px] text-white/30">{formatExpiry(coupon.expires_at)}</span>
                                    )}
                                </div>
                            </div>

                            {/* 코드 복사 버튼 */}
                            <button
                                onClick={() => onCopy(coupon)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all flex-shrink-0 ${copiedId === coupon.id ? 'border-[#10B981]/50 bg-[#10B981]/10' : 'border-[#6C63FF]/30 bg-[#6C63FF]/10 active:scale-95'}`}
                            >
                                <span className="font-mono font-black text-xs text-white uppercase">{coupon.code}</span>
                                <span className={`material-symbols-outlined text-[13px] ${copiedId === coupon.id ? 'text-[#10B981]' : 'text-[#818CF8]'}`}>
                                    {copiedId === coupon.id ? 'check' : 'content_copy'}
                                </span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MocaShop;
