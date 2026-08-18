import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';
import { fetchOpenQuizzes, fetchAnnouncedQuizzes, fetchSubmissionCounts } from '../services/quizService';
import CeoQuizCard from './CeoQuizCard';

const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const QuizHistoryCard = ({ quiz, round, submissionCount }) => {
    const questions = quiz.questions || [];
    const winnerNicknames = quiz.winner_nicknames || [];

    return (
        <div className="bg-white border border-[#E8E0FA] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-black text-[#7C3AED] bg-[#F3E8FF] px-2.5 py-1 rounded-full">{round}회차</span>
                <span className="text-[11px] text-[#9CA3AF] font-bold">{formatDate(quiz.announced_at)} 발표</span>
            </div>

            <div className="space-y-1 mb-2.5">
                {questions.map((q, idx) => (
                    <p key={q.id} className="text-[13px] font-black text-[#1F1235] leading-snug">
                        {questions.length > 1 ? `Q${idx + 1}. ` : ''}정답 {quiz.correct_answers?.[q.id] || '-'}
                    </p>
                ))}
            </div>

            {quiz.prize_description && (
                <p className="text-[12px] font-bold text-[#8B7CC7] mb-2.5">🎁 {quiz.prize_description}</p>
            )}

            <div className="flex items-start justify-between gap-2 pt-2.5 border-t border-[#F3E8FF]">
                <p className="text-[11px] text-[#9CA3AF] font-bold whitespace-nowrap">
                    참여 {submissionCount ?? '-'}명 · 당첨 {winnerNicknames.length}명
                </p>
                {winnerNicknames.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-end">
                        {winnerNicknames.map((nick) => (
                            <span key={nick} className="px-2 py-0.5 rounded-full bg-[#F8F5FF] text-[#5B4E7A] text-[11px] font-black">
                                {nick}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-[11px] text-[#9CA3AF] font-bold">당첨자 없음</span>
                )}
            </div>
        </div>
    );
};

const CeoQuizBoard = () => {
    const navigate = useNavigate();
    const user = getUser();
    const myNickname = user?.nickname || user?.name || '익명모카';

    const [quizzes, setQuizzes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState('ongoing');
    const [historyQuizzes, setHistoryQuizzes] = useState([]);
    const [submissionCounts, setSubmissionCounts] = useState({});
    const [historyLoaded, setHistoryLoaded] = useState(false);

    const loadData = useCallback(async (showSpinner = true) => {
        if (showSpinner) setIsLoading(true);
        const data = await fetchOpenQuizzes();
        setQuizzes(data);
        setIsLoading(false);
    }, []);

    const loadHistory = useCallback(async () => {
        const [announced, counts] = await Promise.all([fetchAnnouncedQuizzes(), fetchSubmissionCounts()]);
        setHistoryQuizzes(announced);
        setSubmissionCounts(counts);
        setHistoryLoaded(true);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useEffect(() => {
        if (activeTab === 'history' && !historyLoaded) {
            loadHistory();
        }
    }, [activeTab, historyLoaded, loadHistory]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (activeTab === 'history') {
            await loadHistory();
        } else {
            await loadData(false);
        }
        setIsRefreshing(false);
    };

    // 회차 번호는 전체 퀴즈(진행중 탭 데이터, 생성순) 기준으로 매긴다
    const roundNumberById = {};
    [...quizzes].reverse().forEach((q, idx) => { roundNumberById[q.id] = idx + 1; });

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--moca-bg)', color: 'var(--moca-text)' }}>
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8E0FA]">
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                    <button
                        onClick={() => navigate('/home/dashboard')}
                        className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center border border-[#E8E0FA] hover:bg-[#EDE8FF] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px] text-[#7C3AED]">arrow_back</span>
                    </button>

                    <div className="text-center">
                        <h1 className="text-[#1F1235] font-black text-[17px] tracking-tight">🎁 김대표퀴즈</h1>
                        <p className="text-[#9CA3AF] text-[11px] mt-0.5 font-bold">정답 맞추고 상품 받아가세요!</p>
                    </div>

                    <button
                        onClick={handleRefresh}
                        className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center border border-[#E8E0FA] hover:bg-[#EDE8FF] transition-colors"
                    >
                        <span className={`material-symbols-outlined text-[20px] text-[#7C3AED] ${isRefreshing ? 'animate-spin' : ''}`}>
                            refresh
                        </span>
                    </button>
                </div>

                <div className="flex px-4 pb-3 gap-2">
                    <button
                        onClick={() => setActiveTab('ongoing')}
                        className={`flex-1 py-2 rounded-xl text-[13px] font-black transition-colors ${activeTab === 'ongoing' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3E8FF] text-[#7C3AED]'}`}
                    >
                        진행중
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2 rounded-xl text-[13px] font-black transition-colors ${activeTab === 'history' ? 'bg-[#7C3AED] text-white' : 'bg-[#F3E8FF] text-[#7C3AED]'}`}
                    >
                        지난 결과
                    </button>
                </div>
            </header>

            <div className="flex-1 px-4 py-4 pb-32 space-y-4">
                {activeTab === 'ongoing' ? (
                    isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white border border-[#E8E0FA] rounded-3xl overflow-hidden animate-pulse">
                                    <div className="px-5 pt-4 pb-3 space-y-2">
                                        <div className="w-16 h-4 bg-[#F3E8FF] rounded-full" />
                                        <div className="w-3/4 h-4 bg-[#F3E8FF] rounded-full" />
                                        <div className="w-1/2 h-3 bg-[#F8F5FF] rounded-full" />
                                    </div>
                                    <div className="px-5 pb-5">
                                        <div className="w-full h-16 bg-[#F8F5FF] rounded-2xl" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : quizzes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6C63FF]/20 to-[#A78BFA]/10 border border-[#6C63FF]/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#A78BFA] text-[40px]">quiz</span>
                            </div>
                            <p className="text-[#5B4E7A] text-[15px] text-center leading-relaxed whitespace-pre-line font-medium">
                                아직 진행중인 퀴즈가 없어요!{'\n'}곧 새로운 퀴즈가 열려요 🎁
                            </p>
                        </div>
                    ) : (
                        quizzes.map((quiz) => (
                            <CeoQuizCard key={quiz.id} quiz={quiz} myNickname={myNickname} />
                        ))
                    )
                ) : (
                    !historyLoaded ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white border border-[#E8E0FA] rounded-2xl p-4 animate-pulse space-y-2">
                                    <div className="w-16 h-4 bg-[#F3E8FF] rounded-full" />
                                    <div className="w-3/4 h-4 bg-[#F3E8FF] rounded-full" />
                                    <div className="w-full h-8 bg-[#F8F5FF] rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : historyQuizzes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6C63FF]/20 to-[#A78BFA]/10 border border-[#6C63FF]/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#A78BFA] text-[40px]">history</span>
                            </div>
                            <p className="text-[#5B4E7A] text-[15px] text-center leading-relaxed whitespace-pre-line font-medium">
                                아직 발표된 결과가 없어요!
                            </p>
                        </div>
                    ) : (
                        historyQuizzes.map((quiz) => (
                            <QuizHistoryCard
                                key={quiz.id}
                                quiz={quiz}
                                round={roundNumberById[quiz.id] || '-'}
                                submissionCount={submissionCounts[quiz.id]}
                            />
                        ))
                    )
                )}
            </div>
        </div>
    );
};

export default CeoQuizBoard;
