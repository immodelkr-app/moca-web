import React, { useState, useEffect } from 'react';
import { getUser } from '../services/userService';
import { supabase } from '../services/supabaseClient';

const GRADE_BADGE = {
    SILVER: { label: '🤍 SILVER', cls: 'bg-slate-400/20 text-slate-300 border-slate-400/30' },
    GOLD: { label: '👑 GOLD', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' },
    VIP: { label: '💜 전속모델', cls: 'bg-purple-500/20 text-purple-300 border-purple-400/30' },
    VVIP: { label: '🔥 VVIP', cls: 'bg-pink-500/20 text-pink-300 border-pink-400/30' },
};

const MocaShop = () => {
    const user = getUser();
    const userGrade = user?.grade || 'SILVER';

    const [loading, setLoading] = useState(true);
    const [coupons, setCoupons] = useState([]);
    const [copiedId, setCopiedId] = useState(null);

    const gradeBadge = GRADE_BADGE[userGrade] || GRADE_BADGE.SILVER;

    // ── 쿠폰 로드 ──────────────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            setLoading(true);

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

    return (
        <div className="min-h-screen pb-24" style={{backgroundColor:'var(--moca-bg)'}}>
            {/* ── 헤더 배너 ─────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#EDE8FF] via-[#F3F0FF] to-[#E8F0FF] border-b border-[#E8E0FA]">
                <div className="relative px-4 pt-6 pb-5">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-orange-400 text-xl">🎁</span>
                                <h1 className="text-[#1F1235] font-black text-xl tracking-tight">MOCA 혜택</h1>
                            </div>
                            <p className="text-[#5B4E7A] text-xs font-bold">모카 멤버 전용 혜택</p>
                        </div>
                        <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1 text-xs font-bold ${gradeBadge.cls}`}>
                            {gradeBadge.label}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 콘텐츠 ───────────────────────────────────────────────── */}
            <div className="px-3 pt-4">
                {loading ? (
                    <div className="animate-pulse bg-[#F3E8FF] h-32 rounded-2xl border border-[#E8E0FA]"></div>
                ) : (
                    <GradeInfoBanner userGrade={userGrade} coupons={coupons} copiedId={copiedId} onCopy={handleCopyCoupon} />
                )}
            </div>
        </div>
    );
};

// ── 서브 컴포넌트 ──────────────────────────────────────────────────────────────
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
        <div className="bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl p-4">
            <h3 className="text-[#5B4E7A] text-xs font-bold mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#9333EA]">confirmation_number</span>
                내 등급 전용 쿠폰
            </h3>

            {coupons.length === 0 ? (
                <div className="text-center py-4">
                    <p className="text-[#9CA3AF] text-xs text-center">현재 사용 가능한 쿠폰이 없습니다.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {coupons.map(coupon => (
                        <div key={coupon.id} className="flex items-center gap-3 bg-white border border-[#E8E0FA] rounded-xl px-3 py-2.5">
                            <div className="w-12 flex-shrink-0 text-center">
                                <p className="font-black text-base text-[#A78BFA]">{formatDiscount(coupon)}</p>
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-[#1F1235] text-xs font-bold truncate">{coupon.description || '멤버 쿠폰'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${GRADE_COLORS[coupon.target_grade] || GRADE_COLORS['ALL']}`}>
                                        {coupon.target_grade === 'ALL' ? '전체' : coupon.target_grade === 'VIP' ? '전속모델+' : `${coupon.target_grade}+`}
                                    </span>
                                    {coupon.min_price > 0 && (
                                        <span className="text-[9px] text-[#9CA3AF]">{coupon.min_price.toLocaleString()}원 이상</span>
                                    )}
                                    {coupon.expires_at && (
                                        <span className="text-[9px] text-[#9CA3AF]">{formatExpiry(coupon.expires_at)}</span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => onCopy(coupon)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all flex-shrink-0 ${copiedId === coupon.id ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-[#9333EA]/30 bg-[#F3E8FF] hover:bg-[#EDE8FF] active:scale-95'}`}
                            >
                                <span className={`font-mono font-black text-xs uppercase ${copiedId === coupon.id ? 'text-emerald-600' : 'text-[#7C3AED]'}`}>{coupon.code}</span>
                                <span className={`material-symbols-outlined text-[13px] ${copiedId === coupon.id ? 'text-emerald-600' : 'text-[#7C3AED]'}`}>
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
