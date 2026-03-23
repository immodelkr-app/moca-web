import React, { useState } from 'react';
import { verifyCouponCode } from '../../services/shopService';

const OrderModal = ({ product, userGrade, userNickname, onClose, onConfirm }) => {
    const [form, setForm] = useState({
        recipientName: '',
        phone: '',
        address: '',
        addressDetail: '',
        memo: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    // 쿠폰 상태
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState(null); // { coupon, discountAmount, finalPrice }
    const [couponError, setCouponError] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);

    const basePrice = product.sale_price;
    const finalPrice = appliedCoupon ? appliedCoupon.finalPrice : basePrice;
    const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    // 쿠폰 적용
    const handleApplyCoupon = async () => {
        if (!couponInput.trim()) {
            setCouponError('쿠폰 코드를 입력해주세요.');
            return;
        }
        setCouponLoading(true);
        setCouponError('');
        setAppliedCoupon(null);

        const result = await verifyCouponCode(couponInput, userGrade, basePrice);
        if (result.error) {
            setCouponError(result.error.message);
        } else {
            setAppliedCoupon(result);
            setCouponInput(result.coupon.code); // 정규화된 코드로 교체
        }
        setCouponLoading(false);
    };

    // 쿠폰 취소
    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponInput('');
        setCouponError('');
    };

    const validate = () => {
        const newErrors = {};
        if (!form.recipientName.trim()) newErrors.recipientName = '수령인 이름을 입력해주세요';
        if (!form.phone.trim() || !/^01[0-9]{8,9}$/.test(form.phone.replace(/-/g, '')))
            newErrors.phone = '올바른 휴대폰 번호를 입력해주세요';
        if (!form.address.trim()) newErrors.address = '주소를 입력해주세요';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;
        setLoading(true);
        await onConfirm({
            product,
            form,
            finalPrice,
            couponCode: appliedCoupon?.coupon?.code || null,
            couponId: appliedCoupon?.coupon?.id || null,
            couponDiscount: discountAmount,
            userGrade,
            userNickname,
        });
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md bg-[#0f0f1a] border border-white/15 rounded-t-3xl p-5 pb-8 max-h-[92vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* 핸들 */}
                <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

                {/* 헤더 */}
                <div className="flex items-center gap-2 mb-5">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-purple-400">shopping_bag</span>
                    </div>
                    <div>
                        <h3 className="text-white font-black text-base">주문서 작성</h3>
                        <p className="text-white/40 text-xs line-clamp-1">{product.title}</p>
                    </div>
                    <button onClick={onClose} className="ml-auto text-white/40 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* 금액 요약 */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 mb-4 space-y-2">
                    <Row label="정가" value={`${product.original_price.toLocaleString()}원`} muted />
                    <Row label="특가" value={`${basePrice.toLocaleString()}원`} highlight="orange" />
                    {appliedCoupon && (
                        <Row
                            label={`쿠폰 (${appliedCoupon.coupon.code})`}
                            value={`-${discountAmount.toLocaleString()}원`}
                            highlight="purple"
                        />
                    )}
                    <div className="border-t border-white/10 pt-2 flex justify-between items-center">
                        <span className="text-white/60 text-sm">최종 결제금액</span>
                        <span className="text-white font-black text-xl">{finalPrice.toLocaleString()}원</span>
                    </div>
                </div>

                {/* 쿠폰 코드 입력 */}
                <div className="mb-5">
                    {appliedCoupon ? (
                        // 적용된 쿠폰 표시
                        <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-xl px-4 py-3">
                            <span className="text-purple-400 text-lg">🎟</span>
                            <div className="flex-1">
                                <p className="text-purple-300 font-black text-sm">{appliedCoupon.coupon.code}</p>
                                <p className="text-purple-400/60 text-xs">{appliedCoupon.coupon.description}</p>
                            </div>
                            <span className="text-purple-300 font-black text-sm">-{discountAmount.toLocaleString()}원</span>
                            <button
                                type="button"
                                onClick={handleRemoveCoupon}
                                className="text-white/30 hover:text-red-400 transition-colors ml-1"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    ) : (
                        // 쿠폰 입력 폼
                        <div>
                            <label className="text-white/50 text-xs mb-1.5 block flex items-center gap-1">
                                <span>🎟</span> 쿠폰 코드 <span className="text-white/20">(선택)</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={couponInput}
                                    onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                    placeholder="쿠폰 코드 입력 (예: MOCA10)"
                                    className="flex-1 bg-black/40 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-500/60 transition-colors tracking-widest uppercase"
                                />
                                <button
                                    type="button"
                                    onClick={handleApplyCoupon}
                                    disabled={couponLoading}
                                    className="px-4 py-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 text-sm font-bold hover:bg-purple-500/30 transition-all disabled:opacity-50 whitespace-nowrap"
                                >
                                    {couponLoading ? '확인 중...' : '적용'}
                                </button>
                            </div>
                            {couponError && (
                                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">error</span>
                                    {couponError}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* 배송지 입력 */}
                <div className="space-y-3 mb-5">
                    <h4 className="text-white/70 text-sm font-bold">배송지 정보</h4>
                    <Field label="수령인 이름" name="recipientName" value={form.recipientName} onChange={handleChange} error={errors.recipientName} placeholder="홍길동" />
                    <Field label="휴대폰 번호" name="phone" type="tel" value={form.phone} onChange={handleChange} error={errors.phone} placeholder="010-0000-0000" />
                    <Field label="주소" name="address" value={form.address} onChange={handleChange} error={errors.address} placeholder="도로명 주소" />
                    <Field label="상세 주소" name="addressDetail" value={form.addressDetail} onChange={handleChange} placeholder="상세 주소 (선택)" />
                    <Field label="배송 메모" name="memo" value={form.memo} onChange={handleChange} placeholder="경비실 앞에 놔주세요 (선택)" />
                </div>

                {/* 결제 버튼 */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black text-base shadow-lg shadow-purple-500/25 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            처리 중...
                        </span>
                    ) : (
                        `토스페이먼츠로 ${finalPrice.toLocaleString()}원 결제`
                    )}
                </button>

                <p className="text-center text-white/25 text-[10px] mt-3">
                    결제 진행 시 개인정보 제3자 제공에 동의한 것으로 간주됩니다.
                </p>
            </div>
        </div>
    );
};

const Row = ({ label, value, muted, highlight }) => (
    <div className="flex justify-between items-center text-sm">
        <span className={muted ? 'text-white/40' : 'text-white/70'}>{label}</span>
        <span className={
            highlight === 'orange' ? 'text-orange-400 font-bold' :
                highlight === 'purple' ? 'text-purple-400 font-bold' :
                    muted ? 'text-white/40 line-through' : 'text-white font-bold'
        }>{value}</span>
    </div>
);

const Field = ({ label, name, value, onChange, error, placeholder, type = 'text' }) => (
    <div>
        <label className="text-white/50 text-xs mb-1 block">{label}</label>
        <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none transition-colors ${error ? 'border-red-500/60 focus:border-red-400' : 'border-white/15 focus:border-purple-500/60'}`}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
);

export default OrderModal;
