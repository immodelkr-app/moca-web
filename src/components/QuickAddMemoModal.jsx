import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { fetchAgencies } from '../services/agencyService';
import { addDiaryEntry } from '../services/diaryService';

// 가이드 템플릿 6개 카테고리 정의
const GUIDE_FIELDS = [
    {
        key: 'shooting',
        icon: '📸',
        label: '촬영 순서·내용',
        placeholder: '예) 자기소개(이름+키) → 상반신 좌우 정면 → 전신 포즈 → 클로즈업 표정...',
        rows: 3,
    },
    {
        key: 'acting',
        icon: '🎭',
        label: '연기 여부·종류',
        placeholder: '예) 자유연기 있음 (치킨 대사) / 연기 없음 / 짧은 자기소개만',
        rows: 2,
    },
    {
        key: 'outfit',
        icon: '👗',
        label: '당일 의상',
        placeholder: '예) 노란색 가디건, 그레이 바지, 검정 로퍼',
        rows: 2,
    },
    {
        key: 'atmosphere',
        icon: '🏢',
        label: '현장 분위기',
        placeholder: '예) 촬영감독님 직접 진행, 대기실 넓고 쾌적, 파우더룸 있음, 친절한 편...',
        rows: 2,
    },
    {
        key: 'tip',
        icon: '💡',
        label: '특이사항·꿀팁',
        placeholder: '예) QR코드로 접수, 예약 없이 가능, 위치 자주 바뀜, 1년 1회 제한...',
        rows: 2,
    },
    {
        key: 'memo',
        icon: '📝',
        label: '기타 메모',
        placeholder: '자유롭게 기록하세요.',
        rows: 2,
    },
];

// 가이드 필드들을 하나의 텍스트로 합산
const buildContentFromGuide = (fields) => {
    return GUIDE_FIELDS
        .filter(f => fields[f.key]?.trim())
        .map(f => `${f.icon} ${f.label}\n${fields[f.key].trim()}`)
        .join('\n\n');
};

const QuickAddMemoModal = ({ onClose, onSuccess }) => {
    const [agencies, setAgencies] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAgencyName, setSelectedAgencyName] = useState('');
    const [date, setDate] = useState('');
    const [content, setContent] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // 탭: 'free' | 'guide'
    const [mode, setMode] = useState('guide');
    // 가이드 모드 필드값
    const [guideFields, setGuideFields] = useState({
        shooting: '', acting: '', outfit: '', atmosphere: '', tip: '', memo: ''
    });

    useEffect(() => {
        fetchAgencies().then(data => {
            const validAgencies = data.filter(a => a.name);
            setAgencies(validAgencies);
        });
        const today = new Date().toISOString().split('T')[0];
        setDate(today);
    }, []);

    const handleGuideChange = (key, value) => {
        setGuideFields(prev => ({ ...prev, [key]: value }));
    };

    const isGuideValid = GUIDE_FIELDS.some(f => guideFields[f.key]?.trim());
    const canSave = selectedAgencyName.trim() && (
        mode === 'free' ? content.trim() : isGuideValid
    );

    const handleSave = async () => {
        if (!canSave) return;
        setIsSaving(true);
        try {
            const finalContent = mode === 'guide'
                ? buildContentFromGuide(guideFields)
                : content;
            await addDiaryEntry(selectedAgencyName, date, finalContent);
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save via Quick Add:', error);
            setIsSaving(false);
        }
    };

    const filteredAgencies = agencies.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) onClose();
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
            onClick={handleBackdropClick}
        >
            <div className="w-full max-w-lg bg-white border border-[#E8E0FA] rounded-[48px] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="p-8 pb-5 border-b border-[#E8E0FA] flex items-center justify-between bg-white sticky top-0 z-10 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#F3E8FF] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[24px] text-[#9333EA]">edit</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-[#1F1235] tracking-tight">투어일지 쓰기</h2>
                            <p className="text-[13px] text-[#9CA3AF] font-bold mt-0.5">방문 기록을 남겨보세요</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-[#F8F5FF] border border-[#E8E0FA] flex items-center justify-center text-[#9CA3AF] hover:text-[#1F1235] hover:bg-[#EDE8FF] transition-all"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="px-6 pt-5 pb-1 flex-shrink-0">
                    <div className="flex bg-[#F3E8FF]/60 rounded-2xl p-1.5 gap-1">
                        <button
                            onClick={() => setMode('guide')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${
                                mode === 'guide'
                                    ? 'bg-white shadow-md text-[#9333EA]'
                                    : 'text-[#9CA3AF] hover:text-[#7C3AED]'
                            }`}
                        >
                            <span className="text-base">✨</span>
                            가이드 작성
                        </button>
                        <button
                            onClick={() => setMode('free')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all ${
                                mode === 'free'
                                    ? 'bg-white shadow-md text-[#9333EA]'
                                    : 'text-[#9CA3AF] hover:text-[#7C3AED]'
                            }`}
                        >
                            <span className="text-base">✏️</span>
                            자유 작성
                        </button>
                    </div>
                    {mode === 'guide' && (
                        <p className="text-[11px] text-[#9CA3AF] font-bold mt-2 ml-1 text-center">
                            항목별로 채우면 자동으로 일지가 완성돼요 · 비워도 괜찮아요
                        </p>
                    )}
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {/* Agency Selector */}
                    <div className="space-y-2 relative">
                        <label className="block text-xs font-black text-[#9CA3AF] ml-1 uppercase tracking-wider">
                            다녀온 에이전시 <span className="text-[#9333EA]">*</span>
                        </label>
                        {!selectedAgencyName ? (
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] text-[#9CA3AF]">search</span>
                                <input
                                    type="text"
                                    placeholder="에이전시 이름 찾기..."
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl pl-14 pr-5 py-4 text-base text-[#1F1235] focus:outline-none focus:border-[#9333EA] focus:ring-4 focus:ring-[#9333EA]/5 transition-all font-bold placeholder-[#9CA3AF]/40"
                                />
                                {isDropdownOpen && filteredAgencies.length > 0 && (
                                    <ul className="absolute z-20 top-full mt-3 w-full bg-white border border-[#E8E0FA] rounded-2xl shadow-2xl max-h-56 overflow-y-auto overflow-x-hidden hide-scrollbar py-3">
                                        {filteredAgencies.map((agency) => (
                                            <li
                                                key={agency.id}
                                                onClick={() => { setSelectedAgencyName(agency.name); setIsDropdownOpen(false); }}
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

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="block text-xs font-black text-[#9CA3AF] ml-1 uppercase tracking-wider">
                            방문 일자 <span className="text-[#9333EA]">*</span>
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-5 py-4 text-base text-[#1F1235] focus:outline-none focus:border-[#9333EA] font-bold"
                        />
                    </div>

                    {/* ── 가이드 모드 ── */}
                    {mode === 'guide' && (
                        <div className="space-y-4">
                            {GUIDE_FIELDS.map((field, idx) => (
                                <div key={field.key} className="space-y-1.5">
                                    <label className="flex items-center gap-2 text-[13px] font-black text-[#5B4E7A]">
                                        <span className="text-[15px]">{field.icon}</span>
                                        {field.label}
                                        <span className="ml-auto text-[10px] text-[#C4B5FD] font-bold">선택</span>
                                    </label>
                                    <textarea
                                        value={guideFields[field.key]}
                                        onChange={(e) => handleGuideChange(field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        rows={field.rows}
                                        className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-3 text-sm text-[#1F1235] resize-none focus:outline-none focus:border-[#9333EA] focus:ring-4 focus:ring-[#9333EA]/5 transition-all font-bold leading-relaxed placeholder-[#C4B5FD]/60"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── 자유 작성 모드 ── */}
                    {mode === 'free' && (
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-[#9CA3AF] ml-1 uppercase tracking-wider">
                                투어 기록 <span className="text-[#9333EA]">*</span>
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="오늘의 방문 분위기, 특이사항, 피드백 등 어떤 내용이든 자유롭게 기록하세요!"
                                className="w-full h-44 bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-5 py-4 text-base text-[#1F1235] resize-none focus:outline-none focus:border-[#9333EA] font-bold leading-relaxed placeholder-[#9CA3AF]/40"
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#E8E0FA] bg-white flex-shrink-0">
                    <button
                        onClick={handleSave}
                        disabled={!canSave || isSaving}
                        className="w-full py-4 bg-gradient-to-br from-[#9333EA] to-[#7C3AED] hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed text-white text-[15px] font-black tracking-wide rounded-[20px] transition-all shadow-xl shadow-[#9333EA]/20 flex items-center justify-center gap-2.5 active:scale-[0.98]"
                    >
                        {!canSave ? (
                            <span>에이전시와 내용을 입력해주세요</span>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[22px] font-black">done_all</span>
                                {isSaving ? '저장 중...' : '일지 저장하기'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default QuickAddMemoModal;
