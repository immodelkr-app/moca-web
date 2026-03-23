import React, { useState } from 'react';
import { addCoupon, updateCoupon, deleteCoupon } from '../services/adminService';

const CATEGORY_NAMES = {
    'hair_makeup': '헤어/메이크업',
    'studio': '스튜디오',
    'skincare': '피부관리',
    'cafe': '카페',
};

const TARGET_GRADES = {
    'ALL': '전체 (모두)',
    'SILVER': 'SILVER 만',
    'GOLD': 'GOLD 만',
};

const CATEGORY_PINS = {
    'hair_makeup': '4521',
    'studio': '9674',
    'skincare': '2026',
    'cafe': '1416',
};

const AdminCoupons = ({ coupons, setCoupons, setSuccessMsg, setError }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ id: null, category: 'hair_makeup', title: '', target_grade: 'ALL', pin_code: '4521' });
    const [loading, setLoading] = useState(false);

    const handleEdit = (coupon) => {
        setFormData(coupon);
        setIsEditing(true);
    };

    const handleCreateNew = () => {
        setFormData({ id: null, category: 'hair_makeup', title: '', target_grade: 'ALL', pin_code: '4521' });
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({ id: null, category: 'hair_makeup', title: '', target_grade: 'ALL', pin_code: '4521' });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'category' && !formData.id) {
            // Auto-update pin code for UX when creating new
            setFormData(prev => ({ ...prev, [name]: value, pin_code: CATEGORY_PINS[value] || '' }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (formData.id) {
                const { data, error } = await updateCoupon(formData.id, formData);
                if (error) throw error;
                setCoupons(prev => prev.map(c => c.id === formData.id ? data[0] : c));
                setSuccessMsg('쿠폰이 수정되었습니다.');
            } else {
                const newCoupon = { ...formData };
                delete newCoupon.id;
                const { data, error } = await addCoupon(newCoupon);
                if (error) throw error;
                setCoupons(prev => [data[0], ...prev]);
                setSuccessMsg('새 쿠폰이 발급되었습니다.');
            }
            setIsEditing(false);
        } catch (err) {
            setError('저장 실패: ' + err.message);
        } finally {
            setLoading(false);
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`'${title}' 쿠폰을 정말 삭제하시겠습니까?`)) return;
        setLoading(true);
        try {
            const { error } = await deleteCoupon(id);
            if (error) throw error;
            setCoupons(prev => prev.filter(c => c.id !== id));
            setSuccessMsg('쿠폰이 삭제되었습니다.');
        } catch (err) {
            setError('삭제 실패: ' + err.message);
        } finally {
            setLoading(false);
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    if (isEditing) {
        return (
            <div className="bg-[#1a1a24] border border-white/10 rounded-2xl p-6 animate-fadeIn">
                <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#818CF8]">{formData.id ? 'edit' : 'confirmation_number'}</span>
                    {formData.id ? '쿠폰 수정' : '새 쿠폰 발급'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-white/60 text-xs font-bold mb-1">카테고리</label>
                            <select name="category" value={formData.category} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm">
                                {Object.entries(CATEGORY_NAMES).map(([val, label]) => (
                                    <option key={val} value={val} className="text-black">{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-white/60 text-xs font-bold mb-1">쿠폰 이름 *</label>
                            <input type="text" name="title" value={formData.title} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm" placeholder="예: 첫 방문 웰컴 드링크" />
                        </div>
                        <div>
                            <label className="block text-white/60 text-xs font-bold mb-1">대상 등급</label>
                            <select name="target_grade" value={formData.target_grade} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm">
                                {Object.entries(TARGET_GRADES).map(([val, label]) => (
                                    <option key={val} value={val} className="text-black">{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-white/60 text-xs font-bold mb-1">사용 인증 PIN *</label>
                            <input type="text" name="pin_code" value={formData.pin_code} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm" placeholder="예: 4521" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-white/10">
                        <button type="button" onClick={handleCancel} disabled={loading} className="px-5 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm">취소</button>
                        <button type="submit" disabled={loading} className="px-5 py-3 rounded-xl bg-[#6C63FF] hover:bg-[#5a52d5] text-white transition-colors font-bold text-sm shadow-lg shadow-[#6C63FF]/20 flex-1 flex justify-center items-center gap-2">
                            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            발급하기
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-black text-white">쿠폰 바우처 관리</h2>
                    <p className="text-sm text-white/40 mt-1">회원들에게 보여질 1회성 사용 쿠폰을 관리합니다.</p>
                </div>
                <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 bg-[#6C63FF]/20 border border-[#6C63FF]/50 text-[#818CF8] rounded-xl font-bold hover:bg-[#6C63FF]/30 transition-colors text-sm">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    새 쿠폰 발급
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {coupons.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-white/30 bg-white/5 rounded-2xl border border-white/5">
                        <span className="material-symbols-outlined text-[48px] mb-2">loyalty</span>
                        <p>등록된 쿠폰이 없습니다.</p>
                    </div>
                ) : (
                    coupons.map(c => (
                        <div key={c.id} className="relative bg-gradient-to-br from-[#1E1B4B] to-[#312E81] border border-white/10 rounded-2xl p-5 overflow-hidden flex flex-col h-full hover:border-[#818CF8]/50 transition-colors">
                            <div className="flex justify-between items-start mb-3 relative z-10">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold ${c.target_grade === 'GOLD' ? 'bg-[#FDE047]/20 text-[#FDE047] border border-[#FDE047]/30' : 'bg-white/5 border border-white/10 text-white/60'}`}>
                                    {TARGET_GRADES[c.target_grade] || c.target_grade}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(c)} className="text-white/40 hover:text-white transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                    <button onClick={() => handleDelete(c.id, c.title)} className="text-red-400/50 hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                </div>
                            </div>
                            <div className="relative z-10">
                                <span className="text-[10px] font-bold text-[#818CF8] uppercase tracking-widest block mb-1">{CATEGORY_NAMES[c.category] || c.category}</span>
                                <h3 className="text-lg font-black text-white mb-2 leading-tight">{c.title}</h3>
                            </div>
                            <div className="mt-auto relative z-10 flex items-center justify-between border-t border-white/10 pt-3">
                                <span className="text-white/30 text-xs flex items-center gap-1 font-mono tracking-widest">
                                    <span className="material-symbols-outlined text-[14px]">password</span>
                                    {c.pin_code}
                                </span>
                            </div>
                            {/* Decorative background circle */}
                            <div className="absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none"></div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminCoupons;
