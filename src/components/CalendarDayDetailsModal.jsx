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
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div className="w-full max-w-lg bg-white border border-[#E8E0FA] rounded-t-[40px] sm:rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-slideUp sm:animate-zoomIn">
                {/* Header */}
                <div className="p-8 pb-6 border-b border-[#E8E0FA] flex items-center justify-between sticky top-0 z-10 bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#F3E8FF] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[24px] text-[#9333EA]">calendar_today</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-[#1F1235] leading-none tracking-tight">{dateStr}</h2>
                            <p className="text-[13px] text-[#9CA3AF] font-bold mt-1.5 uppercase tracking-wider">나의 투어 일지</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-[#F8F5FF] border border-[#E8E0FA] flex items-center justify-center text-[#9CA3AF] hover:text-[#1F1235] hover:bg-[#EDE8FF] transition-all"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                    {diaries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-20 h-20 rounded-full bg-[#F3E8FF] flex items-center justify-center mb-6">
                                <span className="material-symbols-outlined text-[40px] text-[#9333EA]/30">edit_note</span>
                            </div>
                            <p className="text-[#5B4E7A] font-bold text-center text-sm leading-relaxed">
                                이 날 작성된 투어 일지가 없습니다.<br/>
                                <span className="text-[#9CA3AF] text-xs font-medium">활동 내용을 기록해보세요!</span>
                            </p>
                        </div>
                    ) : (
                        diaries.map(memo => (
                            <div
                                key={memo.id}
                                className="bg-[#F8F5FF] border border-[#E8E0FA] rounded-[24px] p-6 relative overflow-hidden group hover:border-[#9333EA]/30 hover:shadow-sm transition-all shadow-moca"
                            >
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#9333EA]/20 group-hover:bg-[#9333EA] transition-colors" />
                                <div className="flex items-start justify-between mb-4 pl-2">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-9 h-9 rounded-xl bg-white border border-[#E8E0FA] flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-[18px] text-[#9333EA]">apartment</span>
                                        </div>
                                        <h3 className="text-[#1F1235] font-black text-base truncate tracking-tight">{memo.agencyName}</h3>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                        <button
                                            onClick={() => handleAddToGoogleCalendar(memo)}
                                            className="w-9 h-9 rounded-full bg-white border border-[#E8E0FA] flex items-center justify-center text-[#9CA3AF] hover:text-blue-500 hover:bg-blue-50 transition-all"
                                            title="캘린더 일정 추가"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                                        </button>
                                        <button
                                            onClick={() => setEditingMemo(memo)}
                                            className="w-9 h-9 rounded-full bg-white border border-[#E8E0FA] flex items-center justify-center text-[#9CA3AF] hover:text-[#9333EA] hover:bg-[#F3E8FF] transition-all"
                                            title="수정"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(memo)}
                                            className="w-9 h-9 rounded-full bg-white border border-[#E8E0FA] flex items-center justify-center text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-all"
                                            title="삭제"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="pl-2">
                                    <p className="text-[#5B4E7A] text-sm whitespace-pre-wrap leading-relaxed font-medium">
                                        {memo.content}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 pt-6 border-t border-[#E8E0FA] bg-white sticky bottom-0 z-10 pb-12 sm:pb-8">
                    <button
                        onClick={onAddClick}
                        className="w-full py-4.5 bg-[#F3E8FF] hover:bg-[#EDE8FF] text-[#7C3AED] text-[15px] font-black tracking-wide rounded-[20px] transition-all border border-[#E8E0FA] flex items-center justify-center gap-2.5 group active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-[22px] font-black transition-transform group-hover:scale-110">add_circle</span>
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
