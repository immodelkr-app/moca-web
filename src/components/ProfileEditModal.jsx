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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl relative">

                {/* 닫기 버튼 */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-[24px]">close</span>
                </button>

                <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-[#6C63FF]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#818CF8]">person_edit</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white">회원 정보 수정</h2>
                            <p className="text-white/40 text-[13px] font-medium">{user.nickname}님</p>
                        </div>
                    </div>

                    {errorMsg && (
                        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold text-center">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* 이름 */}
                        <div className="space-y-1.5">
                            <label className="text-white/60 text-xs font-bold ml-1">이름(실명)</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#6C63FF] transition-colors"
                            />
                        </div>

                        {/* 핸드폰 번호 */}
                        <div className="space-y-1.5">
                            <label className="text-white/60 text-xs font-bold ml-1">연락처</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                placeholder="010-0000-0000"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors"
                            />
                        </div>

                        {/* 주소 */}
                        <div className="space-y-1.5">
                            <label className="text-white/60 text-xs font-bold ml-1">주소</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleChange}
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#6C63FF] transition-colors"
                            />
                        </div>

                        {/* 비밀번호 변경 */}
                        <div className="space-y-1.5 pt-2 border-t border-white/10">
                            <label className="text-white/60 text-xs font-bold ml-1 flex justify-between items-center">
                                비밀번호 변경 (선택)
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="변경할 비밀번호 (기존 유지 시 빈칸)"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
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
                            className={`w-full py-4 rounded-xl text-white font-black text-base shadow-lg transition-all ${loading
                                ? 'bg-[#6C63FF]/50 cursor-not-allowed'
                                : 'bg-[#6C63FF] hover:bg-[#5a52d5] active:scale-[0.98]'
                                } mt-4`}
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
