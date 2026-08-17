import React, { useState, useEffect } from 'react';
import { fetchMySubmission, submitAnswer, fetchAnnouncedQuizDetail } from '../services/quizService';

const STATUS_BADGE = {
    open: { label: '진행중', className: 'bg-emerald-100 text-emerald-700' },
    closed: { label: '마감 · 결과 발표 대기중', className: 'bg-amber-100 text-amber-700' },
    announced: { label: '발표완료', className: 'bg-gray-100 text-gray-500' },
};

const extractYoutubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([\w-]{11})/);
    return match ? match[1] : null;
};

const CeoQuizCard = ({ quiz, myNickname }) => {
    const questions = quiz.questions || [];

    const [mySubmission, setMySubmission] = useState(null);
    const [loadingSubmission, setLoadingSubmission] = useState(true);
    const [draftAnswers, setDraftAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [announcedDetail, setAnnouncedDetail] = useState(null);
    const [showVideoModal, setShowVideoModal] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const data = await fetchMySubmission(quiz.id, myNickname);
            if (!cancelled) {
                setMySubmission(data);
                setLoadingSubmission(false);
            }
        })();
        return () => { cancelled = true; };
    }, [quiz.id, myNickname]);

    useEffect(() => {
        if (quiz.status !== 'announced') return;
        let cancelled = false;
        (async () => {
            const data = await fetchAnnouncedQuizDetail(quiz.id);
            if (!cancelled) setAnnouncedDetail(data);
        })();
        return () => { cancelled = true; };
    }, [quiz.id, quiz.status]);

    const setDraftAnswer = (questionId, value) => {
        setDraftAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const handleSubmit = async () => {
        const answers = {};
        for (const q of questions) {
            const raw = draftAnswers[q.id];
            const value = q.questionType === 'multiple_choice' ? (raw || '') : (raw || '').trim();
            if (!value) {
                setError(`"${q.question}"에 ${q.questionType === 'multiple_choice' ? '보기를 선택' : '답변을 입력'}해주세요.`);
                return;
            }
            answers[q.id] = value;
        }
        setError('');
        setSubmitting(true);
        const { submission, error: submitError } = await submitAnswer(quiz.id, myNickname, answers);
        setSubmitting(false);

        if (submitError) {
            if (submitError.code === '23505') {
                setError('이미 이 퀴즈에 답변을 제출했습니다.');
                const existing = await fetchMySubmission(quiz.id, myNickname);
                setMySubmission(existing);
            } else {
                setError('제출 중 오류가 발생했습니다: ' + (submitError.message || '다시 시도해주세요.'));
            }
            return;
        }
        setMySubmission(submission);
    };

    const status = STATUS_BADGE[quiz.status] || STATUS_BADGE.open;
    const winnerNicknames = quiz.winner_nicknames || [];
    const iWon = winnerNicknames.includes(myNickname);
    const youtubeId = extractYoutubeId(quiz.video_url);
    const isVerticalVideo = /shorts\//.test(quiz.video_url || '');

    const isAnswerForm = quiz.status === 'open' && !loadingSubmission && !mySubmission;

    return (
        <div className="bg-white border border-[#E8E0FA] rounded-3xl overflow-hidden">
            {youtubeId && (
                <>
                    <button
                        onClick={() => setShowVideoModal(true)}
                        className="relative w-full aspect-video bg-black block group"
                    >
                        <img
                            src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                            alt="퀴즈 영상 미리보기"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-active:bg-black/40 transition-colors">
                            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                                <span className="material-symbols-outlined text-[#1F1235] text-[32px]">play_arrow</span>
                            </div>
                        </div>
                    </button>

                    {showVideoModal && (
                        <div
                            className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
                            onClick={() => setShowVideoModal(false)}
                        >
                            <div
                                className={`flex flex-col ${isVerticalVideo ? 'items-center' : 'w-full max-w-3xl'}`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className={`flex justify-end mb-2 ${isVerticalVideo ? 'w-full max-w-[95vw]' : 'w-full'}`}>
                                    <button
                                        onClick={() => setShowVideoModal(false)}
                                        className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center text-lg"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div
                                    className={`bg-black rounded-2xl overflow-hidden ${isVerticalVideo ? 'aspect-[9/16] h-[90vh] max-h-[90vh] w-auto max-w-[95vw]' : 'w-full aspect-video'}`}
                                >
                                    <iframe
                                        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                                        title="퀴즈 영상"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="w-full h-full border-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
            <div className="px-5 pt-4 pb-3">
                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-black ${status.className}`}>{status.label}</span>
                {!isAnswerForm && (
                    <>
                        <div className="mt-2.5 space-y-1">
                            {questions.map((q, idx) => (
                                <h3 key={q.id} className="text-[16px] font-black text-[#1F1235] leading-snug">
                                    {questions.length > 1 ? `Q${idx + 1}. ` : ''}{q.question}
                                </h3>
                            ))}
                        </div>
                        <p className="text-[13px] font-bold text-[#7C3AED] mt-1.5">🎁 상품: {quiz.prize_description}</p>
                    </>
                )}
            </div>

            <div className="px-5 pb-5">
                {quiz.status === 'announced' ? (
                    <div className="bg-[#F8F5FF] rounded-2xl p-4 space-y-2">
                        <div className="space-y-1">
                            {questions.map((q, idx) => {
                                const answer = announcedDetail?.correct_answers?.[q.id];
                                if (announcedDetail && !answer) return null;
                                return (
                                    <p key={q.id} className="text-[13px] font-black text-[#1F1235]">
                                        {questions.length > 1 ? `Q${idx + 1} ` : ''}정답: {announcedDetail ? answer : '불러오는 중...'}
                                    </p>
                                );
                            })}
                        </div>
                        <div>
                            <p className="text-[12px] font-bold text-[#9CA3AF] mb-1">당첨자</p>
                            {winnerNicknames.length === 0 ? (
                                <p className="text-[13px] text-[#9CA3AF] font-bold">당첨자가 없습니다.</p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {winnerNicknames.map((nick) => (
                                        <span
                                            key={nick}
                                            className={`px-2.5 py-1 rounded-full text-[12px] font-black ${nick === myNickname ? 'bg-[#7C3AED] text-white' : 'bg-white border border-[#E8E0FA] text-[#5B4E7A]'}`}
                                        >
                                            {nick === myNickname ? '🎉 ' : ''}{nick}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        {iWon && (
                            <p className="text-[13px] font-black text-[#7C3AED] mt-2">축하합니다! 당첨되셨어요 🎉 배송 안내를 기다려주세요.</p>
                        )}
                    </div>
                ) : loadingSubmission ? (
                    <p className="text-[13px] text-[#9CA3AF] font-bold py-2">불러오는 중...</p>
                ) : mySubmission ? (
                    <div className="bg-[#F8F5FF] rounded-2xl p-5 text-center">
                        <p className="text-[20px] font-black text-[#1F1235]">제출완료 🎉</p>
                        <p className="text-[13px] font-bold text-[#9CA3AF] mt-1">결과 발표를 기다려주세요 🤞</p>
                        <div className="mt-3 space-y-1">
                            {questions.map((q, idx) => (
                                <p key={q.id} className="text-[12px] text-[#9CA3AF] font-bold">
                                    {questions.length > 1 ? `Q${idx + 1} ` : ''}내 답변: {mySubmission.answers?.[q.id]}
                                </p>
                            ))}
                        </div>
                    </div>
                ) : quiz.status === 'closed' ? (
                    <p className="text-[13px] text-[#9CA3AF] font-bold py-2">마감된 퀴즈입니다. 결과 발표를 기다려주세요.</p>
                ) : (
                    <div className="space-y-5">
                        {questions.map((q, idx) => (
                            <div key={q.id} className="space-y-2">
                                <h3 className="text-[15px] font-black text-[#1F1235] leading-snug">
                                    {questions.length > 1 ? `Q${idx + 1}. ` : ''}{q.question}
                                </h3>
                                {q.questionType === 'multiple_choice' ? (
                                    <div className="space-y-2">
                                        {(q.choices || []).map((choice, cIdx) => (
                                            <button
                                                key={cIdx}
                                                onClick={() => setDraftAnswer(q.id, choice)}
                                                className={`w-full text-left px-4 py-2.5 rounded-xl border text-[13px] font-bold transition-colors ${draftAnswers[q.id] === choice ? 'border-[#7C3AED] bg-[#F3E8FF] text-[#7C3AED]' : 'border-[#E8E0FA] text-[#5B4E7A]'}`}
                                            >
                                                {choice}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <input
                                        value={draftAnswers[q.id] || ''}
                                        onChange={(e) => setDraftAnswer(q.id, e.target.value)}
                                        placeholder="정답을 입력하세요"
                                        className="w-full px-4 py-2.5 rounded-xl border border-[#E8E0FA] text-[13px] font-bold"
                                    />
                                )}
                            </div>
                        ))}
                        {error && <p className="text-[12px] font-bold text-red-500">{error}</p>}
                        <p className="text-[13px] font-bold text-[#7C3AED]">🎁 상품: {quiz.prize_description}</p>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black text-[13px] disabled:opacity-50"
                        >
                            {submitting ? '제출 중...' : '정답 제출'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CeoQuizCard;
