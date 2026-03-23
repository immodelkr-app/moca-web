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
            <div className="w-full max-w-md bg-[#1a1a24] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#1a1a24] sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#6C63FF]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px] text-[#A78BFA]">edit</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white leading-tight">빠른 기록 쓰기</h2>
                            <p className="text-xs text-white/40 mt-0.5">투어일지를 쉽고 빠르게 기록하세요.</p>
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
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Agency Selector */}
                    <div className="space-y-2 relative">
                        <label className="block text-xs font-bold text-white/60 ml-1">다녀온 에이전시 <span className="text-red-400">*</span></label>
                        {!selectedAgencyName ? (
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-white/30">search</span>
                                <input
                                    type="text"
                                    placeholder="에이전시 이름 찾기..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#6C63FF] transition-colors placeholder-white/20"
                                />
                                {isDropdownOpen && filteredAgencies.length > 0 && (
                                    <ul className="absolute z-20 top-full mt-2 w-full bg-[#1a1a24] border border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto overflow-x-hidden hide-scrollbar py-2">
                                        {filteredAgencies.map((agency) => (
                                            <li
                                                key={agency.id}
                                                onClick={() => {
                                                    setSelectedAgencyName(agency.name);
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="px-4 py-3 hover:bg-white/5 cursor-pointer text-sm text-white/80 transition-colors flex items-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-[16px] text-white/30">apartment</span>
                                                {agency.name}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-gradient-to-r from-[#6C63FF]/10 to-transparent border border-[#6C63FF]/30 rounded-xl px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px] text-[#A78BFA]">apartment</span>
                                    <span className="text-white font-bold text-sm">{selectedAgencyName}</span>
                                </div>
                                <button
                                    onClick={() => setSelectedAgencyName('')}
                                    className="text-white/40 hover:text-white/80 transition-colors text-xs font-medium underline underline-offset-2"
                                >
                                    변경
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-white/60 ml-1">방문 일자 <span className="text-red-400">*</span></label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#6C63FF]"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-white/60 ml-1">투어 기록 <span className="text-red-400">*</span></label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="오늘의 방문 분위기, 특이사항, 피드백 등 어떤 내용이든 자유롭게 기록하세요!"
                            className="w-full h-32 bg-[#0a0a0f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-[#6C63FF] placeholder-white/20"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pt-6 pb-14 border-t border-white/5 bg-[#1a1a24]">
                    <button
                        onClick={handleSave}
                        disabled={!selectedAgencyName || !content.trim()}
                        className="w-full py-4 bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black tracking-wide rounded-xl transition-all shadow-lg shadow-[#6C63FF]/20 flex items-center justify-center gap-2"
                    >
                        {(!selectedAgencyName || !content.trim()) ? (
                            <span>내용을 모두 입력해주세요</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[20px]">done_all</span>
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
