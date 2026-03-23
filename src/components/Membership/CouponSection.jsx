import React, { useState, useEffect } from 'react';
import { fetchCoupons, fetchUserCoupons, recordUsedCoupon } from '../../services/adminService';
import { getUser } from '../../services/userService';

// 매장구분에 따른 고유 PIN (하드코딩)
const PIN_MAP = {
    'hair_makeup': '4521',
    'studio': '9674',
    'skincare': '2026',
    'cafe': '1416'
};

const initialCoupons = [
    {
        id: 1,
        title: '신규가입 웰컴 드링크',
        partner: '스타벅스 / 투썸플레이스 등',
        category: 'cafe',
        type: '1회성',
        isUsed: false,
        expiry: '2026.12.31'
    },
    {
        id: 2,
        title: '프로필 1회 무료 촬영권',
        partner: '지정 스튜디오',
        category: 'studio',
        type: '1회성',
        isUsed: false,
        expiry: '2026.06.30'
    },
    {
        id: 3,
        title: '헤어/메이크업 30% 할인',
        partner: 'MOCA 제휴 샵 전체',
        category: 'hair_makeup',
        type: '1회성',
        isUsed: true,
        expiry: '2026.03.15'
    }
];

const CATEGORY_NAMES = {
    'hair_makeup': '헤어/메이크업 관련 제휴처',
    'studio': '스튜디오 제휴처',
    'skincare': '에스테틱 제휴처',
    'cafe': '카페 제휴처',
};

const CouponSection = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCoupon, setSelectedCoupon] = useState(null);
    const [pinInput, setPinInput] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const user = getUser();
    const userNickname = user?.nickname || user?.name || '';
    const userGrade = user?.grade || 'SILVER';

    useEffect(() => {
        const loadCoupons = async () => {
            try {
                const [allCouponsRes, usageHistoryRes] = await Promise.all([
                    fetchCoupons(),
                    fetchUserCoupons(userNickname)
                ]);

                if (allCouponsRes.error) throw allCouponsRes.error;

                const usageMap = {};
                (usageHistoryRes.data || []).forEach(record => {
                    usageMap[record.coupon_id] = record.is_used;
                });

                const availableCoupons = (allCouponsRes.data || [])
                    .filter(c => c.target_grade === 'ALL' || c.target_grade === userGrade)
                    .map(c => ({
                        ...c,
                        partner: CATEGORY_NAMES[c.category] || 'MOCA 제휴 혜택',
                        isUsed: !!usageMap[c.id],
                        expiry: '상시 발급 (기간무관)'
                    }));

                if (availableCoupons.length > 0) {
                    setCoupons(availableCoupons);
                } else {
                    setCoupons(initialCoupons);
                }
            } catch (err) {
                console.warn('Failed to load DB coupons, using fallback', err);
                setCoupons(initialCoupons);
            } finally {
                setLoading(false);
            }
        };

        if (userNickname) {
            loadCoupons();
        } else {
            setCoupons(initialCoupons);
            setLoading(false);
        }
    }, [userNickname, userGrade]);

    const handleUseClick = (coupon) => {
        if (coupon.isUsed) return;
        setSelectedCoupon(coupon);
        setPinInput('');
        setErrorMsg('');
    };

    const handlePinSubmit = async () => {
        if (!selectedCoupon) return;

        // DB 핀코드 혹은 기본 PIN
        const correctPin = selectedCoupon.pin_code || PIN_MAP[selectedCoupon.category];

        if (pinInput === correctPin) {
            try {
                if (selectedCoupon.id && typeof selectedCoupon.id === 'string') {
                    await recordUsedCoupon(userNickname, selectedCoupon.id);
                }
                setCoupons(prev => prev.map(c => c.id === selectedCoupon.id ? { ...c, isUsed: true } : c));
                setSelectedCoupon(null);
            } catch (err) {
                setErrorMsg('요청 처리 중 오류가 발생했습니다.');
            }
        } else {
            setErrorMsg('비밀번호가 일치하지 않습니다.');
        }
    };

    return (
        <div className="w-full">
            <h3 className="text-xl font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#818CF8]">local_activity</span>
                내 바우처
            </h3>

            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
            ) : coupons.length === 0 ? (
                <div className="py-12 text-center text-white/40 flex flex-col items-center gap-2 border border-white/5 rounded-2xl bg-white/5">
                    <span className="material-symbols-outlined text-4xl">loyalty</span>
                    <p>사용 가능한 바우처가 없습니다.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {coupons.map(coupon => (
                        <div
                            key={coupon.id}
                            className={`relative rounded-2xl border transition-all overflow-hidden ${coupon.isUsed
                                ? 'bg-white/5 border-white/10 opacity-60'
                                : 'bg-gradient-to-r from-white/10 to-transparent border-[#818CF8]/30 hover:border-[#818CF8]/60 cursor-pointer'
                                }`}
                            onClick={() => handleUseClick(coupon)}
                        >
                            <div className="p-4 flex justify-between items-center">
                                <div className="flex-1">
                                    <div className="text-[10px] font-bold text-[#818CF8] mb-1">{coupon.partner}</div>
                                    <div className={`text-lg font-bold mb-1 ${coupon.isUsed ? 'text-white/50 line-through' : 'text-white'}`}>
                                        {coupon.title}
                                    </div>
                                    <div className="text-xs text-white/40">
                                        유효기간: {coupon.expiry}
                                    </div>
                                </div>

                                <div className="flex flex-col items-center justify-center shrink-0 ml-4 border-l border-white/10 pl-4">
                                    {coupon.isUsed ? (
                                        <>
                                            <span className="material-symbols-outlined text-white/30 text-3xl mb-1">check_circle</span>
                                            <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">사용완료</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 bg-[#818CF8]/20 rounded-full flex items-center justify-center mb-1 hover:bg-[#818CF8]/40 transition-colors">
                                                <span className="material-symbols-outlined text-[#818CF8]">touch_app</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-[#818CF8] tracking-widest uppercase">직원확인</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Used overlay tint */}
                            {coupon.isUsed && (
                                <div className="absolute inset-0 bg-black/40 pointer-events-none"></div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* PIN 입력 모달 */}
            {selectedCoupon && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-[#1a1a24] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
                        <button
                            className="absolute top-4 right-4 text-white/40 hover:text-white"
                            onClick={() => setSelectedCoupon(null)}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-[#818CF8]/20 text-[#818CF8] rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl">lock</span>
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">매장 직원 확인</h4>
                            <p className="text-sm text-white/60">
                                <span className="text-[#818CF8] font-bold">{selectedCoupon.partner}</span> 직원 전용입니다.<br />
                                직원이 확인 코드를 입력합니다.
                            </p>
                        </div>

                        <div className="mb-4">
                            <input
                                type="password"
                                value={pinInput}
                                onChange={(e) => setPinInput(e.target.value)}
                                placeholder="비밀번호(PIN) 4자리"
                                className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-white/20 focus:outline-none focus:border-[#818CF8] transition-colors"
                                maxLength={4}
                                autoFocus
                            />
                            {errorMsg && (
                                <p className="text-red-400 text-sm mt-2 text-center animate-pulse">{errorMsg}</p>
                            )}
                        </div>

                        <button
                            onClick={handlePinSubmit}
                            className="w-full bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all text-lg"
                        >
                            사용 확인
                        </button>
                        <p className="text-[10px] text-white/30 text-center mt-4">
                            고객님이 직접 입력하실 경우 사용 혜택이 사라질 수 있습니다.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CouponSection;
