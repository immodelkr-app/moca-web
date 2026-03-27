import React, { useState, useCallback } from 'react';
import CountdownTimer from './CountdownTimer';
import { canAccessProduct } from '../../services/shopService';

const GRADE_COLORS = {
    SILVER: { badge: 'text-slate-500 bg-slate-100 border-slate-200', glow: 'shadow-slate-400/5' },
    GOLD: { badge: 'text-amber-600 bg-amber-50 border-amber-200', glow: 'shadow-amber-400/5' },
    VIP: { badge: 'text-purple-600 bg-purple-50 border-purple-200', glow: 'shadow-purple-400/10' },
    VVIP: { badge: 'text-pink-600 bg-pink-50 border-pink-200', glow: 'shadow-pink-400/10' },
};

const BADGE_STYLES = {
    BEST: 'bg-orange-500 text-white',
    HOT: 'bg-red-500 text-white',
    NEW: 'bg-emerald-500 text-white',
    '전속모델 전용': 'bg-purple-600 text-white',
    'VIP 전용': 'bg-purple-600 text-white',
    'VVIP 얼리버드': 'bg-gradient-to-r from-pink-600 to-rose-500 text-white',
};

const PLACEHOLDER_GRADIENTS = [
    'from-[#F3E8FF] to-[#E8E0FA]',
    'from-[#EBF5FF] to-[#DBEAFE]',
    'from-[#F0FDF4] to-[#DCFCE7]',
    'from-[#FFF1F2] to-[#FFE4E6]',
];

const FlashDealCard = ({ product, userGrade, onBuyClick, onDetailClick, index = 0 }) => {
    const [expired, setExpired] = useState(false);

    const salePrice = product.sale_price;
    const { access, reason } = canAccessProduct(product, userGrade);
    const discountPct = Math.round((1 - salePrice / product.original_price) * 100);

    const handleExpire = useCallback(() => setExpired(true), []);

    const isSoldOut = product.stock <= 0;
    const isEnded = expired || reason === 'ended';
    const gradientClass = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length];
    const gradeColor = GRADE_COLORS[userGrade] || GRADE_COLORS.SILVER;

    return (
        <div className={`
            relative flex flex-col rounded-2xl overflow-hidden border
            transition-all duration-300 group
            ${isEnded || isSoldOut
                ? 'border-[#E8E0FA] opacity-60'
                : 'border-[#E8E0FA] hover:border-[#9333EA]/30 hover:shadow-xl hover:-translate-y-0.5 ' + gradeColor.glow}
            bg-white
        `}>
            {/* 상품 이미지 — 클릭 시 상세 팝업 열기 */}
            <div
                className={`relative w-full aspect-square bg-gradient-to-br ${gradientClass} overflow-hidden ${!isSoldOut && !isEnded ? 'cursor-pointer' : ''}`}
                onClick={() => {
                    if (isSoldOut || isEnded) return;
                    onDetailClick?.(product);
                }}
            >
                {product.image_url ? (
                    <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-5xl text-white/20">storefront</span>
                        <span className="text-white/20 text-xs px-4 text-center">{product.title}</span>
                    </div>
                )}

                {/* 뱃지 */}
                {product.badge && (
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide ${BADGE_STYLES[product.badge] || 'bg-gray-600 text-white'}`}>
                        {product.badge}
                    </div>
                )}

                {/* 상세 보기 버튼 */}
                {product.detail_content && !isSoldOut && !isEnded && (
                    <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm border border-[#E8E0FA] rounded-lg px-2 py-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[#1F1235]/60 text-xs">search</span>
                        <span className="text-[#1F1235]/60 text-[10px] font-bold">상세보기</span>
                    </div>
                )}

                {/* 매진 / 종료 오버레이 */}
                {(isSoldOut || isEnded) && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="bg-black/80 border border-white/20 rounded-xl px-4 py-2 text-center">
                            <span className="text-white font-black text-lg">{isSoldOut ? '🚫 매진' : '⏰ 판매종료'}</span>
                        </div>
                    </div>
                )}

                {/* 재고 긴박감 */}
                {!isSoldOut && !isEnded && product.stock <= 3 && (
                    <div className="absolute bottom-2 left-2 bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                        잔여 {product.stock}개
                    </div>
                )}
            </div>


            {/* 상품 정보 */}
            <div className="flex flex-col flex-1 p-3 gap-2">
                {/* 상품명 */}
                <div>
                    <p className="text-[#1F1235] font-black text-[13px] leading-snug line-clamp-2">{product.title}</p>
                    {product.subtitle && (
                        <p className="text-[#9CA3AF] text-[11px] mt-0.5 line-clamp-1">{product.subtitle}</p>
                    )}
                </div>

                {/* 가격 정보 */}
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-[#9CA3AF] text-[11px] line-through">
                            {product.original_price.toLocaleString()}원
                        </span>
                        <span className="text-orange-500 text-[11px] font-bold">
                            -{Math.round((1 - product.sale_price / product.original_price) * 100)}%
                        </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[#1F1235] font-black text-base">
                            {salePrice.toLocaleString()}
                        </span>
                        <span className="text-[#5B4E7A] text-xs">원</span>
                    </div>
                </div>

                {/* 카운트다운 */}
                {!isEnded && !isSoldOut && (
                    <div className="bg-[#F8F5FF] rounded-xl p-2 border border-[#E8E0FA]">
                        <p className="text-[#9CA3AF] text-[9px] mb-1.5 text-center">⏱ 판매 종료까지</p>
                        <div className="flex justify-center">
                            <CountdownTimer
                                targetDate={product.sale_end}
                                onExpire={handleExpire}
                                variant="block"
                            />
                        </div>
                    </div>
                )}

                {/* 구매 버튼 */}
                <button
                    onClick={() => {
                        if (!access || isSoldOut || isEnded) return;
                        onDetailClick?.(product);
                    }}
                    disabled={!access || isSoldOut || isEnded}
                    className={`
                        w-full py-2.5 rounded-xl font-black text-[13px] transition-all duration-200 mt-auto
                        ${access && !isSoldOut && !isEnded
                            ? 'bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-white hover:opacity-90 active:scale-95 shadow-lg shadow-purple-500/20'
                            : 'bg-[#F3E8FF] text-[#7C3AED]/40 cursor-not-allowed'}
                    `}
                >
                    {isSoldOut ? '매진' : isEnded ? '판매종료' : reason === 'early_only' ? '🔒 VVIP 얼리버드' : '구매하기'}
                </button>
            </div>
        </div>
    );
};

export default FlashDealCard;
