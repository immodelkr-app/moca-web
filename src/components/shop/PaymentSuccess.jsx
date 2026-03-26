import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createOrder, decreaseStock, recordCouponUse } from '../../services/shopService';
import { supabase } from '../../services/supabaseClient';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // loading | success | error
    const [orderInfo, setOrderInfo] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const confirm = async () => {
            try {
                const paymentKey = searchParams.get('paymentKey');
                const orderId = searchParams.get('orderId');
                const amount = Number(searchParams.get('amount'));

                if (!paymentKey || !orderId || !amount) {
                    throw new Error('결제 정보가 올바르지 않습니다.');
                }

                // 저장된 pending 주문 정보 불러오기
                const pendingRaw = localStorage.getItem('moca_pending_order');
                if (!pendingRaw) throw new Error('주문 정보를 찾을 수 없습니다.');
                const pending = JSON.parse(pendingRaw);

                // 금액 검증 (조작 방지)
                if (pending.finalPrice !== amount) {
                    throw new Error('결제 금액이 일치하지 않습니다.');
                }

                // 토스페이먼츠 결제 승인 (Supabase Edge Function 경유)
                const { data: confirmData, error: confirmError } = await supabase.functions.invoke('toss-confirm', {
                    body: { paymentKey, orderId, amount },
                });

                if (confirmError || confirmData?.error) {
                    throw new Error(confirmData?.error || '결제 승인에 실패했습니다.');
                }

                // DB에 주문 저장 (shop_orders 테이블 컬럼에 정확히 맞춤)
                const orderPayload = {
                    order_id: orderId,
                    product_id: pending.productId,
                    user_nickname: pending.userNickname,
                    user_grade: pending.userGrade,
                    original_price: pending.originalPrice || 0,
                    sale_price: pending.salePrice || 0,
                    final_price: amount,
                    recipient_name: pending.recipientName,
                    recipient_phone: pending.phone,
                    address: pending.address,
                    address_detail: pending.addressDetail || '',
                    delivery_memo: pending.memo || '',
                    payment_key: paymentKey,
                    status: 'paid',
                };

                console.log('[PaymentSuccess] 주문 저장 시도:', orderPayload);

                const { data: savedOrder, error: saveError } = await createOrder(orderPayload);
                if (saveError) {
                    console.error('[PaymentSuccess] 주문 저장 에러:', saveError);
                    throw new Error('주문 저장에 실패했습니다: ' + (saveError.message || JSON.stringify(saveError)));
                }
                console.log('[PaymentSuccess] 주문 저장 성공:', savedOrder);

                // 재고 차감
                await decreaseStock(pending.productId);

                // 쿠폰 사용 기록
                if (pending.couponId && savedOrder?.id) {
                    await recordCouponUse(pending.couponId, pending.userNickname, savedOrder.id);
                }

                // pending 정보 제거
                localStorage.removeItem('moca_pending_order');

                setOrderInfo({
                    orderId,
                    productTitle: pending.productTitle,
                    finalPrice: amount,
                    recipientName: pending.recipientName,
                });
                setStatus('success');

            } catch (err) {
                console.error('[PaymentSuccess] 오류:', err);
                setErrorMsg(err.message || '결제 처리 중 오류가 발생했습니다.');
                setStatus('error');
            }
        };

        confirm();
    }, []);

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                <p className="text-white/60 font-bold">결제를 확인하는 중입니다...</p>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-5">
                    <span className="material-symbols-outlined text-5xl text-red-400">error</span>
                </div>
                <h2 className="text-white font-black text-2xl mb-2">결제 처리 실패</h2>
                <p className="text-white/50 text-sm mb-6">{errorMsg}</p>
                <button
                    onClick={() => navigate('/home/shop')}
                    className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black"
                >
                    쇼핑으로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-5xl text-emerald-400">check_circle</span>
                </div>
                <h2 className="text-white font-black text-2xl mb-2">결제 완료! 🎉</h2>
                <p className="text-white/50 text-sm mb-6">주문이 성공적으로 접수되었습니다.</p>

                {orderInfo && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2">
                        <InfoRow label="주문번호" value={orderInfo.orderId} />
                        <InfoRow label="상품" value={orderInfo.productTitle} />
                        <InfoRow label="결제금액" value={`${orderInfo.finalPrice.toLocaleString()}원`} highlight />
                        <InfoRow label="수령인" value={orderInfo.recipientName} />
                    </div>
                )}

                <button
                    onClick={() => navigate('/home/shop')}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black shadow-lg hover:opacity-90 transition-all"
                >
                    쇼핑 계속하기
                </button>
            </div>
        </div>
    );
};

const InfoRow = ({ label, value, highlight }) => (
    <div className="flex justify-between items-center">
        <span className="text-white/40 text-sm">{label}</span>
        <span className={`text-sm font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</span>
    </div>
);

export default PaymentSuccess;
