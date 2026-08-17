import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';
import { fetchOpenQuizzes } from '../services/quizService';
import CeoQuizCard from './CeoQuizCard';

const CeoQuizBoard = () => {
    const navigate = useNavigate();
    const user = getUser();
    const myNickname = user?.nickname || user?.name || '익명모카';

    const [quizzes, setQuizzes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = useCallback(async (showSpinner = true) => {
        if (showSpinner) setIsLoading(true);
        const data = await fetchOpenQuizzes();
        setQuizzes(data);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadData(false);
        setIsRefreshing(false);
    };

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
            </header>

            <div className="flex-1 px-4 py-4 pb-32 space-y-4">
                {isLoading ? (
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
                )}
            </div>
        </div>
    );
};

export default CeoQuizBoard;
