import React, { useState, useRef } from 'react';

const MAX_IMAGES = 5;
const ACTIVITY_TYPES = ['에이전시투어', '광고모델수업'];

const ACTIVITY_COLORS = {
    '에이전시투어': 'from-[#6C63FF] to-[#A78BFA]',
    '광고모델수업': 'from-[#14B8A6] to-[#2DD4BF]',
};

const CertificationUploadModal = ({ onClose, onSuccess }) => {
    const [imagePreviews, setImagePreviews] = useState([]);
    const [imageFiles, setImageFiles] = useState([]);
    const [activityType, setActivityType] = useState('에이전시투어');
    const [tagLabel, setTagLabel] = useState('');
    const [caption, setCaption] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const selected = Array.from(e.target.files || []);
        if (selected.length === 0) return;

        const totalCount = imageFiles.length + selected.length;
        if (totalCount > MAX_IMAGES) {
            setError(`사진은 최대 ${MAX_IMAGES}장까지 선택할 수 있어요.`);
            // 초과분 잘라내기
            const allowed = selected.slice(0, MAX_IMAGES - imageFiles.length);
            if (allowed.length === 0) return;
            addFiles(allowed);
        } else {
            setError('');
            addFiles(selected);
        }
        // input 리셋 (같은 파일 재선택 허용)
        e.target.value = '';
    };

    const addFiles = (files) => {
        const newFiles = [...imageFiles, ...files];
        setImageFiles(newFiles);

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setImagePreviews(prev => [...prev, ev.target.result]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index) => {
        setImageFiles(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        setError('');
    };

    const handleSubmit = async () => {
        if (imageFiles.length === 0) {
            setError('사진을 최소 1장 선택해 주세요.');
            return;
        }
        setIsUploading(true);
        setError('');
        try {
            // 회원가입 시 마케팅 동의를 받으므로 기본값 true로 전송
            await onSuccess({ activityType, tagLabel, caption, imageFiles, isMarketingAgreed: true });
            onClose();
        } catch (err) {
            setError(`업로드 중 오류가 발생했습니다: ${err.message || err}`);
        } finally {
            setIsUploading(false);
        }
    };

    const tagPlaceholders = {
        '에이전시투어': '에이전시명 (예: OO에이전시)',
        '광고모델수업': '수업명 (예: 포트폴리오 클래스)',
    };

    const canAddMore = imageFiles.length < MAX_IMAGES;

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
                    <h2 className="text-[#1F1235] font-black text-[16px]">📸 투어 인증샷</h2>
                    <button
                        onClick={handleSubmit}
                        disabled={isUploading || imageFiles.length === 0}
                        className="text-[#9333EA] font-black text-sm disabled:opacity-30 transition-opacity"
                    >
                        {isUploading ? '올리는 중...' : '완료'}
                    </button>
                </div>

                {/* 하단 패딩(pb-32)을 넉넉히 주어 홈 버튼(또는 하단 네비게이션)에 가려지지 않도록 수정 */}
                <div className="px-5 pt-5 pb-32 space-y-5 max-h-[85vh] overflow-y-auto hide-scrollbar">
                    {/* 이미지 선택 영역 */}
                    {imagePreviews.length === 0 ? (
                        /* 빈 상태 — 탭하여 사진 선택 */
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="cursor-pointer group"
                        >
                            <div className="w-full aspect-square rounded-2xl border-2 border-dashed border-[#E8E0FA] bg-[#F8F5FF] flex flex-col items-center justify-center gap-3 hover:border-[#9333EA]/60 hover:bg-[#F3E8FF] transition-all">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#9333EA] to-[#C084FC] flex items-center justify-center shadow-lg shadow-[#9333EA]/30">
                                    <span className="material-symbols-outlined text-white text-[30px]">add_photo_alternate</span>
                                </div>
                                <p className="text-[#5B4E7A] text-sm font-black">탭하여 사진 선택</p>
                                <p className="text-[#9CA3AF] text-xs font-medium">최대 {MAX_IMAGES}장 · JPG, PNG, WEBP 지원</p>
                            </div>
                        </div>
                    ) : (
                        /* 이미지 미리보기 그리드 */
                        <div>
                            <div className="flex items-center justify-between mb-2 px-1">
                                <p className="text-[#5B4E7A] text-[11px] font-black uppercase tracking-widest">
                                    사진 ({imagePreviews.length}/{MAX_IMAGES})
                                </p>
                                {canAddMore && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-1 text-[#9333EA] text-[12px] font-black hover:opacity-70 transition-opacity"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">add_circle</span>
                                        추가
                                    </button>
                                )}
                            </div>
                            <div className={`grid gap-2 ${
                                imagePreviews.length === 1 ? 'grid-cols-1' :
                                imagePreviews.length === 2 ? 'grid-cols-2' :
                                'grid-cols-3'
                            }`}>
                                {imagePreviews.map((preview, idx) => (
                                    <div
                                        key={idx}
                                        className={`relative rounded-2xl overflow-hidden border border-white/10 group ${
                                            imagePreviews.length === 1 ? 'aspect-square' : 'aspect-square'
                                        }`}
                                    >
                                        <img src={preview} alt={`미리보기 ${idx + 1}`} className="w-full h-full object-cover" />
                                        {/* 순서 번호 */}
                                        <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                            <span className="text-white text-[11px] font-black">{idx + 1}</span>
                                        </div>
                                        {/* 삭제 버튼 */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ opacity: 1 }}
                                        >
                                            <span className="material-symbols-outlined text-white text-[14px]">close</span>
                                        </button>
                                        {/* 호버 오버레이 */}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    </div>
                                ))}
                                {/* 추가 버튼 (그리드 내) */}
                                {canAddMore && imagePreviews.length > 0 && imagePreviews.length < MAX_IMAGES && (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="aspect-square rounded-2xl border-2 border-dashed border-[#E8E0FA] bg-[#F8F5FF] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-[#9333EA]/60 hover:bg-[#F3E8FF] transition-all"
                                    >
                                        <span className="material-symbols-outlined text-[#9333EA] text-[24px]">add_photo_alternate</span>
                                        <p className="text-[#9CA3AF] text-[10px] font-medium">추가</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageChange}
                    />

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
                        disabled={isUploading || imageFiles.length === 0}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black text-[15px] shadow-lg shadow-[#6C63FF]/30 disabled:opacity-40 disabled:shadow-none transition-all active:scale-95 mt-4"
                    >
                        {isUploading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                업로드 중... ({imageFiles.length}장)
                            </span>
                        ) : `투어 인증샷 등록 🚀 (${imageFiles.length}장)`}
                    </button>
                </div>
            </div>
        </div >
    );
};

export default CertificationUploadModal;
