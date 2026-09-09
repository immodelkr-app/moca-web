import React, { useEffect, useRef, useState } from 'react';
import { getUser } from '../services/userService';
import {
    fetchLiveChatMessages, sendLiveChatMessage, subscribeToLiveChat,
    sendLiveHeart, subscribeToLiveHearts,
    fetchVisibleQuiz, subscribeToLiveQuiz, fetchMyQuizAnswer, submitQuizAnswer,
    fetchVisibleNumberGame, subscribeToNumberGame, fetchMyNumberGameEntry, submitNumberGuess,
    fetchVisibleKeywordEvent, subscribeToKeywordEvent, fetchMyKeywordEntry, subscribeToKeywordEntries,
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

    const [numberGame, setNumberGame] = useState(null);
    const [myNumberEntry, setMyNumberEntry] = useState(null);
    const [guessInput, setGuessInput] = useState('');
    const [submittingGuess, setSubmittingGuess] = useState(false);
    const [guessError, setGuessError] = useState('');

    const [keywordEvent, setKeywordEvent] = useState(null);
    const [myKeywordEntry, setMyKeywordEntry] = useState(null);

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

    // 숫자 맞추기
    useEffect(() => {
        if (!liveId) return;
        let mounted = true;

        const load = async () => {
            const g = await fetchVisibleNumberGame(liveId);
            if (!mounted) return;
            setNumberGame(g);
            if (g) {
                const entry = await fetchMyNumberGameEntry(g.id, myNickname);
                if (mounted) setMyNumberEntry(entry);
            }
        };
        load();

        const unsubscribe = subscribeToNumberGame(liveId, async (updated) => {
            if (!mounted || !updated) return;
            setNumberGame(updated);
        });

        return () => { mounted = false; unsubscribe(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveId]);

    const handleSubmitGuess = async (e) => {
        e.preventDefault();
        setGuessError('');
        if (!numberGame || numberGame.status !== 'open' || myNumberEntry || submittingGuess) return;

        const guess = Number(guessInput);
        if (!Number.isInteger(guess) || guess < numberGame.min_value || guess > numberGame.max_value) {
            setGuessError(`${numberGame.min_value}~${numberGame.max_value} 사이 숫자를 입력해주세요.`);
            return;
        }

        setSubmittingGuess(true);
        const { result, error } = await submitNumberGuess(numberGame.id, liveId, myNickname, guess);
        setSubmittingGuess(false);

        if (error) {
            setGuessError(error.message?.includes('duplicate') ? '이미 참여하셨어요.' : '제출에 실패했습니다.');
            return;
        }
        setMyNumberEntry({ guess, is_correct: result?.is_correct, is_winner: result?.is_winner, winner_rank: result?.winner_rank });
        if (result?.game_closed) setNumberGame((g) => (g ? { ...g, status: 'closed' } : g));
    };

    // 키워드 정답 맞추기 (참여는 채팅 입력 그대로 사용, 별도 제출 UI 없음)
    useEffect(() => {
        if (!liveId) return;
        let mounted = true;

        const load = async () => {
            const ev = await fetchVisibleKeywordEvent(liveId);
            if (!mounted) return;
            setKeywordEvent(ev);
            if (ev) {
                const entry = await fetchMyKeywordEntry(ev.id, myNickname);
                if (mounted) setMyKeywordEntry(entry);
            }
        };
        load();

        const unsubscribeEvent = subscribeToKeywordEvent(liveId, (updated) => {
            if (!mounted || !updated) return;
            setKeywordEvent(updated);
        });
        const unsubscribeEntries = subscribeToKeywordEntries(liveId, (entry) => {
            if (!mounted || entry.user_nickname !== myNickname) return;
            setMyKeywordEntry(entry);
        });

        return () => { mounted = false; unsubscribeEvent(); unsubscribeEntries(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveId]);

    const formatTime = (iso) => {
        if (!iso) return '';
        return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return (
        <div className="w-full flex flex-col gap-2 mt-2">
            {/* 키워드 정답 맞추기 카드 - 참여는 채팅 입력 그대로, 별도 제출 UI 없음 */}
            {keywordEvent && (
                <div className="rounded-2xl bg-white/95 backdrop-blur px-4 py-3 shadow-lg">
                    <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[13px]">💬</span>
                            <p className="text-[12px] font-black text-[#1F1235]">정답 맞추기 이벤트</p>
                        </div>
                        <span className="text-[10px] font-bold text-[#9CA3AF]">
                            {keywordEvent.current_winner_count}/{keywordEvent.winner_count}명 당첨
                        </span>
                    </div>
                    <p className="text-[12.5px] font-bold text-[#5B4E7A] mb-1 leading-snug">
                        방송에서 나온 정답을 채팅창에 그대로 쳐보세요! 정답이 들어있으면 자동으로 당첨돼요.
                    </p>
                    {keywordEvent.prize_label && (
                        <p className="text-[11px] font-bold text-[#9333EA] mb-1">🎁 {keywordEvent.prize_label}</p>
                    )}
                    {myKeywordEntry ? (
                        <p className="text-[11px] font-black text-emerald-600 mt-1">🎉 정답입니다! ({myKeywordEntry.winner_rank}번째 당첨) 포인트 지급을 기다려주세요.</p>
                    ) : keywordEvent.status === 'closed' ? (
                        <p className="text-[11px] font-bold text-[#9CA3AF] mt-1">마감되었습니다. 다음 이벤트를 노려보세요!</p>
                    ) : null}
                </div>
            )}

            {/* 숫자 맞추기 카드 */}
            {numberGame && (
                <div className="rounded-2xl bg-white/95 backdrop-blur px-4 py-3 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[13px]">🔢</span>
                            <p className="text-[12px] font-black text-[#1F1235]">숫자 맞추기</p>
                        </div>
                        <span className="text-[10px] font-bold text-[#9CA3AF]">
                            {numberGame.current_winner_count}/{numberGame.winner_count}명 당첨
                        </span>
                    </div>
                    <p className="text-[13px] font-bold text-[#1F1235] mb-1 leading-snug">
                        {numberGame.min_value}~{numberGame.max_value} 사이 숫자를 맞혀보세요!
                    </p>
                    {numberGame.prize_label && (
                        <p className="text-[11px] font-bold text-[#9333EA] mb-2.5">🎁 {numberGame.prize_label}</p>
                    )}

                    {numberGame.status === 'open' && !myNumberEntry && (
                        <form onSubmit={handleSubmitGuess} className="flex items-center gap-2">
                            <input
                                type="number"
                                value={guessInput}
                                onChange={(e) => setGuessInput(e.target.value)}
                                min={numberGame.min_value}
                                max={numberGame.max_value}
                                placeholder="숫자 입력"
                                className="flex-1 px-3 py-2 rounded-xl border border-[#E8E0FA] text-[13px] font-bold"
                            />
                            <button
                                type="submit"
                                disabled={!guessInput || submittingGuess}
                                className="px-4 py-2 rounded-xl bg-[#9333EA] text-white text-[12px] font-black disabled:opacity-40"
                            >
                                {submittingGuess ? '제출 중...' : '제출'}
                            </button>
                        </form>
                    )}
                    {guessError && <p className="text-[11px] font-bold text-red-500 mt-1.5">{guessError}</p>}

                    {myNumberEntry && (
                        <div className="mt-1">
                            <p className="text-[12px] font-bold text-[#1F1235]">
                                내가 제출한 숫자: <span className="text-[#9333EA]">{myNumberEntry.guess}</span>
                            </p>
                            {myNumberEntry.is_winner ? (
                                <p className="text-[11px] font-black text-emerald-600 mt-1">🎉 정답입니다! ({myNumberEntry.winner_rank}번째 당첨) 포인트 지급을 기다려주세요.</p>
                            ) : numberGame.status === 'closed' ? (
                                <p className="text-[11px] font-bold text-[#9CA3AF] mt-1">아쉬워요, 다음 게임을 노려보세요!</p>
                            ) : (
                                <p className="text-[11px] font-bold text-[#9333EA] mt-1">제출 완료! 결과를 기다려주세요.</p>
                            )}
                        </div>
                    )}
                    {numberGame.status === 'closed' && !myNumberEntry && (
                        <p className="text-[11px] font-bold text-[#9CA3AF] mt-1">마감되었습니다.</p>
                    )}
                </div>
            )}

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
