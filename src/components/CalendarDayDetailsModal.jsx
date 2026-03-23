import React from 'react';
import { deleteDiaryEntry } from '../services/diaryService';
import QuickAddMemoModal from './QuickAddMemoModal';
import EditDiaryModal from './EditDiaryModal';

const CalendarDayDetailsModal = ({ dateStr, diaries, onClose, onAddClick, onContentChange }) => {
    const [editingMemo, setEditingMemo] = React.useState(null);

    const handleAddToGoogleCalendar = (memo) => {
        const title = encodeURIComponent(`[아임모델 투어] ${memo.agencyName}`);
        
        // 날짜 파싱 (YYYY-MM-DD)
        const dateObj = new Date(dateStr);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const startStr = `${yyyy}${mm}${dd}`;

        // 종료일은 다음날 (All-day event 기준)
        const nextDateObj = new Date(dateObj);
        nextDateObj.setDate(nextDateObj.getDate() + 1);
        const nextYyyy = nextDateObj.getFullYear();
        const nextMm = String(nextDateObj.getMonth() + 1).padStart(2, '0');
        const nextDd = String(nextDateObj.getDate()).padStart(2, '0');
        const endStr = `${nextYyyy}${nextMm}${nextDd}`;

        const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:${startStr}
DTEND;VALUE=DATE:${endStr}
SUMMARY:${decodeURIComponent(title)}
DESCRIPTION:${memo.content || ''}
END:VEVENT
END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${memo.agencyName}.ics`);
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleDelete = async (memo) => {
        if (window.confirm(`'${memo.agencyName}' 방문 기록을 삭제하시겠습니까? 복구할 수 없습니다.`)) {
            await deleteDiaryEntry(memo.agencyName, memo.id);
            if (onContentChange) onContentChange();
        }
    };

    const handleEditSuccess = () => {
        setEditingMemo(null);
        if (onContentChange) onContentChange();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm sm:p-4 animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div className="w-full max-w-lg bg-[#1a1a24] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-slideUp sm:animate-zoomIn">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 z-10 bg-[#1a1a24]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#6C63FF]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px] text-[#A78BFA]">calendar_today</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white leading-tight">{dateStr}</h2>
                            <p className="text-xs text-white/40 mt-0.5">나의 투어 일지</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#1a1a24]">
                    {diaries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-[32px] text-white/20">edit_note</span>
                            </div>
                            <p className="text-white/60 font-medium text-center text-sm">
                                이 날 작성된 투어 일지가 없습니다.
                            </p>
                        </div>
                    ) : (
                        diaries.map(memo => (
                            <div
                                key={memo.id}
                                className="bg-[#0a0a0f] border border-white/5 rounded-2xl p-5 relative overflow-hidden group"
                            >
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#6C63FF]/30" />
                                <div className="flex items-start justify-between mb-3 pl-2">
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="w-7 h-7 rounded-lg bg-[#6C63FF]/10 flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[14px] text-[#A78BFA]">apartment</span>
                                        </div>
                                        <h3 className="text-white font-bold text-sm">{memo.agencyName}</h3>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                        <button
                                            onClick={() => handleAddToGoogleCalendar(memo)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-blue-400 hover:bg-blue-400/20 transition-colors"
                                            title="캘린더 일정 추가"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                                        </button>
                                        <button
                                            onClick={() => setEditingMemo(memo)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-amber-300 hover:bg-amber-400/20 transition-colors"
                                            title="수정"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(memo)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white/80 hover:text-red-400 hover:bg-red-400/20 transition-colors"
                                            title="삭제"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="pl-2">
                                    <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">
                                        {memo.content}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-white/5 bg-[#1a1a24] sticky bottom-0 z-10 pb-10 sm:pb-6">
                    <button
                        onClick={onAddClick}
                        className="w-full py-4 bg-white/5 hover:bg-white/10 text-white text-sm font-bold tracking-wide rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 group"
                    >
                        <span className="material-symbols-outlined text-[#6C63FF] group-hover:text-[#A78BFA] transition-colors">add_circle</span>
                        새 투어 일지 추가
                    </button>
                </div>
            </div>

            {/* Edit Modal Rendered Over This Modal */}
            {editingMemo && (
                <EditDiaryModal
                    memo={editingMemo}
                    onClose={() => setEditingMemo(null)}
                    onSuccess={handleEditSuccess}
                />
            )}
        </div>
    );
};

export default CalendarDayDetailsModal;
