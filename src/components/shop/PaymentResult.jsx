import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentResult = ({ status, orderInfo, onRetry }) => {
    const navigate = useNavigate();
    const isSuccess = status === 'success';

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-[#080810] p-4">
            <div className="w-full max-w-sm text-center">
                {/* 아이콘 */}
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${isSuccess ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    <span className={`material-symbols-outlined text-5xl ${isSuccess ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isSuccess ? 'check_circle' : 'error'}
                    </span>
                </div>

                {/* 상태 메시지 */}
                <h2 className="text-white font-black text-2xl mb-2">
                    {isSuccess ? '결제 완료! 🎉' : '결제 실패'}
                </h2>
                <p className="text-white/50 text-sm mb-6">
                    {isSuccess
                        ? '주문이 성공적으로 접수되었습니다.'
                        : '결제 중 오류가 발생했습니다. 다시 시도해주세요.'}
                </p>

                {/* 주문 정보 (성공 시) */}
                {isSuccess && orderInfo && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2">
                        <InfoRow label="주문번호" value={orderInfo.orderId || '-'} />
                        <InfoRow label="상품" value={orderInfo.productTitle} />
                        <InfoRow label="결제금액" value={`${(orderInfo.finalPrice || 0).toLocaleString()}원`} highlight />
                        <InfoRow label="수령인" value={orderInfo.recipientName} />
                    </div>
                )}

                {/* 버튼 */}
                <div className="space-y-3">
                    {isSuccess ? (
                        <button
                            onClick={() => navigate('/home/shop')}
                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black shadow-lg hover:opacity-90 transition-all"
                        >
                            쇼핑 계속하기
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={onRetry}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black shadow-lg hover:opacity-90 transition-all"
                            >
                                다시 시도
                            </button>
                            <button
                                onClick={() => navigate('/home/shop')}
                                className="w-full py-3 rounded-2xl border border-white/15 text-white/60 text-sm"
                            >
                                돌아가기
                            </button>
                        </>
                    )}
                </div>
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

export default PaymentResult;
