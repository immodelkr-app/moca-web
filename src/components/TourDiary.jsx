import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickAddMemoModal from './QuickAddMemoModal';
import EditDiaryModal from './EditDiaryModal';
import { fetchAllDiaries, deleteDiaryEntry } from '../services/diaryService';
import { getCastingSends, getMonthlyCount, SILVER_MONTHLY_LIMIT } from '../services/castingService';
import { getUser, getUserGrade } from '../services/userService';

const TourDiary = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('diary');
    const [allMemos, setAllMemos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [editingMemo, setEditingMemo] = useState(null);
    const [sendHistory, setSendHistory] = useState([]);
    const [sendLoading, setSendLoading] = useState(false);

    const loadDiaries = useCallback(async () => {
        setLoading(true);
        const memos = await fetchAllDiaries();
        const currentYear = new Date().getFullYear();
        const currentYearMemos = memos.filter(memo => {
            return new Date(memo.date).getFullYear() === currentYear;
        });
        setAllMemos(currentYearMemos);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadDiaries();
    }, [loadDiaries]);

    const handleDelete = async (memo) => {
        if (window.confirm(`'${memo.agencyName}' 방문 기록을 삭제하시겠습니까? 복구할 수 없습니다.`)) {
            await deleteDiaryEntry(memo.agencyName, memo.id);
            loadDiaries();
        }
    };


    // Helper to calculate X months/days ago
    const getTimeAgoStr = (dateStr) => {
        const recentMemoDate = new Date(dateStr);
        const today = new Date();

        recentMemoDate.setHours(0, 0, 0, 0);
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const diffTime = todayDate - recentMemoDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = (todayDate.getFullYear() - recentMemoDate.getFullYear()) * 12 + (todayDate.getMonth() - recentMemoDate.getMonth());

        if (diffMonths >= 1) {
            return `${diffMonths}개월 전`;
        } else if (diffDays > 0) {
            return `${diffDays}일 전`;
        } else if (diffDays === 0) {
            return '오늘';
        } else {
            return '';
        }
    };

    const groupedMemos = allMemos.reduce((acc, memo) => {
        if (!acc[memo.date]) {
            acc[memo.date] = [];
        }
        acc[memo.date].push(memo);
        return acc;
    }, {});

    // Calculate Dashboard Stats
    const totalVisits = allMemos.length;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthVisits = allMemos.filter(memo => {
        const d = new Date(memo.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;

    const agencyCounts = allMemos.reduce((acc, memo) => {
        acc[memo.agencyName] = (acc[memo.agencyName] || 0) + 1;
        return acc;
    }, {});
    let mostVisitedAgency = '없음';
    let maxVisits = 0;
    Object.entries(agencyCounts).forEach(([name, count]) => {
        if (count > maxVisits) {
            maxVisits = count;
            mostVisitedAgency = name;
        }
    });

    const loadSendHistory = useCallback(async () => {
        setSendLoading(true);
        const user = getUser();
        if (user?.nickname) {
            const sends = await getCastingSends(user.nickname);
            const sorted = [...sends].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
            setSendHistory(sorted);
        }
        setSendLoading(false);
    }, []);

    useEffect(() => {
        if (activeTab === 'email') loadSendHistory();
    }, [activeTab, loadSendHistory]);

    const refreshMemos = () => loadDiaries();

    return (
        <div className="p-6 pb-24 lg:pb-10 max-w-4xl mx-auto min-h-screen bg-[#0a0a0f]">
            <header className="mb-8 pt-4">
                <button
                    onClick={() => navigate('/agencies')}
                    className="flex items-center gap-2 text-white/40 hover:text-white mb-6 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    뒤로 가기
                </button>
                <div className="flex items-center gap-3 mb-3 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#6C63FF] to-[#A78BFA]" />
                        <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">활동 기록 모아보기</h1>
                    </div>
                    {activeTab === 'diary' && (
                        <button
                            onClick={() => navigate('/home/calendar')}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                            캘린더 뷰
                        </button>
                    )}
                </div>

                {/* 탭 */}
                <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-2xl">
                    <button
                        onClick={() => setActiveTab('diary')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'diary' ? 'bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/30' : 'text-white/40 hover:text-white/70'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        투어 일지
                    </button>
                    <button
                        onClick={() => setActiveTab('email')}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'email' ? 'bg-[#6C63FF] text-white shadow-lg shadow-[#6C63FF]/30' : 'text-white/40 hover:text-white/70'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">mail</span>
                        메일 발송 내역
                    </button>
                </div>

                {activeTab === 'diary' && (
                    <div className="ml-4 pl-1 mb-7 flex flex-col gap-1">
                        <p className="text-white/80 text-sm lg:text-base font-semibold tracking-wide">
                            올해({new Date().getFullYear()}년) 다녀온 에이전시 방문 기록입니다.
                        </p>
                        <p className="text-white/40 text-xs">꾸준한 기록은 캐스팅 성공의 지름길입니다 🚀</p>
                    </div>
                )}

            </header>

            {/* 투어일지 탭 */}
            {activeTab === 'diary' && (
                loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                    </div>
                ) : Object.keys(groupedMemos).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-[#1a1a24] rounded-3xl border border-white/5 shadow-xl">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[40px] text-white/20">edit_note</span>
                        </div>
                        <p className="text-white/60 font-medium text-center leading-relaxed">
                            아직 올해 작성된 방문 기록이 없습니다.<br />
                            에이전시 상세정보에서 일지를 남겨보세요!
                        </p>
                        <button
                            onClick={() => navigate('/agencies')}
                            className="mt-8 px-6 py-3 bg-[#6C63FF] hover:bg-[#5a52d5] text-white rounded-xl font-bold text-sm transition-colors shadow-lg"
                        >
                            에이전시 찾아보기
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedMemos).map(([date, memos]) => (
                            <div key={date} className="relative">
                                <div className="sticky top-0 z-10 bg-[#0a0a0f]/95 backdrop-blur-md py-4 mb-4 border-b border-white/5 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-[#6C63FF]">calendar_today</span>
                                    <h2 className="text-lg font-bold text-white tracking-wide">
                                        {date}
                                    </h2>
                                    <span className="px-2.5 py-1 rounded-full bg-white/5 text-xs text-white/40 font-bold ml-auto">
                                        {getTimeAgoStr(date)}
                                    </span>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                                    {memos.map((memo) => (
                                        <div
                                            key={memo.id}
                                            className="bg-[#1a1a24] border border-white/5 rounded-2xl p-6 hover:border-[#6C63FF]/30 hover:bg-[#1a1a24]/80 transition-all group overflow-hidden relative"
                                        >
                                            <div className="absolute top-0 left-0 w-1 h-full bg-[#6C63FF]/30 group-hover:bg-[#6C63FF] transition-colors" />

                                            <div className="flex items-start justify-between mb-4 pl-2">
                                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/10 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[16px] text-[#A78BFA]">apartment</span>
                                                    </div>
                                                    <h3 className="text-white font-black text-base truncate">{memo.agencyName}</h3>
                                                </div>
                                                <div className="flex items-center gap-1 ml-2 shrink-0">
                                                    <button
                                                        onClick={() => setEditingMemo(memo)}
                                                        title="수정"
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-amber-300 hover:bg-amber-400/10 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(memo)}
                                                        title="삭제"
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="pl-2">
                                                <p className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed min-h-[60px]">
                                                    {memo.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* 메일발송 내역 탭 */}
            {activeTab === 'email' && (
                sendLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                    </div>
                ) : sendHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-[#1a1a24] rounded-3xl border border-white/5 shadow-xl">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[40px] text-white/20">mail</span>
                        </div>
                        <p className="text-white/60 font-medium text-center leading-relaxed">
                            아직 발송된 메일이 없습니다.<br />
                            에이전시에 프로필을 발송해보세요!
                        </p>
                        <button
                            onClick={() => navigate('/agencies')}
                            className="mt-8 px-6 py-3 bg-[#6C63FF] hover:bg-[#5a52d5] text-white rounded-xl font-bold text-sm transition-colors shadow-lg"
                        >
                            에이전시 찾아보기
                        </button>
                    </div>
                ) : (() => {
                    const grade = getUserGrade();
                    const monthlyCount = getMonthlyCount(sendHistory);
                    return (
                        <div className="space-y-4">
                            {/* 프로필 발송현황 */}
                            <div className="bg-[#1a1a24] border border-white/10 rounded-3xl p-5 mb-2 shadow-xl">
                                <h2 className="text-sm font-bold text-white/40 mb-3 uppercase tracking-widest">프로필 발송현황</h2>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 bg-white/5 rounded-2xl p-4 text-center">
                                        <p className="text-white/40 text-xs font-bold mb-1">발송횟수</p>
                                        <p className="text-2xl font-black text-[#818CF8]">
                                            {monthlyCount}
                                            <span className="text-sm font-medium text-white/40 ml-1">
                                                {grade === 'GOLD' ? '회' : `/ ${SILVER_MONTHLY_LIMIT}회`}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex-1 bg-white/5 rounded-2xl p-4 text-center">
                                        <p className="text-white/40 text-xs font-bold mb-1">총발송처</p>
                                        <p className="text-2xl font-black text-[#34D399]">
                                            {sendHistory.length}
                                            <span className="text-sm font-medium text-white/40 ml-1">곳</span>
                                        </p>
                                    </div>
                                    <div className="flex-1 bg-white/5 rounded-2xl p-4 text-center">
                                        <p className="text-white/40 text-xs font-bold mb-1">최근발송처</p>
                                        <p className="text-sm font-black text-[#F472B6] truncate px-1 leading-tight mt-1">
                                            {sendHistory[0]?.agencyName || '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 발송 목록 */}
                            <div className="space-y-3">
                                {sendHistory.map((send, idx) => {
                                    const sentDate = new Date(send.sentAt);
                                    const dateStr = `${sentDate.getFullYear()}.${String(sentDate.getMonth() + 1).padStart(2, '0')}.${String(sentDate.getDate()).padStart(2, '0')}`;
                                    const isThisMonth = sentDate.getMonth() === new Date().getMonth() && sentDate.getFullYear() === new Date().getFullYear();
                                    return (
                                        <div
                                            key={idx}
                                            className="bg-[#1a1a24] border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-[#6C63FF]/30 transition-all group overflow-hidden relative"
                                        >
                                            <div className="absolute top-0 left-0 w-1 h-full bg-[#34D399]/30 group-hover:bg-[#34D399] transition-colors" />
                                            <div className="w-10 h-10 rounded-xl bg-[#34D399]/10 flex items-center justify-center shrink-0 ml-2">
                                                <span className="material-symbols-outlined text-[20px] text-[#34D399]">mark_email_read</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-black text-sm truncate">{send.agencyName}</h3>
                                                <p className="text-white/40 text-xs mt-0.5">{dateStr}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isThisMonth ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-white/5 text-white/30'}`}>
                                                    {getTimeAgoStr(send.sentAt.split('T')[0])}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()
            )}

            {/* Quick Add Floating Action Button (FAB) - 투어일지 탭에서만 표시 */}
            {activeTab === 'diary' && (
                <button
                    onClick={() => setIsQuickAddOpen(true)}
                    className="fixed bottom-32 lg:bottom-12 right-6 w-12 h-12 bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#6C63FF]/40 hover:scale-110 active:scale-95 transition-transform z-40 group"
                >
                    <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <span className="material-symbols-outlined text-[24px]">edit</span>
                </button>
            )}

            {/* Quick Add Modal */}
            {isQuickAddOpen && (
                <QuickAddMemoModal
                    onClose={() => setIsQuickAddOpen(false)}
                    onSuccess={refreshMemos}
                />
            )}

            {/* Edit Memo Modal */}
            {editingMemo && (
                <EditDiaryModal
                    memo={editingMemo}
                    onClose={() => setEditingMemo(null)}
                    onSuccess={() => {
                        setEditingMemo(null);
                        loadDiaries();
                    }}
                />
            )}
        </div>
    );
};

export default TourDiary;
