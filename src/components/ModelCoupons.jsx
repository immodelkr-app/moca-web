import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserGrade, getUser } from '../services/userService';
import { supabase } from '../services/supabaseClient';

const GRADE_ORDER = ['ALL', 'SILVER', 'GOLD', 'VIP', 'VVIP'];

const GRADE_COLORS = {
    SILVER: 'border-[#94A3B8]/50 text-[#94A3B8] bg-[#94A3B8]/10',
    GOLD: 'border-[#D4AF37]/50 text-[#D4AF37] bg-[#D4AF37]/10',
    VIP: 'border-[#A78BFA]/50 text-[#A78BFA] bg-[#A78BFA]/10',
    VVIP: 'border-[#F472B6]/50 text-[#F472B6] bg-[#F472B6]/10',
    ALL: 'border-[#6C63FF]/40 text-[#9B8AFB] bg-[#6C63FF]/10',
};

const ModelCoupons = () => {
    const navigate = useNavigate();
    const grade = getUserGrade();
    const user = getUser();

    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const userGradeIdx = GRADE_ORDER.indexOf(grade);
                const eligibleGrades = GRADE_ORDER.slice(0, userGradeIdx + 1);

                const { data, error } = await supabase
                    .from('shop_coupon_codes')
                    .select('*')
                    .eq('is_active', true)
                    .or(`target_grade.eq.ALL,${eligibleGrades.filter(g => g !== 'ALL').map(g => `target_grade.eq.${g}`).join(',')}`)
                    .order('created_at', { ascending: false });

                if (!error && data) setCoupons(data);
            } catch (err) {
                console.error('Failed to fetch coupons:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [grade]);

    const handleCopy = (coupon) => {
        navigator.clipboard.writeText(coupon.code).then(() => {
            setCopiedId(coupon.id);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    const formatDiscount = (coupon) => {
        if (coupon.discount_type === 'pct') return `${coupon.discount_value}%`;
        if (coupon.discount_type === 'amount') return `${coupon.discount_value.toLocaleString()}원`;
        return '';
    };

    const formatExpiry = (expiresAt) => {
        if (!expiresAt) return null;
        const d = new Date(expiresAt);
        return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} 까지`;
    };

    const isExpiringSoon = (expiresAt) => {
        if (!expiresAt) return false;
        const diff = new Date(expiresAt) - new Date();
        return diff > 0 && diff < 1000 * 60 * 60 * 24 * 3; // 3일 이내
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white pb-32">
            {/* Header */}
            <header className="flex items-center gap-4 p-5 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-10 border-b border-white/5">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-lg font-black">모카 에디트 쿠폰</h1>
                    <p className="text-xs text-white/40">{grade} 등급 사용 가능 쿠폰</p>
                </div>
            </header>

            <div className="p-5 max-w-2xl mx-auto">
                {/* 안내 */}
                <div className="mb-5 p-4 rounded-2xl bg-[#6C63FF]/10 border border-[#6C63FF]/20 flex items-start gap-3">
                    <span className="material-symbols-outlined text-[18px] text-[#818CF8] mt-0.5 flex-shrink-0">info</span>
                    <p className="text-white/60 text-xs leading-relaxed">
                        쿠폰 코드를 복사해서 모카 에디트 주문 시 입력하면 할인이 적용됩니다.
                    </p>
                </div>

                {/* 쿠폰 목록 */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : coupons.length === 0 ? (
                    <div className="text-center py-16">
                        <span className="material-symbols-outlined text-5xl text-white/20 mb-4 block">confirmation_number</span>
                        <p className="text-white/40 text-sm">현재 사용 가능한 쿠폰이 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {coupons.map(coupon => (
                            <div key={coupon.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                                <div className="flex">
                                    {/* 왼쪽 할인율 */}
                                    <div className="w-28 border-r border-dashed border-white/10 flex flex-col items-center justify-center p-4 flex-shrink-0 bg-gradient-to-b from-[#6C63FF]/10 to-[#A78BFA]/10">
                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">할인</p>
                                        <p className="font-black text-2xl text-[#A78BFA]">{formatDiscount(coupon)}</p>
                                        <p className="text-[10px] text-white/30 mt-1">OFF</p>
                                    </div>

                                    {/* 오른쪽 정보 */}
                                    <div className="flex-1 p-4 flex flex-col justify-between">
                                        <div>
                                            <p className="font-bold text-sm text-white leading-tight">{coupon.description || '모카 에디트 할인 쿠폰'}</p>
                                            <div className="flex flex-wrap gap-1.5 mt-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${GRADE_COLORS[coupon.target_grade] || GRADE_COLORS['ALL']}`}>
                                                    {coupon.target_grade === 'ALL' ? '전체 등급' : coupon.target_grade === 'VIP' ? '전속모델 이상' : `${coupon.target_grade} 이상`}
                                                </span>
                                                {coupon.min_price > 0 && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 text-white/40 bg-white/5">
                                                        {coupon.min_price.toLocaleString()}원 이상
                                                    </span>
                                                )}
                                                {coupon.expires_at && (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isExpiringSoon(coupon.expires_at) ? 'border-red-400/40 text-red-400 bg-red-400/10' : 'border-white/10 text-white/30 bg-white/5'}`}>
                                                        {formatExpiry(coupon.expires_at)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 쿠폰 코드 복사 */}
                                        <button
                                            onClick={() => handleCopy(coupon)}
                                            className={`mt-3 flex items-center justify-between px-3 py-2 rounded-xl border transition-all active:scale-[0.97] ${copiedId === coupon.id ? 'border-[#10B981]/50 bg-[#10B981]/10' : 'border-[#6C63FF]/30 bg-[#6C63FF]/10 hover:bg-[#6C63FF]/20'}`}
                                        >
                                            <span className="font-mono font-black tracking-widest text-sm text-white uppercase">{coupon.code}</span>
                                            <span className={`material-symbols-outlined text-[16px] ${copiedId === coupon.id ? 'text-[#10B981]' : 'text-[#818CF8]'}`}>
                                                {copiedId === coupon.id ? 'check_circle' : 'content_copy'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelCoupons;
