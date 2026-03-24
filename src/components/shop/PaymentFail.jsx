import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentFail = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const code = searchParams.get('code') || '';
    const message = searchParams.get('message') || '결제가 취소되었거나 실패했습니다.';

    return (
        <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm text-center">
                <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-5xl text-red-400">
                        {code === 'USER_CANCEL' ? 'cancel' : 'error'}
                    </span>
                </div>
                <h2 className="text-white font-black text-2xl mb-2">
                    {code === 'USER_CANCEL' ? '결제를 취소했습니다' : '결제가 실패했습니다'}
                </h2>
                <p className="text-white/50 text-sm mb-2">{message}</p>
                {code && <p className="text-white/20 text-xs mb-6">오류코드: {code}</p>}

                <div className="space-y-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black shadow-lg hover:opacity-90 transition-all"
                    >
                        다시 시도하기
                    </button>
                    <button
                        onClick={() => navigate('/home/shop')}
                        className="w-full py-3 rounded-2xl border border-white/15 text-white/60 text-sm hover:bg-white/5 transition-colors"
                    >
                        쇼핑으로 돌아가기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentFail;
