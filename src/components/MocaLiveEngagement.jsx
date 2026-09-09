import React, { useEffect, useRef, useState } from 'react';
import { getUser } from '../services/userService';
import {
    fetchLiveChatMessages, sendLiveChatMessage, subscribeToLiveChat,
    sendLiveHeart, subscribeToLiveHearts,
    fetchVisibleQuiz, subscribeToLiveQuiz, fetchMyQuizAnswer, submitQuizAnswer,
} from '../services/mocaLiveEngagementService';

let heartUid = 0;

// 모카TV 라이브 시청 중 소통 기능: 실시간 채팅 + 하트 + 실시간 퀴즈.
// 영상 플레이어 아래(또는 옆)에 붙여서 쓰는 오버레이형 컴포넌트.
const MocaLiveEngagement = ({ liveId }) => {
    const user = getUser();
    const myNickname = user?.nickname || user?.name || '익명모카';

    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    const [hearts, setHearts] = useState([]);

    const [quiz, setQuiz] = useState(null);
    const [myAnswer, setMyAnswer] = useState(null);
    const [submittingAnswer, setSubmittingAnswer] = useState(false);

    // 채팅
    useEffect(() => {
        if (!liveId) return;
        let mounted = true;

        fetchLiveChatMessages(liveId).then((data) => { if (mounted) setMessages(data); });
        const unsubscribe = subscribeToLiveChat(liveId, (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        return () => { mounted = false; unsubscribe(); };
    }, [liveId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const text = inputValue.trim();
        if (!text || sending) return;

        setSending(true);
        setInputValue('');
        await sendLiveChatMessage(liveId, myNickname, text);
        setSending(false);
    };

    // 하트
    useEffect(() => {
        if (!liveId) return;
        const unsubscribe = subscribeToLiveHearts(liveId, () => {
            spawnHeart();
        });
        return unsubscribe;
    }, [liveId]);

    const spawnHeart = () => {
        const id = heartUid++;
        const left = 10 + Math.random() * 70;
        setHearts((prev) => [...prev, { id, left }]);
        setTimeout(() => {
            setHearts((prev) => prev.filter((h) => h.id !== id));
        }, 1800);
    };

    const handleTapHeart = () => {
        spawnHeart();
        sendLiveHeart(liveId);
    };

    // 실시간 퀴즈
    useEffect(() => {
        if (!liveId) return;
        let mounted = true;

        const load = async () => {
            const q = await fetchVisibleQuiz(liveId);
            if (!mounted) return;
            setQuiz(q);
            if (q) {
                const ans = await fetchMyQuizAnswer(q.id, myNickname);
                if (mounted) setMyAnswer(ans);
            }
        };
        load();

        const unsubscribe = subscribeToLiveQuiz(liveId, async (updated) => {
            if (!mounted || !updated) return;
            setQuiz(updated);
            const ans = await fetchMyQuizAnswer(updated.id, myNickname);
            if (mounted) setMyAnswer(ans);
        });

        return () => { mounted = false; unsubscribe(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveId]);

    const handleAnswer = async (optionIndex) => {
        if (!quiz || quiz.status !== 'open' || myAnswer || submittingAnswer) return;
        setSubmittingAnswer(true);
        setMyAnswer({ selected_option_index: optionIndex, is_correct: null }); // optimistic
        const { error } = await submitQuizAnswer(quiz.id, liveId, myNickname, optionIndex);
        if (error) setMyAnswer(null);
        setSubmittingAnswer(false);
    };

    const formatTime = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return (
        <div className="w-full flex flex-col gap-2 mt-2">
            {/* 실시간 퀴즈 카드 */}
            {quiz && (
                <div className="rounded-2xl bg-white/95 backdrop-blur px-4 py-3 shadow-lg">
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[13px]">🎮</span>
                        <p className="text-[12px] font-black text-[#1F1235]">
                            {quiz.status === 'open' ? '실시간 퀴즈' : '퀴즈 결과'}
                        </p>
                    </div>
                    <p className="text-[13px] font-bold text-[#1F1235] mb-2.5 leading-snug">{quiz.question}</p>
                    <div className="flex flex-col gap-1.5">
                        {(quiz.options || []).map((opt, idx) => {
                            const isMine = myAnswer?.selected_option_index === idx;
                            const isCorrectReveal = quiz.status === 'closed' && quiz.correct_option_index === idx;
                            let cls = 'border-[#E8E0FA] text-[#1F1235] bg-white';
                            if (quiz.status === 'closed') {
                                if (isCorrectReveal) cls = 'border-emerald-400 bg-emerald-50 text-emerald-700';
                                else if (isMine) cls = 'border-red-300 bg-red-50 text-red-500';
                            } else if (isMine) {
                                cls = 'border-[#9333EA] bg-[#F3E8FF] text-[#9333EA]';
                            }
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleAnswer(idx)}
                                    disabled={quiz.status !== 'open' || !!myAnswer}
                                    className={`w-full text-left px-3 py-2 rounded-xl border text-[12.5px] font-bold transition-colors disabled:cursor-default ${cls}`}
                                >
                                    {opt}
                                    {isMine && ' · 내 답변'}
                                    {isCorrectReveal && ' · 정답 ✅'}
                                </button>
                            );
                        })}
                    </div>
                    {quiz.status === 'open' && myAnswer && (
                        <p className="text-[11px] font-bold text-[#9333EA] mt-2">제출 완료! 결과 발표를 기다려주세요.</p>
                    )}
                    {quiz.status === 'closed' && myAnswer?.is_correct === true && (
                        <p className="text-[11px] font-black text-emerald-600 mt-2">🎉 정답입니다! 포인트 지급을 기다려주세요.</p>
                    )}
                    {quiz.status === 'closed' && myAnswer?.is_correct === false && (
                        <p className="text-[11px] font-bold text-[#9CA3AF] mt-2">아쉬워요, 다음 퀴즈를 노려보세요!</p>
                    )}
                </div>
            )}

            {/* 채팅 + 하트 */}
            <div className="rounded-2xl bg-black/40 backdrop-blur overflow-hidden flex flex-col">
                <div className="h-40 overflow-y-auto px-3 py-2 flex flex-col gap-1.5 hide-scrollbar">
                    {messages.length === 0 && (
                        <p className="text-[11px] text-white/50 font-bold text-center py-4">첫 채팅을 남겨보세요!</p>
                    )}
                    {messages.map((msg, idx) => (
                        <div key={msg.id || idx} className="flex items-baseline gap-1.5 text-[12px] leading-snug">
                            <span className="font-black text-[#C084FC] flex-shrink-0">{msg.user_nickname}</span>
                            <span className="text-white/90 font-medium break-words">{msg.message}</span>
                            <span className="text-[9px] text-white/40 flex-shrink-0 ml-auto">{formatTime(msg.created_at)}</span>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="flex items-center gap-2 px-2.5 py-2 border-t border-white/10">
                    <input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="응원 메시지를 남겨보세요"
                        maxLength={200}
                        className="flex-1 bg-white/10 rounded-full px-3.5 py-2 text-[12.5px] text-white placeholder-white/40 outline-none font-medium"
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim() || sending}
                        className="w-9 h-9 rounded-full bg-[#9333EA] flex items-center justify-center flex-shrink-0 disabled:opacity-30 active:scale-90 transition-all"
                    >
                        <span className="material-symbols-outlined text-[16px] text-white">send</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleTapHeart}
                        className="relative w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px] text-red-400">favorite</span>
                        {hearts.map((h) => (
                            <span
                                key={h.id}
                                className="absolute bottom-1/2 text-red-400 text-[16px] pointer-events-none animate-moca-heart-float"
                                style={{ left: `${h.left}%` }}
                            >
                                ❤️
                            </span>
                        ))}
                    </button>
                </form>
            </div>

            <style>{`
                @keyframes moca-heart-float {
                    0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
                    15% { opacity: 1; }
                    100% { transform: translate(-50%, -90px) scale(1.1); opacity: 0; }
                }
                .animate-moca-heart-float { animation: moca-heart-float 1.8s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default MocaLiveEngagement;
