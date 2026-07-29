import React, { useState } from 'react';
import { parseImageUrls } from '../services/certificationService';

const ACTIVITY_TYPES = ['에이전시투어', '광고모델수업'];

const tagPlaceholders = {
    '에이전시투어': '에이전시명 (예: OO에이전시)',
    '광고모델수업': '수업명 (예: 포트폴리오 클래스)',
};

const CertificationEditModal = ({ post, onClose, onSuccess }) => {
    const [activityType, setActivityType] = useState(post.activity_type);
    const [tagLabel, setTagLabel] = useState(post.tag_label || '');
    const [caption, setCaption] = useState(post.caption || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const imageUrls = parseImageUrls(post.image_url);

    const handleSubmit = async () => {
        setIsSaving(true);
        setError('');
        try {
            await onSuccess({ activityType, tagLabel, caption });
            onClose();
        } catch (err) {
            setError(`수정 중 오류가 발생했습니다: ${err.message || err}`);
        } finally {
            setIsSaving(false);
        }
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
                    <h2 className="text-[#1F1235] font-black text-[16px]">✏️ 게시물 수정</h2>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="text-[#9333EA] font-black text-sm disabled:opacity-30 transition-opacity"
                    >
                        {isSaving ? '저장 중...' : '완료'}
                    </button>
                </div>

                <div className="px-5 pt-5 pb-32 space-y-5 max-h-[85vh] overflow-y-auto hide-scrollbar">
                    {/* 이미지 미리보기 (수정 불가) */}
                    {imageUrls.length > 0 && (
                        <div>
                            <p className="text-[#5B4E7A] text-[11px] font-black uppercase tracking-widest mb-2 px-1">
                                사진 {imageUrls.length > 1 && `(${imageUrls.length}장, 수정 불가)`}
                            </p>
                            <div className={`grid gap-2 ${imageUrls.length === 1 ? 'grid-cols-1' : imageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                {imageUrls.map((url, idx) => (
                                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-[#E8E0FA]">
                                        <img src={url} alt={`사진 ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
                        disabled={isSaving}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black text-[15px] shadow-lg shadow-[#6C63FF]/30 disabled:opacity-40 disabled:shadow-none transition-all active:scale-95 mt-4"
                    >
                        {isSaving ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                                저장 중...
                            </span>
                        ) : '수정 완료'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CertificationEditModal;
