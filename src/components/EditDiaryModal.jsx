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
            <div className="w-full max-w-md bg-[#1a1a24] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#1a1a24] sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px] text-amber-300">edit_note</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white leading-tight">일지 수정하기</h2>
                            <p className="text-xs text-white/40 mt-0.5">{memo.agencyName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Agency - Read Only */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-white/60 ml-1">에이전시</label>
                        <div className="flex items-center gap-2 bg-[#0a0a0f] border border-white/5 rounded-xl px-4 py-3 opacity-60">
                            <span className="material-symbols-outlined text-[16px] text-white/30">apartment</span>
                            <span className="text-sm text-white/60">{memo.agencyName}</span>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-white/60 ml-1">방문 일자 <span className="text-red-400">*</span></label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400/60 transition-colors"
                        />
                    </div>

                    {/* Content */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-white/60 ml-1">투어 기록 <span className="text-red-400">*</span></label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="수정할 내용을 입력하세요"
                            className="w-full h-36 bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-amber-400/60 transition-colors placeholder-white/20"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-[#1a1a24]">
                    <button
                        onClick={handleSave}
                        disabled={!content.trim() || isSaving}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-400 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black tracking-wide rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                        {isSaving ? '저장 중...' : '수정 완료'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditDiaryModal;
