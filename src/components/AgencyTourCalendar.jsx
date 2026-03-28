import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAllDiaries } from '../services/diaryService';
import QuickAddMemoModal from './QuickAddMemoModal';
import CalendarDayDetailsModal from './CalendarDayDetailsModal';

const AgencyTourCalendar = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [diaries, setDiaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [selectedDateToQuickAdd, setSelectedDateToQuickAdd] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const loadDiaries = useCallback(async () => {
        setLoading(true);
        const memos = await fetchAllDiaries();
        setDiaries(memos);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadDiaries();
    }, [loadDiaries]);


    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // 정규 공휴일 및 하드코딩된 명절(2026~2027) 로직
    const isHoliday = (d) => {
        const m = d.getMonth() + 1;
        const date = d.getDate();
        const y = d.getFullYear();

        // 매년 고정 공휴일 (신정, 삼일절, 어린이날, 현충일, 광복절, 개천절, 한글날, 크리스마스)
        if (m === 1 && date === 1) return true; // 신정
        if (m === 3 && date === 1) return true; // 삼일절
        if (m === 5 && date === 5) return true; // 어린이날
        if (m === 6 && date === 6) return true; // 현충일
        if (m === 8 && date === 15) return true; // 광복절
        if (m === 10 && date === 3) return true; // 개천절
        if (m === 10 && date === 9) return true; // 한글날
        if (m === 12 && date === 25) return true; // 성탄절

        // 구정(설날) 연휴 (대체휴일 포함)
        if (y === 2026 && m === 2 && (date >= 16 && date <= 18)) return true;
        if (y === 2027 && m === 2 && (date >= 5 && date <= 8)) return true;

        // 추석 연휴 (대체휴일 포함)
        if (y === 2026 && m === 9 && (date >= 24 && date <= 26)) return true;
        if (y === 2027 && m === 9 && (date >= 14 && date <= 16)) return true;

        // 추가로 필요한 과거/미래 명절은 여기에 계속 매핑
        return false;
    };

    const isBicSeason = (d) => {
        const checkMonth = d.getMonth() + 1;
        const checkDate = d.getDate();
        const checkYear = d.getFullYear();

        // 2026년 8월 3일 ~ 9월 4일
        if (checkYear === 2026) {
            if (checkMonth === 8 && checkDate >= 3) return true;
            if (checkMonth === 9 && checkDate <= 4) return true;
        }

        // 2027년 1월 11일 ~ 2월 4일
        if (
            (checkYear === 2027 && checkMonth === 1 && checkDate >= 11) ||
            (checkYear === 2027 && checkMonth === 2 && checkDate <= 4)
        ) {
            return true;
        }

        return false;
    };

    // 달력 날짜 계산
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const startDate = new Date(firstDayOfMonth);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // 주의 시작일(일요일)

        const endDate = new Date(lastDayOfMonth);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // 주의 종료일(토요일)

        const days = [];
        let currentDay = new Date(startDate);

        while (currentDay <= endDate) {
            days.push(new Date(currentDay));
            currentDay.setDate(currentDay.getDate() + 1);
        }

        return days;
    }, [year, month]);

    // 일지 데이터를 날짜별로 매핑 (YYYY-MM-DD)
    const diariesByDate = useMemo(() => {
        const map = {};
        diaries.forEach(memo => {
            if (!map[memo.date]) {
                map[memo.date] = [];
            }
            map[memo.date].push(memo);
        });
        return map;
    }, [diaries]);

    const handleDayClick = (day) => {
        const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

        // 일지가 있으면 상세 모달, 없으면 추가 모달로 이동 (사용자 편의)
        setSelectedDate(dateStr);
    };

    const handleQuickAddSuccess = () => {
        loadDiaries();
        setIsQuickAddOpen(false);
        setSelectedDateToQuickAdd(null);
    };

    const handleOpenQuickAddWithDate = (dateStr) => {
        setSelectedDate(null); // Close details modal
        setSelectedDateToQuickAdd(dateStr);
        setIsQuickAddOpen(true);
    };


    return (
        <div className="p-4 lg:p-6 pb-28 lg:pb-10 max-w-5xl mx-auto min-h-screen" style={{backgroundColor:'var(--moca-bg)'}}>
            {/* Header */}
            <header className="mb-6 pt-2">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => navigate('/home/diary')}
                        className="flex items-center gap-2 text-[#9CA3AF] hover:text-[#1F1235] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        리스트로 보기
                    </button>
                    <button
                        onClick={handleToday}
                        className="px-3 py-1.5 rounded-full bg-[#F3E8FF] border border-[#E8E0FA] text-xs text-[#7C3AED] font-bold hover:bg-[#EDE8FF] transition-colors"
                    >
                        오늘
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-[#9333EA] to-[#C084FC]" />
                        <h1 className="text-2xl font-black text-[#1F1235] tracking-tight flex items-center gap-2">
                            투어 캘린더 일지
                        </h1>
                    </div>
                </div>
            </header>

            {/* Calendar View */}
            <div className="bg-white border border-[#E8E0FA] rounded-3xl overflow-hidden shadow-sm relative">
                {/* Big Season Legend */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 sm:gap-2 bg-white/95 backdrop-blur-md px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-yellow-300/60 shadow-lg shadow-yellow-400/20">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,1)] animate-pulse" />
                    <span className="text-[9px] sm:text-[10px] font-bold text-yellow-300 tracking-wider">Big Season</span>
                </div>

                {/* Calendar Control */}
                <div className="p-4 sm:p-6 border-b border-[#E8E0FA] flex items-center justify-center gap-4 sm:gap-6 bg-white sticky top-0 z-10 pt-10 sm:pt-6">
                    <button onClick={handlePrevMonth} className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[#7C3AED] hover:bg-[#EDE8FF] transition-all">
                        <span className="material-symbols-outlined text-[24px]">chevron_left</span>
                    </button>

                    <h2 className="text-xl sm:text-2xl font-black text-[#1F1235] min-w-[140px] text-center tracking-tight">
                        {year}년 {month + 1}월
                    </h2>

                    <button onClick={handleNextMonth} className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[#7C3AED] hover:bg-[#EDE8FF] transition-all">
                        <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                    </div>
                ) : (
                    <div className="p-2 sm:p-4">
                        {/* Days of Week */}
                        <div className="grid grid-cols-7 mb-2">
                            {['일', '월', '화', '수', '목', '금', '토'].map((dayName, idx) => (
                                <div key={dayName} className={`text-center py-2 text-xs font-bold ${idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-[#9CA3AF]'}`}>
                                    {dayName}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 sm:gap-2">
                            {calendarDays.map((day, idx) => {
                                const isCurrentMonth = day.getMonth() === month;
                                const isToday = day.toDateString() === new Date().toDateString();
                                const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                                const dayDiaries = diariesByDate[dateStr] || [];
                                const isSeason = isBicSeason(day);
                                const isSunday = day.getDay() === 0;
                                const isSaturday = day.getDay() === 6;
                                const isHolidayDay = isHoliday(day);

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleDayClick(day)}
                                        className={`
                                            relative flex flex-col min-h-[80px] sm:min-h-[100px] rounded-xl border p-1 sm:p-2 cursor-pointer transition-all group overflow-hidden
                                            ${isCurrentMonth ? 'bg-[#F8F5FF] hover:bg-[#F3E8FF]' : 'bg-transparent opacity-30 pointer-events-none'}
                                            ${isToday ? 'border-[#9333EA] bg-[#F3E8FF] z-10' :
                                                (isSeason && isCurrentMonth) ? 'border-yellow-400/80 bg-yellow-50 shadow-[0_0_10px_rgba(250,204,21,0.2)] z-0' : 'border-[#E8E0FA]'}
                                        `}
                                    >
                                        {/* Big Season Glow Effect */}
                                        {isSeason && isCurrentMonth && (
                                            <div className="absolute inset-0 bg-yellow-400/10 pointer-events-none" />
                                        )}

                                        {/* Date Number */}
                                        <div className="flex items-center justify-between w-full z-10 relative">
                                            <span className={`
                                                text-sm font-bold flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full
                                                ${isToday ? 'bg-[#9333EA] text-white' : ''}
                                                ${!isToday && (isSunday || isHolidayDay) ? 'text-red-400' : ''}
                                                ${!isToday && isSaturday && !isHolidayDay ? 'text-blue-400' : ''}
                                                ${!isToday && !isSunday && !isSaturday && !isHolidayDay ? 'text-[#1F1235]' : ''}
                                            `}>
                                                {day.getDate()}
                                            </span>
                                        </div>

                                        {/* Diary Chips (Truncated list if too many) */}
                                        <div className="flex-1 mt-1 sm:mt-2 space-y-1 overflow-hidden z-10 relative">
                                             {dayDiaries.slice(0, 3).map((memo, mIdx) => (
                                                 <div key={mIdx} className="w-full truncate text-[9px] sm:text-[10px] font-black bg-white border border-[#E8E0FA] text-[#7C3AED] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md shadow-sm">
                                                     {memo.agencyName}
                                                 </div>
                                             ))}
                                            {dayDiaries.length > 3 && (
                                                <div className="text-[9px] text-[#9CA3AF] pl-1 font-bold">
                                                    +{dayDiaries.length - 3} 더보기
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Quick Add */}
             <button
                 onClick={() => setIsQuickAddOpen(true)}
                 className="fixed bottom-32 lg:bottom-12 right-6 w-14 h-14 bg-gradient-to-br from-[#9333EA] to-[#7C3AED] text-white rounded-full flex items-center justify-center shadow-2xl shadow-[#9333EA]/40 hover:scale-110 active:scale-95 transition-all z-40 group border-2 border-white/20"
             >
                 <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <span className="material-symbols-outlined text-[26px] font-black">edit</span>
             </button>


            {/* Modals */}
            {selectedDate && (
                <CalendarDayDetailsModal
                    dateStr={selectedDate}
                    diaries={diariesByDate[selectedDate] || []}
                    onClose={() => setSelectedDate(null)}
                    onAddClick={() => handleOpenQuickAddWithDate(selectedDate)}
                    onContentChange={loadDiaries}
                />
            )}

            {(isQuickAddOpen || selectedDateToQuickAdd) && (
                <QuickAddMemoModal
                    initialDate={selectedDateToQuickAdd}
                    onClose={() => {
                        setIsQuickAddOpen(false);
                        setSelectedDateToQuickAdd(null);
                    }}
                    onSuccess={handleQuickAddSuccess}
                />
            )}

        </div>
    );
};

export default AgencyTourCalendar;
