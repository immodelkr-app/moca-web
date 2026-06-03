import React, { useState, useRef } from 'react';
import { submitFeedback, uploadFeedbackImage } from '../services/classService';

const ClassFeedbackModal = ({ cls, currentUser, existingFeedback, onClose, onSuccess }) => {
    const [rating, setRating] = useState(existingFeedback?.rating || 0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState(existingFeedback?.comment || '');
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(existingFeedback?.image_url || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const MAX_COMMENT = 300;

    const handleImageChange = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { setError('이미지 파일만 업로드 가능합니다.'); return; }
        if (file.size > 10 * 1024 * 1024) { setError('최대 10MB까지 업로드 가능합니다.'); return; }
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (rating === 0) { setError('별점을 선택해주세요.'); return; }

        setIsSubmitting(true);
        try {
            let imageUrl = existingFeedback?.image_url || null;
            if (imageFile) {
                const { url, error: uploadErr } = await uploadFeedbackImage(imageFile);
                if (uploadErr) throw new Error('이미지 업로드 실패: ' + (uploadErr.message || uploadErr));
                imageUrl = url;
            }

            const { error: submitErr } = await submitFeedback({
                classId: cls.id,
                userId: currentUser.id,
                rating,
                comment: comment.trim() || null,
                imageUrl,
            });

            if (submitErr) throw submitErr;
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.message || '피드백 등록 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const RATING_LABELS = { 1: '별로예요', 2: '아쉬워요', 3: '보통이에요', 4: '좋았어요', 5: '너무 좋았어요!' };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white w-full sm:max-w-lg sm:rounded-[32px] rounded-t-[32px] overflow-hidden shadow-2xl animate-slideUp max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">수강 후기 남기기</h2>
                            <p className="text-[12px] font-bold text-slate-400 mt-0.5 line-clamp-1">{cls.title}</p>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                            <span className="material-symbols-outlined text-[20px] text-slate-500">close</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="px-6 py-6 space-y-6">
                        {/* 별점 선택 */}
                        <div className="text-center">
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">클래스 평점</p>
                            <div className="flex justify-center gap-2 mb-2">
                                {[1, 2, 3, 4, 5].map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onMouseEnter={() => setHover(s)}
                                        onMouseLeave={() => setHover(0)}
                                        onClick={() => setRating(s)}
                                        className="transition-transform hover:scale-125 active:scale-110"
                                    >
                                        <span className={`text-[40px] block transition-all ${(hover || rating) >= s ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                                    </button>
                                ))}
                            </div>
                            {(hover || rating) > 0 && (
                                <p className="text-sm font-black text-amber-500 animate-fadeIn">
                                    {RATING_LABELS[hover || rating]}
                                </p>
                            )}
                        </div>

                        {/* 후기 텍스트 */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">상세 후기 (선택)</label>
                                <span className={`text-[10px] font-bold ${comment.length > MAX_COMMENT * 0.9 ? 'text-red-400' : 'text-slate-400'}`}>{comment.length}/{MAX_COMMENT}</span>
                            </div>
                            <textarea
                                value={comment}
                                onChange={e => { if (e.target.value.length <= MAX_COMMENT) setComment(e.target.value); }}
                                rows={4}
                                placeholder="클래스 수강 경험을 자유롭게 적어주세요. 여러분의 피드백이 더 좋은 클래스를 만드는 데 큰 도움이 됩니다 😊"
                                className="w-full bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-2xl px-4 py-3 text-sm font-medium transition-all outline-none resize-none leading-relaxed focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20 placeholder:text-slate-300"
                            />
                        </div>

                        {/* 사진 첨부 */}
                        <div>
                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider block mb-2">사진 첨부 (선택)</label>
                            {imagePreview ? (
                                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200">
                                    <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => { setImageFile(null); setImagePreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                        className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-red-500 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-amber-300 hover:bg-amber-50 transition-all flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-amber-500"
                                >
                                    <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                                    <span className="text-[11px] font-bold">클래스 사진 첨부</span>
                                </button>
                            )}
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageChange(e.target.files?.[0])} />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-red-500 text-xs font-bold">{error}</p>
                            </div>
                        )}
                    </div>

                    {/* 제출 버튼 */}
                    <div className="px-6 pb-12 sm:pb-8" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom, 0px))' }}>
                        <button
                            type="submit"
                            disabled={isSubmitting || rating === 0}
                            className="w-full py-4 bg-amber-400 hover:bg-amber-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-base rounded-2xl transition-all shadow-lg shadow-amber-400/20 disabled:shadow-none flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    등록 중...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">rate_review</span>
                                    {existingFeedback ? '후기 수정하기' : '후기 남기기'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClassFeedbackModal;
