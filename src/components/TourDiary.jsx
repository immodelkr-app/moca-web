import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickAddMemoModal from './QuickAddMemoModal';
import EditDiaryModal from './EditDiaryModal';
import { fetchAllDiaries, deleteDiaryEntry } from '../services/diaryService';
import { getCastingSends, getMonthlyCount, SILVER_MONTHLY_LIMIT } from '../services/castingService';
import { getUser, getUserGrade } from '../services/userService';
import { modelActivityService } from '../services/modelActivityService';
import CastingRecordModal from './CastingRecordModal';
import { Trophy, Star, PlusCircle, Building } from 'lucide-react';

const TourDiary = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('diary');
    const [allMemos, setAllMemos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
    const [editingMemo, setEditingMemo] = useState(null);
    const [sendHistory, setSendHistory] = useState([]);
    const [sendLoading, setSendLoading] = useState(false);
    const [castingRecords, setCastingRecords] = useState([]);
    const [isCastingModalOpen, setIsCastingModalOpen] = useState(false);

    const loadDiaries = useCallback(async () => {
        setLoading(true);
        try {
            const memos = await fetchAllDiaries();
            const currentYear = new Date().getFullYear();
            const currentYearMemos = memos.filter(memo => {
                return new Date(memo.date).getFullYear() === currentYear;
            });
            setAllMemos(currentYearMemos);
        } catch (e) {
            console.warn('Failed to load diaries:', e);
            setAllMemos([]);
        }
        setLoading(false);
    }, []);

    const loadCastingRecords = useCallback(async () => {
        try {
            const user = getUser();
            if (user) {
                const records = await modelActivityService.getCastingRecords(user.id || user.nickname);
                setCastingRecords(records);
            }
        } catch (e) {
            console.warn('Failed to load casting records:', e);
            setCastingRecords([]);
        }
    }, []);

    useEffect(() => {
        loadDiaries();
        loadCastingRecords();
    }, [loadDiaries, loadCastingRecords]);

    const handleDelete = async (memo) => {
        if (window.confirm(`'${memo.agencyName}' 방문 기록을 삭제하시겠습니까? 복구할 수 없습니다.`)) {
            await deleteDiaryEntry(memo.agencyName, memo.id);
            loadDiaries();
        }
    };

    const getTimeAgoStr = (dateStr) => {
        if (!dateStr) return '';
        const recentMemoDate = new Date(dateStr);
        const today = new Date();
        recentMemoDate.setHours(0, 0, 0, 0);
        const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const diffTime = todayDate - recentMemoDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffMonths = (todayDate.getFullYear() - recentMemoDate.getFullYear()) * 12 + (todayDate.getMonth() - recentMemoDate.getMonth());

        if (diffMonths >= 1) return `${diffMonths}개월 전`;
        if (diffDays > 0) return `${diffDays}일 전`;
        if (diffDays === 0) return '오늘';
        return '';
    };

    const groupedMemos = allMemos.reduce((acc, memo) => {
        if (!acc[memo.date]) acc[memo.date] = [];
        acc[memo.date].push(memo);
        return acc;
    }, {});

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

    return (
        <div className="p-6 pb-24 lg:pb-10 max-w-4xl mx-auto min-h-screen bg-[#F8F5FF]">
            <header className="mb-8 pt-4">
                <button
                    onClick={() => navigate('/home')}
                    className="flex items-center gap-2 text-[#9CA3AF] hover:text-[#9333EA] mb-6 transition-colors font-bold"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    홈으로
                </button>
                <div className="flex items-center gap-3 mb-3 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#6C63FF] to-[#A78BFA]" />
                        <h1 className="text-xl lg:text-2xl font-bold text-[#1F1235] tracking-tight">모델 다이어리</h1>
                    </div>
                    {activeTab === 'diary' && (
                        <button
                            onClick={() => navigate('/home/calendar')}
                            className="px-4 py-2 bg-[#F3E8FF] hover:bg-[#EDE8FF] border border-[#E8E0FA] rounded-xl text-xs font-bold text-[#7C3AED] transition-colors flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                            캘린더
                        </button>
                    )}
                </div>

                {/* 탭 네비게이션 */}
                <div className="flex gap-2 mb-6 bg-[#F3E8FF] p-1 rounded-2xl overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('diary')}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'diary' ? 'bg-[#9333EA] text-white shadow-lg shadow-[#9333EA]/30' : 'text-[#5B4E7A] hover:text-[#1F1235]'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        방문 기록
                    </button>
                    <button
                        onClick={() => setActiveTab('casting')}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'casting' ? 'bg-[#9333EA] text-white shadow-lg shadow-[#9333EA]/30' : 'text-[#5B4E7A] hover:text-[#1F1235]'}`}
                    >
                        <Trophy size={16} />
                        캐스팅 기록
                    </button>
                    <button
                        onClick={() => setActiveTab('email')}
                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'email' ? 'bg-[#9333EA] text-white shadow-lg shadow-[#9333EA]/30' : 'text-[#5B4E7A] hover:text-[#1F1235]'}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">mail</span>
                        발송 내역
                    </button>
                </div>

                {activeTab === 'diary' && (
                    <div className="ml-1 mb-7 flex flex-col gap-1">
                        <p className="text-[#5B4E7A] text-sm lg:text-base font-bold tracking-wide">
                            올해({new Date().getFullYear()}년) 에이전시 방문 기록입니다.
                        </p>
                        <p className="text-[#9CA3AF] text-xs font-medium">꾸준한 기록은 캐스팅 성공의 지름길입니다 🚀</p>
                    </div>
                )}
            </header>

            {/* 방문 기록 탭 */}
            {activeTab === 'diary' && (
                loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                    </div>
                ) : Object.keys(groupedMemos).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-[#E8E0FA] shadow-lg shadow-[#9333EA]/5">
                        <div className="w-20 h-20 rounded-full bg-[#F3E8FF] flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[40px] text-[#9333EA]">edit_note</span>
                        </div>
                        <p className="text-[#5B4E7A] font-bold text-center leading-relaxed">
                            아직 작성된 방문 기록이 없습니다.<br />
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
                                <div className="sticky top-0 z-10 py-5 mb-5 border-b border-[#E8E0FA] flex items-center gap-3 bg-[#F8F5FF]">
                                    <span className="material-symbols-outlined text-[#9333EA] text-[20px]">calendar_today</span>
                                    <h2 className="text-lg font-black text-[#1F1235] tracking-tight">{date}</h2>
                                    <span className="px-3 py-1.5 rounded-full bg-white border border-[#E8E0FA] text-[11px] text-[#5B4E7A] font-black ml-auto shadow-sm">
                                        {getTimeAgoStr(date)}
                                    </span>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {memos.map((memo) => (
                                        <div key={memo.id} className="bg-white border border-[#E8E0FA] rounded-2xl p-6 hover:border-[#9333EA]/30 hover:shadow-sm transition-all group overflow-hidden relative">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-[#6C63FF]/30 group-hover:bg-[#6C63FF] transition-colors" />
                                            <div className="flex items-start justify-between mb-4 pl-2">
                                                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-[#6C63FF]/10 flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-[16px] text-[#A78BFA]">apartment</span>
                                                    </div>
                                                    <h3 className="text-[#1F1235] font-black text-base truncate">{memo.agencyName}</h3>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button onClick={() => setEditingMemo(memo)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-[#9333EA] hover:bg-[#F3E8FF] transition-all"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                    <button onClick={() => handleDelete(memo)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 transition-all"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                </div>
                                            </div>
                                            <div className="pl-2">
                                                <p className="text-[#5B4E7A] text-sm whitespace-pre-wrap leading-relaxed min-h-[40px]">{memo.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* 캐스팅 기록 탭 */}
            {activeTab === 'casting' && (
                <div className="space-y-6">
                    <button 
                        onClick={() => setIsCastingModalOpen(true)}
                        className="w-full py-6 bg-white border-2 border-[#9333EA]/20 border-dashed rounded-3xl flex flex-col items-center justify-center gap-2 text-[#9333EA] font-bold hover:bg-[#F3E8FF]/30 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-full bg-[#F3E8FF] flex items-center justify-center group-hover:scale-110 transition-transform">
                            <PlusCircle size={24} />
                        </div>
                        새로운 캐스팅 성공 기록하기
                    </button>

                    {castingRecords.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-[32px] border border-[#E8E0FA]">
                            <div className="w-20 h-20 bg-[#F8F5FF] rounded-full flex items-center justify-center mx-auto mb-6 text-[#9CA3AF]">
                                <Trophy size={40} />
                            </div>
                            <p className="text-[#5B4E7A] font-bold">아직 기록된 캐스팅이 없습니다.<br/>첫 번째 성공을 기록해보세요! 🏆</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                            {castingRecords.map((record) => (
                                <div key={record.id} className="bg-white p-6 rounded-2xl border border-[#E8E0FA] shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-3">
                                        <Trophy size={20} className="text-[#FFD700] opacity-30" />
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-2.5 py-1 bg-[#F3E8FF] text-[#9333EA] rounded-lg text-[10px] font-black uppercase tracking-wider border border-[#E8E0FA]">
                                            {record.casting_type}
                                        </span>
                                        <span className="text-[11px] text-[#9CA3AF] font-bold">{new Date(record.casting_date).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-lg font-black text-[#1F1235] mb-2 leading-tight">{record.project_name}</h3>
                                    <div className="flex items-center gap-2 text-sm text-[#5B4E7A] font-bold">
                                        <Building size={14} className="text-[#A78BFA]" />
                                        <span>{record.agency_name || '에이전시 정보 없음'}</span>
                                    </div>
                                    {record.notes && (
                                        <p className="mt-4 text-[13px] text-[#5B4E7A] bg-[#F8F5FF] p-3 rounded-xl leading-relaxed italic">
                                            "{record.notes}"
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 메일 발송 내역 탭 */}
            {activeTab === 'email' && (
                sendLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                    </div>
                ) : sendHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[32px] border border-[#E8E0FA] shadow-lg">
                        <div className="w-20 h-20 rounded-full bg-[#F3E8FF] flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-[40px] text-[#9333EA]">mail</span>
                        </div>
                        <p className="text-[#5B4E7A] font-bold text-center">발송된 메일이 없습니다.</p>
                        <button onClick={() => navigate('/agencies')} className="mt-8 px-8 py-3 bg-[#9333EA] text-white rounded-2xl font-bold">에이전시 찾아보기</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-white border border-[#E8E0FA] rounded-[32px] p-6 shadow-sm flex items-center justify-around text-center">
                            <div>
                                <p className="text-[#5B4E7A] text-[10px] font-black uppercase mb-1">Total Sent</p>
                                <p className="text-2xl font-black text-[#9333EA]">{sendHistory.length}<span className="text-sm ml-0.5">곳</span></p>
                            </div>
                            <div className="w-px h-10 bg-[#E8E0FA]" />
                            <div>
                                <p className="text-[#5B4E7A] text-[10px] font-black uppercase mb-1">This Month</p>
                                <p className="text-2xl font-black text-[#10B981]">{getMonthlyCount(sendHistory)}<span className="text-sm ml-0.5">회</span></p>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {sendHistory.map((send, idx) => (
                                <div key={idx} className="bg-white border border-[#E8E0FA] rounded-2xl p-4 flex items-center gap-4 hover:border-[#9333EA]/30 transition-all shadow-sm">
                                    <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981]">
                                        <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[#1F1235] font-bold text-sm truncate">{send.agencyName}</h3>
                                        <p className="text-[#9CA3AF] text-[11px]">{new Date(send.sentAt).toLocaleDateString()}</p>
                                    </div>
                                    <span className="text-[11px] font-bold text-[#5B4E7A] bg-[#F8F5FF] px-2 py-1 rounded-lg">
                                        {getTimeAgoStr(send.sentAt.split('T')[0])}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            )}

            {/* Quick Add FAB */}
            {activeTab === 'diary' && (
                <button
                    onClick={() => setIsQuickAddOpen(true)}
                    className="fixed bottom-32 lg:bottom-12 right-6 w-14 h-14 bg-gradient-to-br from-[#9333EA] to-[#7C3AED] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all z-40 border-2 border-white/20"
                >
                    <span className="material-symbols-outlined text-[26px] font-black">edit</span>
                </button>
            )}

            <QuickAddMemoModal isOpen={isQuickAddOpen} onClose={() => setIsQuickAddOpen(false)} onSuccess={loadDiaries} />
            <EditDiaryModal memo={editingMemo} isOpen={!!editingMemo} onClose={() => setEditingMemo(null)} onSuccess={loadDiaries} />
            <CastingRecordModal isOpen={isCastingModalOpen} onClose={() => setIsCastingModalOpen(false)} onSuccess={loadCastingRecords} />
        </div>
    );
};

export default TourDiary;
