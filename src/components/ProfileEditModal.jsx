import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';
import { getUser, updateUserProfile } from '../services/userService';

const ProfileEditModal = ({ onClose, onUpdateSuccess }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // 폼 상태
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        address_detail: '',
        password: '',
    });

    useEffect(() => {
        const currentUser = getUser();
        if (currentUser) {
            setUser(currentUser);
            setFormData({
                name: currentUser.name || '',
                phone: currentUser.phone || '',
                address: currentUser.address || '',
                address_detail: currentUser.address_detail || '',
                password: '', // 비밀번호는 기본 비워둠
            });
        }
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const updates = {
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                address_detail: formData.address_detail || null,
            };

            if (formData.password.trim()) {
                updates.password = formData.password.trim();
            }

            if (!user?.id && !user?.nickname) {
                setErrorMsg('사용자 정보를 찾을 수 없습니다.');
                return;
            }
            const { error } = await updateUserProfile(user.id, updates);

            if (error) {
                setErrorMsg(error.message || '정보 수정에 실패했습니다.');
            } else {
                onUpdateSuccess();
            }
        } catch (err) {
            setErrorMsg('에러가 발생했습니다. 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white border border-[#E8E0FA] rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl relative">

                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 w-9 h-9 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[#9333EA] hover:bg-[#EDE8FF] transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                </button>

                <div className="p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-[#9333EA]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#9333EA] text-[24px]">person_edit</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-[#1F1235]">회원 정보 수정</h2>
                            <p className="text-[#9CA3AF] text-[13px] font-bold">{user.nickname}님</p>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-500 text-[13px] font-bold text-center border border-red-100 italic">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 이름 */}
                        <div className="space-y-1.5">
                            <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">이름 (실명)</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-3.5 text-[#1F1235] text-sm font-bold placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                            />
                        </div>

                        {/* 핸드폰 번호 */}
                        <div className="space-y-1.5">
                            <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">연락처</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                placeholder="010-0000-0000"
                                className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-3.5 text-[#1F1235] text-sm font-bold placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                            />
                        </div>

                        {/* 주소 */}
                        <div className="space-y-1.5">
                            <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">주소</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                required
                                className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-3.5 text-[#1F1235] text-sm font-bold placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                            />
                        </div>

                        {/* 상세 주소 */}
                        <div className="space-y-1.5">
                            <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">상세 주소</label>
                            <input
                                type="text"
                                name="address_detail"
                                value={formData.address_detail}
                                onChange={handleChange}
                                placeholder="상세 주소 입력"
                                className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-3.5 text-[#1F1235] text-sm font-bold placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                            />
                        </div>

                        {/* 비밀번호 변경 */}
                        <div className="space-y-1.5 pt-4 border-t border-[#E8E0FA] mt-2">
                            <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">
                                비밀번호 변경 (선택)
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="기존 유지 시 빈칸"
                                    className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl pl-4 pr-12 py-3.5 text-[#1F1235] text-sm font-bold placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#9333EA] transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4.5 rounded-[20px] text-white font-black text-base shadow-xl transition-all active:scale-[0.98] ${loading
                                ? 'bg-[#9333EA]/50 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[#9333EA] to-[#C084FC] hover:from-[#7C3AED] hover:to-[#9333EA] shadow-[#9333EA]/20'
                                } mt-6`}
                        >
                            {loading ? '저장 중...' : '정보 저장하기'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfileEditModal;
