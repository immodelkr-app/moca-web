import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';

const GRADE_BADGE = {
    SILVER: { label: '🤍 SILVER', cls: 'bg-[#F8F5FF] text-[#5B4E7A] border-[#E8E0FA]' },
    GOLD:   { label: '👑 GOLD',   cls: 'bg-[#FFF8E1] text-[#D97706] border-[#F5E6A3]' },
    VIP:    { label: '💜 전속모델', cls: 'bg-[#F3E8FF] text-[#7C3AED] border-[#E8D5FF]' },
    VVIP:   { label: '🔥 VVIP',   cls: 'bg-[#FFF0F6] text-[#DB2777] border-[#FBD5E7]' },
};

const cards = [
    {
        id: 'shop',
        icon: 'local_fire_department',
        iconBg: 'bg-gradient-to-br from-orange-400 to-rose-500',
        title: 'M뷰티&쇼핑',
        subtitle: '모카 에디트 · 멤버 전용 셀렉 상품',
        accentColor: 'text-orange-500',
        accentBg: 'bg-orange-50 border-orange-100',
        badge: 'LIVE',
        badgeCls: 'bg-red-500 text-white',
        path: '/home/shop',
    },
    {
        id: 'coupons',
        icon: 'local_activity',
        iconBg: 'bg-gradient-to-br from-[#9333EA] to-[#C084FC]',
        title: '모델 할인쿠폰',
        subtitle: '등급별 전용 바우처 · 제휴 매장 즉시 사용',
        accentColor: 'text-[#9333EA]',
        accentBg: 'bg-[#F3E8FF] border-[#E8E0FA]',
        badge: null,
        path: '/home/coupons',
    },
    {
        id: 'affiliates',
        icon: 'store',
        iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
        title: '모카 제휴혜택',
        subtitle: '헤어 · 메이크업 · 스튜디오 · 에스테틱 할인',
        accentColor: 'text-emerald-600',
        accentBg: 'bg-emerald-50 border-emerald-100',
        badge: null,
        path: '/home/content',
    },
];

const BenefitsHub = () => {
    const navigate = useNavigate();
    const user = getUser();
    const userGrade = user?.grade || 'SILVER';
    const gradeBadge = GRADE_BADGE[userGrade] || GRADE_BADGE.SILVER;

    return (
        <div className="min-h-screen pb-28" style={{ backgroundColor: 'var(--moca-bg)' }}>

            {/* ── 상단 헤더 배너 ── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#EDE8FF] via-[#F3F0FF] to-[#E8F0FF] border-b border-[#E8E0FA] px-5 pt-6 pb-5">
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-[#9333EA]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#C084FC]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">💎</span>
                            <h1 className="text-[#1F1235] font-black text-xl tracking-tight">혜택 &amp; 쇼핑</h1>
                        </div>
                        <p className="text-xs text-[#9CA3AF] font-medium pl-9">모카앱 멤버 전용 · 쇼핑 + 쿠폰 + 제휴혜택</p>
                    </div>
                    {/* 등급 뱃지 */}
                    <div className={`flex-shrink-0 text-xs font-black border rounded-full px-3 py-1.5 ${gradeBadge.cls}`}>
                        {gradeBadge.label}
                    </div>
                </div>
            </div>

            {/* ── 카드 리스트 ── */}
            <div className="px-4 pt-5 flex flex-col gap-3">
                {cards.map(card => (
                    <button
                        key={card.id}
                        onClick={() => navigate(card.path)}
                        className="relative group w-full bg-white border border-[#E8E0FA] rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:shadow-[#9333EA]/10 hover:border-[#9333EA]/25 active:scale-[0.98] transition-all duration-200 text-left"
                    >
                        <div className="flex items-center gap-4 px-5 py-4">
                            {/* 아이콘 */}
                            <div className={`w-14 h-14 ${card.iconBg} rounded-2xl flex items-center justify-center shrink-0 shadow-md`}>
                                <span className="material-symbols-outlined text-white text-[26px] fill-1">{card.icon}</span>
                            </div>

                            {/* 텍스트 */}
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h2 className="text-[#1F1235] font-black text-[17px] tracking-tight">{card.title}</h2>
                                    {card.badge && (
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse ${card.badgeCls}`}>
                                            {card.badge}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[#5B4E7A] text-xs font-medium leading-relaxed">{card.subtitle}</p>
                            </div>

                            {/* 화살표 */}
                            <div className="w-9 h-9 rounded-xl bg-[#F8F5FF] border border-[#E8E0FA] flex items-center justify-center shrink-0 group-hover:bg-[#F3E8FF] group-hover:border-[#9333EA]/20 transition-colors">
                                <span className="material-symbols-outlined text-[#9333EA] text-[18px]">arrow_forward</span>
                            </div>
                        </div>

                        {/* 하단 포인트 바 */}
                        <div className={`h-0.5 w-full ${card.accentBg} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </button>
                ))}
            </div>

            {/* ── 안내 문구 ── */}
            <div className="px-4 mt-5">
                <div className="bg-white border border-[#E8E0FA] rounded-2xl p-4 flex items-start gap-3 shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-[#F3E8FF] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[#9333EA] text-[18px]">info</span>
                    </div>
                    <div>
                        <p className="text-[#1F1235] text-xs font-black mb-0.5">멤버십 등급에 따라 혜택이 달라져요</p>
                        <p className="text-[#9CA3AF] text-[11px] leading-relaxed">SILVER · GOLD · VIP · VVIP 등급별 전용 혜택이 제공됩니다.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BenefitsHub;
