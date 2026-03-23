import React, { useState, useRef } from 'react';
import { addPartner, updatePartner, deletePartner, uploadPartnerImage } from '../services/adminService';

const CATEGORY_NAMES = {
    'hair_makeup': '헤어/메이크업',
    'studio': '스튜디오',
    'skincare': '피부관리',
    'cafe': '카페',
};

const AdminPartners = ({ partners, setPartners, setSuccessMsg, setError }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ id: null, category: 'hair_makeup', name: '', discount_text: '', description: '', location: '', map_link: '', img_url: '', pin_code: '', phone: '', homepage_link: '' });

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);

    const isImageUrl = (url) => {
        if (!url) return false;
        return url.includes('supabase') || /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url);
    };

    const handleEdit = (partner) => {
        setFormData({ phone: '', homepage_link: '', ...partner });
        setImageFile(null);
        setImagePreview(isImageUrl(partner.img_url) ? partner.img_url : '');
        setIsEditing(true);
    };

    const handleCreateNew = () => {
        setFormData({ id: null, category: 'hair_makeup', name: '', discount_text: '', description: '', location: '', map_link: '', img_url: '', pin_code: '', phone: '', homepage_link: '' });
        setImageFile(null);
        setImagePreview('');
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setFormData({ id: null, category: 'hair_makeup', name: '', discount_text: '', description: '', location: '', map_link: '', img_url: '', pin_code: '', phone: '', homepage_link: '' });
        setImageFile(null);
        setImagePreview('');
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const validateImageFile = (file) => {
        if (!file.type.startsWith('image/')) {
            setError('이미지 파일만 업로드 가능합니다. (JPG, PNG)');
            return false;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError(`파일 크기가 너무 큽니다. (현재 ${(file.size / 1024 / 1024).toFixed(1)}MB / 최대 5MB)`);
            return false;
        }
        return true;
    };

    const handleImageDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && validateImageFile(file)) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setFormData(prev => ({ ...prev, img_url: '' }));
        }
    };

    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file && validateImageFile(file)) {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setFormData(prev => ({ ...prev, img_url: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalImgUrl = formData.img_url;

            // 파일이 새로 선택된 경우 업로드 진행
            if (imageFile) {
                console.log('[AdminPartners] 파일 업로드 시작:', imageFile.name);
                const { url, error: uploadError } = await uploadPartnerImage(imageFile);
                console.log('[AdminPartners] 업로드 결과 url:', url, 'error:', uploadError);
                if (uploadError) throw new Error('이미지 업로드 실패: ' + uploadError.message);
                if (url) finalImgUrl = url;
            }

            console.log('[AdminPartners] finalImgUrl:', finalImgUrl);
            const payloadToSave = { ...formData, img_url: finalImgUrl };
            console.log('[AdminPartners] payloadToSave.id:', payloadToSave.id, 'img_url:', payloadToSave.img_url);

            if (payloadToSave.id) {
                // Update (id 필드는 update payload에서 제외)
                const { id: partnerId, ...updateFields } = payloadToSave;
                const { data, error } = await updatePartner(partnerId, updateFields);
                console.log('[AdminPartners] updatePartner 결과 data:', data, 'error:', error);
                if (error) throw error;
                setPartners(prev => prev.map(p => p.id === payloadToSave.id ? data[0] : p));
                setSuccessMsg('제휴사가 수정되었습니다.');
            } else {
                // Create
                const newPartner = { ...payloadToSave };
                delete newPartner.id; // remove null id
                const { data, error } = await addPartner(newPartner);
                if (error) throw error;
                setPartners(prev => [data[0], ...prev]);
                setSuccessMsg('새 제휴사가 추가되었습니다.');
            }
            setImageFile(null);
            setIsEditing(false);
        } catch (err) {
            setError('저장 실패: ' + err.message);
        } finally {
            setLoading(false);
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`'${name}' 제휴사를 정말 삭제하시겠습니까?`)) return;
        setLoading(true);
        try {
            const { error } = await deletePartner(id);
            if (error) throw error;
            setPartners(prev => prev.filter(p => p.id !== id));
            setSuccessMsg('제휴사가 삭제되었습니다.');
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
                    <span className="material-symbols-outlined text-[#818CF8]">{formData.id ? 'edit' : 'add_circle'}</span>
                    {formData.id ? '제휴사 수정' : '새 제휴사 추가'}
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
                            <label className="block text-white/60 text-xs font-bold mb-1">업체명 *</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm" placeholder="업체명" />
                        </div>
                        <div>
                            <label className="block text-white/60 text-xs font-bold mb-1">할인 핵심요약 (예: 10% 기미+잡티)</label>
                            <input type="text" name="discount_text" value={formData.discount_text} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm" placeholder="할인 핵심요약" />
                        </div>
                        <div>
                            <label className="block text-white/60 text-xs font-bold mb-1">상세 설명</label>
                            <input type="text" name="description" value={formData.description || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm" placeholder="상세 설명" />
                        </div>
                        <div>
                            <label className="block text-white/60 text-xs font-bold mb-1">업체 연락처 (표시용)</label>
                            <input type="text" name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm" placeholder="예: 02-1234-5678" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-white/60 text-xs font-bold mb-1">인증 PIN (4자리 등)</label>
                            <input type="text" name="pin_code" value={formData.pin_code || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm" placeholder="예: 4521" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-white/60 text-xs font-bold mb-1">위치/주소</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm" placeholder="주소" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-white/60 text-xs font-bold mb-1">홈페이지 링크</label>
                            <input type="url" name="homepage_link" value={formData.homepage_link || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm" placeholder="https://..." />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-white/60 text-xs font-bold mb-1">지도 링크 (네이버 지도, 카카오맵 등)</label>
                            <input type="url" name="map_link" value={formData.map_link || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm" placeholder="https://..." />
                        </div>

                        {/* 이미지 썸네일 업로드 */}
                        <div className="md:col-span-2">
                            <label className="block text-white/60 text-xs font-bold mb-2">썸네일 이미지 파일 올리기 (권장: 4:3 비율, 가로가 더 넓게)</label>
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleImageDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`w-full aspect-[4/3] max-w-sm mx-auto rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative group
                                    ${imagePreview ? 'border-transparent bg-white/5' : 'border-white/20 hover:border-[#6C63FF] bg-white/5 hover:bg-white/10'}`}
                            >
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white font-bold flex items-center gap-2">
                                                <span className="material-symbols-outlined">edit</span>
                                                이미지 변경
                                            </span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-6">
                                        <span className="material-symbols-outlined text-[48px] text-white/20 mb-3 block">add_photo_alternate</span>
                                        <p className="text-white/60 text-sm font-bold mb-1">클릭하여 이미지 선택 또는 끌어오기</p>
                                        <p className="text-white/30 text-xs">JPG, PNG 파일 지원 (최대 5MB)</p>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-white/60 text-xs font-bold mb-1">이미지 URL 직접 입력 (선택, 파일 업로드 시 자동 무시됨)</label>
                            <input type="url" name="img_url" value={formData.img_url || ''} onChange={handleChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#6C63FF] outline-none text-sm" placeholder="https://" />
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-white/10">
                        <button type="button" onClick={handleCancel} disabled={loading} className="px-5 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm">취소</button>
                        <button type="submit" disabled={loading} className="px-5 py-3 rounded-xl bg-[#6C63FF] hover:bg-[#5a52d5] text-white transition-colors font-bold text-sm shadow-lg shadow-[#6C63FF]/20 flex-1 flex justify-center items-center gap-2">
                            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            저장하기
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
                    <h2 className="text-xl font-black text-white">제휴사 등록/관리</h2>
                    <p className="text-sm text-white/40 mt-1">상시 혜택을 제공하는 파트너 업체 리스트입니다.</p>
                </div>
                <button onClick={handleCreateNew} className="flex items-center gap-2 px-4 py-2 bg-[#10b981]/20 border border-[#10b981]/50 text-[#34d399] rounded-xl font-bold hover:bg-[#10b981]/30 transition-colors text-sm">
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    제휴사 등록
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.length === 0 ? (
                    <div className="col-span-full py-10 text-center text-white/30 bg-white/5 rounded-2xl border border-white/5">
                        <span className="material-symbols-outlined text-[48px] mb-2">storefront</span>
                        <p>등록된 제휴사가 없습니다.</p>
                    </div>
                ) : (
                    partners.map(p => (
                        <div key={p.id} className="bg-[#1a1a24] border border-white/10 rounded-2xl p-5 hover:border-[#6C63FF]/50 transition-colors flex flex-col h-full">
                            <div className="flex justify-between items-start mb-3">
                                <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 text-[10px] font-bold">
                                    {CATEGORY_NAMES[p.category] || p.category}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(p)} className="text-white/40 hover:text-white transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                    <button onClick={() => handleDelete(p.id, p.name)} className="text-red-400/50 hover:text-red-400 transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                </div>
                            </div>
                            <h3 className="text-lg font-black text-white mb-1">{p.name}</h3>
                            <p className="text-[#818CF8] font-bold text-sm mb-3 line-clamp-2">{p.discount_text}</p>
                            <div className="mt-auto space-y-1">
                                <p className="text-white/40 text-xs flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                                    {p.location || '-'}
                                </p>
                                <p className="text-white/40 text-xs flex items-center gap-1 mt-1">
                                    <span className="material-symbols-outlined text-[14px]">call</span>
                                    {p.phone || '-'}
                                </p>
                                <p className="text-white/40 text-[10px] break-all flex items-center gap-1 mt-1">
                                    <span className="material-symbols-outlined text-[14px]">image</span>
                                    {p.img_url ? '이미지 등록됨' : '이미지 없음'}
                                </p>
                                <p className="text-white/40 text-xs flex items-center gap-1 font-mono tracking-widest mt-2 border-t border-white/10 pt-2">
                                    <span className="material-symbols-outlined text-[14px]">password</span>
                                    PIN: {p.pin_code || '미설정'}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdminPartners;
