import React, { useState } from 'react';
import { updateDiaryEntry } from '../services/diaryService';

const EditDiaryModal = ({ memo, onClose, onSuccess }) => {
    const [date, setDate] = useState(memo.date || '');
    const [content, setContent] = useState(memo.content || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!content.trim()) return;
        setIsSaving(true);
        try {
            await updateDiaryEntry(memo.agencyName, memo.id, content, date);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to update diary entry:', error);
            setIsSaving(false);
        }
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div className="w-full max-w-lg bg-white border border-[#E8E0FA] rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 pb-6 border-b border-[#E8E0FA] flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#F3E8FF] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[24px] text-[#9333EA]">edit_note</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-[#1F1235] tracking-tight">일지 수정하기</h2>
                            <p className="text-[13px] text-[#9CA3AF] font-bold mt-0.5">{memo.agencyName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-[#F8F5FF] border border-[#E8E0FA] flex items-center justify-center text-[#9CA3AF] hover:text-[#1F1235] hover:bg-[#EDE8FF] transition-all"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Agency - Read Only */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black text-[#9CA3AF] ml-1 uppercase tracking-wider">에이전시</label>
                        <div className="flex items-center gap-2.5 bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-5 py-4 opacity-70">
                            <span className="material-symbols-outlined text-[18px] text-[#9CA3AF]">apartment</span>
                            <span className="text-base text-[#5B4E7A] font-bold">{memo.agencyName}</span>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black text-[#9CA3AF] ml-1 uppercase tracking-wider">방문 일자 <span className="text-[#9333EA]">*</span></label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-5 py-4 text-base text-[#1F1235] focus:outline-none focus:border-[#9333EA] focus:ring-4 focus:ring-[#9333EA]/5 transition-all font-bold"
                        />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black text-[#9CA3AF] ml-1 uppercase tracking-wider">투어 기록 <span className="text-[#9333EA]">*</span></label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="수정할 내용을 입력하세요"
                            className="w-full h-44 bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-5 py-4 text-base text-[#1F1235] resize-none focus:outline-none focus:border-[#9333EA] focus:ring-4 focus:ring-[#9333EA]/5 transition-all placeholder-[#9CA3AF]/40 font-bold leading-relaxed"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 pt-6 border-t border-[#E8E0FA] bg-white">
                    <button
                        onClick={handleSave}
                        disabled={!content.trim() || isSaving}
                        className="w-full py-4.5 bg-gradient-to-br from-[#9333EA] to-[#7C3AED] hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[15px] font-black tracking-wide rounded-[20px] transition-all shadow-xl shadow-[#9333EA]/20 flex items-center justify-center gap-2.5 active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[20px] font-black">check_circle</span>
                        {isSaving ? '저장 중...' : '수정 완료'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditDiaryModal;
