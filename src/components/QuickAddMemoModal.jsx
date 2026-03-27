import React, { useState, useEffect } from 'react';
import { fetchAgencies } from '../services/agencyService';
import { addDiaryEntry } from '../services/diaryService';

const QuickAddMemoModal = ({ onClose, onSuccess }) => {
    const [agencies, setAgencies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAgencyName, setSelectedAgencyName] = useState('');
    const [date, setDate] = useState('');
    const [content, setContent] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        // Load agencies for dropdown
        fetchAgencies().then(data => {
            const validAgencies = data.filter(a => a.name);
            setAgencies(validAgencies);
        });
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
    }, []);

    const handleSave = async () => {
        if (!selectedAgencyName.trim() || !content.trim()) return;

        setIsSaving(true);
        try {
            await addDiaryEntry(selectedAgencyName, date, content);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to save via Quick Add:", error);
            setIsSaving(false);
        }
    };

    const filteredAgencies = agencies.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div className="w-full max-w-lg bg-white border border-[#E8E0FA] rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
                {/* Header */}
                <div className="p-8 pb-6 border-b border-[#E8E0FA] flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#F3E8FF] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[24px] text-[#9333EA]">edit</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-[#1F1235] tracking-tight">빠른 기록 쓰기</h2>
                            <p className="text-[13px] text-[#9CA3AF] font-bold mt-0.5">투어일지를 쉽고 빠르게 기록하세요.</p>
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
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Agency Selector */}
                    <div className="space-y-2 relative">
                        <label className="block text-xs font-black text-[#9CA3AF] ml-1 uppercase tracking-wider">다녀온 에이전시 <span className="text-[#9333EA]">*</span></label>
                        {!selectedAgencyName ? (
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-[#9CA3AF]">search</span>
                                <input
                                    type="text"
                                    placeholder="에이전시 이름 찾기..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl pl-14 pr-5 py-4 text-base text-[#1F1235] focus:outline-none focus:border-[#9333EA] focus:ring-4 focus:ring-[#9333EA]/5 transition-all font-bold placeholder-[#9CA3AF]/40"
                                />
                                {isDropdownOpen && filteredAgencies.length > 0 && (
                                    <ul className="absolute z-20 top-full mt-3 w-full bg-white border border-[#E8E0FA] rounded-2xl shadow-2xl max-h-56 overflow-y-auto overflow-x-hidden hide-scrollbar py-3">
                                        {filteredAgencies.map((agency) => (
                                            <li
                                                key={agency.id}
                                                onClick={() => {
                                                    setSelectedAgencyName(agency.name);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="px-5 py-3.5 hover:bg-[#F8F5FF] cursor-pointer text-sm text-[#1F1235] font-bold transition-all flex items-center gap-3 border-b border-[#F8F5FF] last:border-none"
                                            >
                                                <span className="material-symbols-outlined text-[18px] text-[#9CA3AF]">apartment</span>
                                                {agency.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-gradient-to-r from-[#9333EA]/5 to-transparent border border-[#9333EA]/20 rounded-2xl px-5 py-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[20px] text-[#9333EA]">apartment</span>
                                    <span className="text-[#1F1235] font-black text-base">{selectedAgencyName}</span>
                                </div>
                                <button
                                    onClick={() => setSelectedAgencyName('')}
                                    className="text-[#9333EA] hover:text-[#7C3AED] transition-colors text-xs font-black underline underline-offset-4"
                                >
                                    변경하기
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-black text-[#9CA3AF] ml-1 uppercase tracking-wider">방문 일자 <span className="text-[#9333EA]">*</span></label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-5 py-4 text-base text-[#1F1235] focus:outline-none focus:border-[#9333EA] font-bold"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-black text-[#9CA3AF] ml-1 uppercase tracking-wider">투어 기록 <span className="text-[#9333EA]">*</span></label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="오늘의 방문 분위기, 특이사항, 피드백 등 어떤 내용이든 자유롭게 기록하세요!"
                            className="w-full h-40 bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-5 py-4 text-base text-[#1F1235] resize-none focus:outline-none focus:border-[#9333EA] font-bold leading-relaxed placeholder-[#9CA3AF]/40"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 pb-14 border-t border-[#E8E0FA] bg-white">
                    <button
                        onClick={handleSave}
                        disabled={!selectedAgencyName || !content.trim()}
                        className="w-full py-4.5 bg-gradient-to-br from-[#9333EA] to-[#7C3AED] hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[15px] font-black tracking-wide rounded-[20px] transition-all shadow-xl shadow-[#9333EA]/20 flex items-center justify-center gap-2.5 active:scale-[0.98]"
                    >
                        {(!selectedAgencyName || !content.trim()) ? (
                            <span>내용을 모두 입력해주세요</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[22px] font-black">done_all</span>
                                일지 저장하기
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuickAddMemoModal;
