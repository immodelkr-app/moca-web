import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';

const GRADE_BADGE = {
    SILVER: { label: '🤍 SILVER', cls: 'bg-slate-400/20 text-slate-300 border-slate-400/30' },
    GOLD: { label: '👑 GOLD', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' },
    VIP: { label: '💜 전속모델', cls: 'bg-purple-500/20 text-purple-300 border-purple-400/30' },
    VVIP: { label: '🔥 VVIP', cls: 'bg-pink-500/20 text-pink-300 border-pink-400/30' },
};

const BenefitsHub = () => {
    const navigate = useNavigate();
    const user = getUser();
    const userGrade = user?.grade || 'SILVER';
    const gradeBadge = GRADE_BADGE[userGrade] || GRADE_BADGE.SILVER;

    const cards = [
        {
            id: 'shop',
            emoji: '🔥',
            title: 'M뷰티&쇼핑',
            subtitle: '모카 에디트 · 멤버 전용 셀렉 상품',
            gradient: 'from-[#FF416C] to-[#FF4B2B]', // 고급스러운 로즈-레드 골드 톤
            glowColor: 'shadow-[#FF416C]/30',
            badge: 'LIVE',
            badgeCls: 'bg-red-500 text-white animate-pulse',
            path: '/home/shop',
            wide: true,
        },
        {
            id: 'coupons',
            emoji: '🎟',
            title: '모델 할인쿠폰',
            subtitle: '등급별 전용 바우처 · 제휴 매장 즉시 사용',
            gradient: 'from-[#6C63FF] to-[#4F46E5]', // 모카앱 시그니처 퍼플 딥 톤
            glowColor: 'shadow-[#6C63FF]/30',
            badge: null,
            path: '/home/coupons',
            wide: true,
        },
        {
            id: 'affiliates',
            emoji: '🏪',
            title: '모카 제휴혜택',
            subtitle: '헤어 · 메이크업 · 스튜디오 · 에스테틱 제휴 혜택',
            gradient: 'from-[#0F766E] to-[#042F2E]', // 딥 에메랄드 (무게감 있는 고급 제휴 그린)
            glowColor: 'shadow-[#0F766E]/30',
            badge: null,
            path: '/home/content',
            wide: true,
        },
    ];

    return (
        <div className="min-h-screen bg-[#080810] pb-28">
            {/* ── 헤더 ─────────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#14102a] via-[#0f0f20] to-[#1a0c30] border-b border-white/10 px-4 pt-6 pb-5">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl" />
                <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-pink-600/10 rounded-full blur-3xl" />
                <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">💎</span>
                            <h1 className="text-white font-black text-xl tracking-tight">혜택 & 쇼핑</h1>
                        </div>
                        <div className={`text-xs font-bold border rounded-full px-3 py-1 ${gradeBadge.cls}`}>
                            {gradeBadge.label}
                        </div>
                    </div>
                    <p className="text-white/40 text-xs pl-9">모카앱 멤버 전용 · M뷰티&쇼핑 + 쿠폰 + 제휴사</p>
                </div>
            </div>

            {/* ── 배너 리스트 (모 모두 세로 한줄 가로형) ────────────────────────────────────────────────── */}
            <div className="px-4 pt-5 flex flex-col gap-3">
                {cards.map(card => (
                    <button
                        key={card.id}
                        onClick={() => navigate(card.path)}
                        className={`
                            relative group w-full flex items-center justify-between overflow-hidden
                            rounded-2xl px-5 py-5 text-left
                            bg-gradient-to-r ${card.gradient}
                            shadow-xl ${card.glowColor}
                            hover:scale-[1.02] active:scale-[0.98] transition-all duration-300
                            border border-white/5
                        `}
                    >
                        {/* 배경 도트/패턴 */}
                        <div className="absolute inset-0 opacity-10"
                            style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

                        {/* LIVE 뱃지 */}
                        {card.badge && (
                            <span className={`absolute top-4 right-4 text-[10px] font-black px-2 py-0.5 rounded-full z-20 ${card.badgeCls}`}>
                                {card.badge}
                            </span>
                        )}

                        <div className="flex items-center gap-4 relative z-10">
                            {/* 아이콘 컨테이너 */}
                            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl backdrop-blur-md border border-white/30 shrink-0 shadow-inner">
                                {card.emoji}
                            </div>

                            {/* 텍스트 정보 */}
                            <div className="pr-4">
                                <h2 className="text-white font-black text-[17px] tracking-tight mb-0.5">{card.title}</h2>
                                <p className="text-white/70 text-[11px] leading-tight font-medium">{card.subtitle}</p>
                            </div>
                        </div>

                        {/* 화살표 아이콘 */}
                        <div className="w-8 h-8 bg-black/10 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors shrink-0 relative z-10 border border-white/10">
                            <span className="material-symbols-outlined text-white text-sm">arrow_forward</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default BenefitsHub;
