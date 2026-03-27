import React, { useState, useRef } from 'react';

const ACTIVITY_TYPES = ['에이전시투어', '광고모델수업'];

const ACTIVITY_COLORS = {
    '에이전시투어': 'from-[#6C63FF] to-[#A78BFA]',
    '광고모델수업': 'from-[#14B8A6] to-[#2DD4BF]',
};

const CertificationUploadModal = ({ onClose, onSuccess }) => {
    const [imagePreview, setImagePreview] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [activityType, setActivityType] = useState('에이전시투어');
    const [tagLabel, setTagLabel] = useState('');
    const [caption, setCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleSubmit = async () => {
        if (!imageFile) {
            setError('사진을 선택해 주세요.');
            return;
        }
        setIsUploading(true);
        setError('');
        try {
            // 회원가입 시 마케팅 동의를 받으므로 기본값 true로 전송
            await onSuccess({ activityType, tagLabel, caption, imageFile, isMarketingAgreed: true });
            onClose();
        } catch (err) {
            setError('업로드 중 오류가 발생했습니다. 다시 시도해 주세요.');
        } finally {
            setIsUploading(false);
        }
    };

    const tagPlaceholders = {
        '에이전시투어': '에이전시명 (예: OO에이전시)',
        '광고모델수업': '수업명 (예: 포트폴리오 클래스)',
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full sm:max-w-md bg-white border border-[#E8E0FA] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-10 h-1 bg-[#E8E0FA] rounded-full" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E0FA]">
                    <button
                        onClick={onClose}
                        className="text-[#9CA3AF] hover:text-[#5B4E7A] transition-colors text-sm font-black"
                    >
                        취소
                    </button>
                    <h2 className="text-[#1F1235] font-black text-[16px]">📸 투어스타그램</h2>
                    <button
                        onClick={handleSubmit}
                        disabled={isUploading || !imageFile}
                        className="text-[#9333EA] font-black text-sm disabled:opacity-30 transition-opacity"
                    >
                        {isUploading ? '올리는 중...' : '완료'}
                    </button>
                </div>

                {/* 하단 패딩(pb-32)을 넉넉히 주어 홈 버튼(또는 하단 네비게이션)에 가려지지 않도록 수정 */}
                <div className="px-5 pt-5 pb-32 space-y-5 max-h-[85vh] overflow-y-auto hide-scrollbar">
                    {/* 이미지 선택 */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer group"
                    >
                        {imagePreview ? (
                            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-white/10">
                                <img src={imagePreview} alt="미리보기" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[40px]">photo_camera</span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-[#E8E0FA] bg-[#F8F5FF] flex flex-col items-center justify-center gap-3 hover:border-[#9333EA]/60 hover:bg-[#F3E8FF] transition-all">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9333EA] to-[#C084FC] flex items-center justify-center shadow-lg shadow-[#9333EA]/30">
                                    <span className="material-symbols-outlined text-white text-[30px]">add_photo_alternate</span>
                                </div>
                                <p className="text-[#5B4E7A] text-sm font-black">탭하여 사진 선택</p>
                                <p className="text-[#9CA3AF] text-xs font-medium">JPG, PNG, WEBP 지원</p>
                            </div>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange}
                        />
                    </div>

                    {/* 활동 유형 */}
                    <div>
                        <p className="text-[#5B4E7A] text-[11px] font-black uppercase tracking-widest mb-2 px-1">활동 유형</p>
                        <div className="grid grid-cols-2 gap-2">
                            {ACTIVITY_TYPES.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setActivityType(type)}
                                    className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all ${activityType === type
                                        ? `bg-gradient-to-br from-[#9333EA] to-[#C084FC] text-white shadow-lg`
                                        : 'bg-[#F8F5FF] border border-[#E8E0FA] text-[#9CA3AF] hover:bg-[#F3E8FF]'
                                        }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 태그 입력 */}
                    <div>
                        <p className="text-[#5B4E7A] text-[11px] font-black uppercase tracking-widest mb-2 px-1">태그</p>
                        <input
                            type="text"
                            value={tagLabel}
                            onChange={e => setTagLabel(e.target.value)}
                            placeholder={tagPlaceholders[activityType]}
                            className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-xl px-4 py-3 text-[#1F1235] text-sm placeholder-[#9CA3AF] outline-none focus:border-[#9333EA]/50 transition-colors font-medium"
                        />
                    </div>

                    {/* 코멘트 */}
                    <div>
                        <p className="text-[#5B4E7A] text-[11px] font-black uppercase tracking-widest mb-2 px-1">한줄 코멘트</p>
                        <textarea
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            placeholder="활동 소감을 한 줄로 남겨보세요 😊"
                            rows={3}
                            className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-xl px-4 py-3 text-[#1F1235] text-sm placeholder-[#9CA3AF] outline-none focus:border-[#9333EA]/50 transition-colors resize-none font-medium"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm text-center pt-2">{error}</p>
                    )}

                    {/* 완료 버튼 (모바일용 추가) */}
                    <button
                        onClick={handleSubmit}
                        disabled={isUploading || !imageFile}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black text-[15px] shadow-lg shadow-[#6C63FF]/30 disabled:opacity-40 disabled:shadow-none transition-all active:scale-95 mt-4"
                    >
                        {isUploading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                업로드 중...
                            </span>
                        ) : '투어스타그램 등록 🚀'}
                    </button>
                </div>
            </div>
        </div >
    );
};

export default CertificationUploadModal;
