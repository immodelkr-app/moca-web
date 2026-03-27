import React, { useState, useEffect } from 'react';
import { fetchDiariesByAgency, addDiaryEntry, deleteDiaryEntry } from '../services/diaryService';

const VisitMemoModal = ({ agency, onClose }) => {
    const [memos, setMemos] = useState([]);
    const [date, setDate] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Load memos for this specific agency
        const loadMemos = async () => {
            const data = await fetchDiariesByAgency(agency.name);
            setMemos(data);
        };
        loadMemos();

        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
    }, [agency.name]);

    const handleSave = async () => {
        if (!content.trim()) return;

        setIsLoading(true);
        try {
            const newMemo = await addDiaryEntry(agency.name, date, content);
            setMemos(prev => [newMemo, ...prev]);
            setContent('');
        } catch (error) {
            console.error("Failed to save:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            try {
                await deleteDiaryEntry(agency.name, id);
                setMemos(memos.filter(memo => memo.id !== id));
            } catch (error) {
                console.error("Failed to delete:", error);
            }
        }
    };

    const handleAddToGoogleCalendar = (memo) => {
        const title = encodeURIComponent(`[아임모델 방문] ${agency.name}`);
        
        // 날짜 파싱 (YYYY-MM-DD 예상, 혹시 몰라 split 처리)
        const dateParts = memo.date.split('-');
        if (dateParts.length !== 3) return; // 올바른 날짜 형식이 아니면 무시

        const yyyy = dateParts[0];
        const mm = dateParts[1].padStart(2, '0');
        const dd = dateParts[2].padStart(2, '0');
        const startStr = `${yyyy}${mm}${dd}`;

        // 종료일은 다음날
        const dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
        dateObj.setDate(dateObj.getDate() + 1);
        const nextYyyy = dateObj.getFullYear();
        const nextMm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const nextDd = String(dateObj.getDate()).padStart(2, '0');
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
        link.setAttribute('download', `${agency.name}.ics`);
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Close on click outside
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={handleBackdropClick}
        >
            <div className="w-full max-w-md bg-white border border-[#E8E0FA] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-5 border-b border-[#E8E0FA] flex items-center justify-between bg-[#F8F5FF]">
                    <div>
                        <h2 className="text-lg font-bold text-[#1F1235] leading-tight">{agency.name}</h2>
                        <span className="text-xs text-[#9CA3AF]">방문 일지</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[#9CA3AF] hover:text-[#7C3AED] hover:bg-[#EDE8FF] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Input Form */}
                    <div className="space-y-3 bg-[#F8F5FF] p-4 rounded-xl border border-[#E8E0FA]">
                        <label className="block text-xs font-bold text-[#5B4E7A] mb-1">새로운 기록 작성</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-white border border-[#E8E0FA] rounded-lg px-3 py-2 text-sm text-[#1F1235] focus:outline-none focus:border-[#9333EA]/50"
                        />
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="방문 내용, 특이사항, 미팅 결과 등을 기록하세요..."
                            className="w-full h-24 bg-white border border-[#E8E0FA] rounded-lg px-3 py-2 text-sm text-[#1F1235] resize-none focus:outline-none focus:border-[#9333EA]/50 placeholder-[#9CA3AF]"
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={!content.trim() || isLoading}
                                className="px-4 py-2 bg-[#9333EA] hover:bg-[#7C3AED] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                {isLoading ? "저장 중..." : "기록 저장"}
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-[#1F1235]">지난 기록 ({memos.length})</h3>
                        </div>

                        {memos.length === 0 ? (
                            <div className="text-center py-8 text-[#9CA3AF] text-xs">
                                아직 기록된 내용이 없습니다.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {memos.map(memo => (
                                    <div key={memo.id} className="group relative bg-[#F8F5FF] border border-[#E8E0FA] rounded-xl p-4 transition-colors hover:border-[#9333EA]/30">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-[#9333EA] text-xs font-bold bg-[#F3E8FF] px-2 py-0.5 rounded text-center">
                                                {memo.date}
                                            </span>
                                            <div className="flex items-center gap-1.5 transition-all">
                                                <button
                                                    onClick={() => handleAddToGoogleCalendar(memo)}
                                                    className="p-1 text-white/80 hover:text-blue-400 transition-all rounded-lg hover:bg-blue-400/20"
                                                    title="캘린더 추가"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(memo.id)}
                                                    className="p-1 text-white/80 hover:text-red-400 transition-all rounded-lg hover:bg-red-400/20"
                                                    title="삭제"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">delete</span>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-[#5B4E7A] text-sm whitespace-pre-wrap leading-relaxed">{memo.content}</p>
                                        <div className="mt-2 text-[10px] text-[#9CA3AF] text-right">
                                            {new Date(memo.timestamp).toLocaleTimeString()} 작성
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VisitMemoModal;
