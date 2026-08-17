import React, { useEffect, useState } from 'react';
import {
    fetchAllQuizzesForAdmin, createQuiz, fetchSubmissions, fetchSubmissionCounts,
    markWinner, closeQuiz, publishResults, updateCorrectAnswers, updateQuiz,
} from '../services/quizService';
import { sendBroadcastPush } from '../services/pushNotificationService';

const STATUS_LABEL = {
    open: { label: '진행중', className: 'bg-emerald-100 text-emerald-700' },
    closed: { label: '마감(발표대기)', className: 'bg-amber-100 text-amber-700' },
    announced: { label: '발표완료', className: 'bg-gray-100 text-gray-500' },
};

const MAX_QUESTIONS = 2;

const EMPTY_QUESTION = () => ({
    question: '',
    questionType: 'multiple_choice',
    choices: ['', ''],
    correctAnswer: '',
});

const EMPTY_FORM = {
    questions: [EMPTY_QUESTION()],
    prizeDescription: '',
    videoUrl: '',
};

const PushResultBadge = ({ result }) => {
    if (!result) return null;
    if (!result.success) {
        return <p className="text-[11px] font-bold text-red-500 mt-1.5">발송 실패: {result.error}</p>;
    }
    return (
        <p className="text-[11px] font-bold text-emerald-600 mt-1.5">
            발송 완료 · 성공 {result.successCount}건 / 실패 {result.failCount}건
        </p>
    );
};

const QuestionEditor = ({ index, question, onChange, onRemove, canRemove, showCorrectAnswer = true }) => {
    const updateField = (patch) => onChange(index, { ...question, ...patch });

    const updateChoice = (idx, value) => {
        const next = [...question.choices];
        next[idx] = value;
        updateField({ choices: next });
    };
    const addChoice = () => updateField({ choices: [...question.choices, ''] });
    const removeChoice = (idx) => updateField({ choices: question.choices.filter((_, i) => i !== idx) });

    return (
        <div className="rounded-xl border border-[var(--moca-border)] p-3 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-[12px] font-black text-[var(--moca-primary)]">문제 {index + 1}</p>
                {canRemove && (
                    <button onClick={() => onRemove(index)} className="text-[11px] font-bold text-[var(--moca-text-3)] hover:text-red-500">문제 삭제</button>
                )}
            </div>

            <div>
                <label className="text-[11px] font-bold text-[var(--moca-text-3)]">질문</label>
                <textarea
                    value={question.question}
                    onChange={(e) => updateField({ question: e.target.value })}
                    rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                    placeholder="예: 김대표가 가장 좋아하는 색깔은?"
                />
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => updateField({ questionType: 'multiple_choice' })}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-black border ${question.questionType === 'multiple_choice' ? 'bg-fuchsia-50 border-fuchsia-400 text-fuchsia-700' : 'border-[var(--moca-border)] text-[var(--moca-text-3)]'}`}
                >
                    객관식
                </button>
                <button
                    onClick={() => updateField({ questionType: 'short_answer' })}
                    className={`flex-1 py-2 rounded-xl text-[12px] font-black border ${question.questionType === 'short_answer' ? 'bg-fuchsia-50 border-fuchsia-400 text-fuchsia-700' : 'border-[var(--moca-border)] text-[var(--moca-text-3)]'}`}
                >
                    주관식
                </button>
            </div>

            {question.questionType === 'multiple_choice' && (
                <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[var(--moca-text-3)]">보기</label>
                    {question.choices.map((c, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                value={c}
                                onChange={(e) => updateChoice(idx, e.target.value)}
                                className="flex-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                                placeholder={`보기 ${idx + 1}`}
                            />
                            {question.choices.length > 2 && (
                                <button onClick={() => removeChoice(idx)} className="px-2 text-[var(--moca-text-3)] hover:text-red-500">✕</button>
                            )}
                        </div>
                    ))}
                    <button onClick={addChoice} className="text-[12px] font-bold text-[var(--moca-primary)]">+ 보기 추가</button>
                </div>
            )}

            {showCorrectAnswer && (
                <div>
                    <label className="text-[11px] font-bold text-[var(--moca-text-3)]">정답 (선택 입력)</label>
                    {question.questionType === 'multiple_choice' ? (
                        <select
                            value={question.correctAnswer}
                            onChange={(e) => updateField({ correctAnswer: e.target.value })}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm bg-white"
                        >
                            <option value="">아직 미정 — 결과 발표 시 확정</option>
                            {question.choices.filter((c) => c.trim()).map((c, idx) => (
                                <option key={idx} value={c}>{c}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            value={question.correctAnswer}
                            onChange={(e) => updateField({ correctAnswer: e.target.value })}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                            placeholder="아직 미정이어도 됩니다 — 결과 발표 시 확정"
                        />
                    )}
                </div>
            )}
        </div>
    );
};

const CreateQuizForm = ({ onCreated }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [pushResult, setPushResult] = useState(null);
    const [sendingPush, setSendingPush] = useState(false);

    const updateQuestion = (idx, nextQuestion) => {
        setForm((f) => {
            const next = [...f.questions];
            next[idx] = nextQuestion;
            return { ...f, questions: next };
        });
    };
    const addQuestion = () => setForm((f) => ({ ...f, questions: [...f.questions, EMPTY_QUESTION()] }));
    const removeQuestion = (idx) => setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));

    const handleSubmit = async () => {
        setError('');

        if (!form.prizeDescription.trim()) { setError('상품 설명을 입력해주세요.'); return; }

        const preparedQuestions = [];
        for (let i = 0; i < form.questions.length; i += 1) {
            const q = form.questions[i];
            const cleanedChoices = q.choices.map((c) => c.trim()).filter(Boolean);

            if (!q.question.trim()) { setError(`문제 ${i + 1}의 질문을 입력해주세요.`); return; }
            if (q.questionType === 'multiple_choice' && cleanedChoices.length < 2) {
                setError(`문제 ${i + 1}은 객관식이므로 보기를 2개 이상 입력해주세요.`);
                return;
            }

            preparedQuestions.push({
                question: q.question.trim(),
                questionType: q.questionType,
                choices: cleanedChoices,
                correctAnswer: q.correctAnswer.trim(),
            });
        }

        setSubmitting(true);
        const { quiz, error: createError } = await createQuiz({
            questions: preparedQuestions,
            prizeDescription: form.prizeDescription.trim(),
            videoUrl: form.videoUrl.trim(),
        });
        setSubmitting(false);

        if (createError) {
            setError('퀴즈 생성 중 오류가 발생했습니다: ' + (createError.message || '다시 시도해주세요.'));
            return;
        }

        setForm(EMPTY_FORM);
        setPushResult(null);
        onCreated(quiz);
    };

    const handleSendOpenPush = async () => {
        const firstQuestion = form.questions[0]?.question || '';
        setSendingPush(true);
        const result = await sendBroadcastPush({
            title: '🎁 김대표퀴즈 오픈!',
            body: `${firstQuestion.slice(0, 30)}${firstQuestion.length > 30 ? '...' : ''} · 상품: ${form.prizeDescription}`,
            route: '/home/quiz',
        });
        setPushResult(result);
        setSendingPush(false);
    };

    const canSendPush = !sendingPush && form.questions.every((q) => q.question.trim()) && form.prizeDescription.trim();

    return (
        <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-black text-[var(--moca-text)]">🎁 새 퀴즈 등록</p>
                <span className="text-[11px] font-bold text-[var(--moca-text-3)]">문제 {form.questions.length}/{MAX_QUESTIONS}개</span>
            </div>

            <div className="space-y-3">
                {form.questions.map((q, idx) => (
                    <QuestionEditor
                        key={idx}
                        index={idx}
                        question={q}
                        onChange={updateQuestion}
                        onRemove={removeQuestion}
                        canRemove={form.questions.length > 1}
                    />
                ))}

                {form.questions.length < MAX_QUESTIONS && (
                    <button
                        onClick={addQuestion}
                        className="w-full py-2 rounded-xl border border-dashed border-[var(--moca-primary)] text-[12px] font-black text-[var(--moca-primary)]"
                    >
                        + 문제 추가 (최대 {MAX_QUESTIONS}개)
                    </button>
                )}

                <div>
                    <label className="text-[11px] font-bold text-[var(--moca-text-3)]">유튜브 영상 링크 (선택)</label>
                    <input
                        value={form.videoUrl}
                        onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                        placeholder="예: https://www.youtube.com/watch?v=xxxxxxxx"
                    />
                    <p className="text-[10px] text-[var(--moca-text-3)] mt-1">넣으면 사용자 화면에 영상이 먼저 보이고, 영상을 보고 퀴즈를 맞히는 형태가 됩니다.</p>
                </div>

                <div>
                    <label className="text-[11px] font-bold text-[var(--moca-text-3)]">상품 설명</label>
                    <input
                        value={form.prizeDescription}
                        onChange={(e) => setForm((f) => ({ ...f, prizeDescription: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                        placeholder="예: 아이패드 4개"
                    />
                </div>

                {error && <p className="text-[12px] font-bold text-red-500">{error}</p>}

                <div className="flex gap-2 pt-1">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 py-2.5 rounded-xl bg-[var(--moca-primary)] text-white font-black text-[13px] disabled:opacity-50"
                    >
                        {submitting ? '등록 중...' : '퀴즈 등록'}
                    </button>
                    <button
                        onClick={handleSendOpenPush}
                        disabled={!canSendPush}
                        className="px-4 py-2.5 rounded-xl border border-fuchsia-300 text-fuchsia-700 font-black text-[13px] disabled:opacity-40"
                    >
                        {sendingPush ? '발송 중...' : '🔔 새 퀴즈 알림 발송'}
                    </button>
                </div>
                <p className="text-[10px] text-[var(--moca-text-3)]">정답은 지금 안 정해도 됩니다 — 제출 목록을 보고 "결과 발표" 시점에 문제별로 확정할 수 있어요. 먼저 "퀴즈 등록"으로 게시판에 반영한 뒤, 원하면 "새 퀴즈 알림 발송"을 눌러 전체 회원에게 푸시를 보내세요.</p>
                <PushResultBadge result={pushResult} />
            </div>
        </div>
    );
};

const buildEditFormFromQuiz = (quiz) => ({
    questions: (quiz.questions || []).map((q) => ({
        id: q.id,
        question: q.question,
        questionType: q.questionType,
        choices: q.questionType === 'multiple_choice' ? [...(q.choices || ['', ''])] : ['', ''],
    })),
    prizeDescription: quiz.prize_description || '',
    videoUrl: quiz.video_url || '',
});

const EditQuizModal = ({ quiz, onClose, onUpdated }) => {
    const [form, setForm] = useState(() => buildEditFormFromQuiz(quiz));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const updateQuestion = (idx, nextQuestion) => {
        setForm((f) => {
            const next = [...f.questions];
            next[idx] = nextQuestion;
            return { ...f, questions: next };
        });
    };
    const addQuestion = () => setForm((f) => ({ ...f, questions: [...f.questions, { ...EMPTY_QUESTION(), id: undefined }] }));
    const removeQuestion = (idx) => setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== idx) }));

    const handleSubmit = async () => {
        setError('');
        if (!form.prizeDescription.trim()) { setError('상품 설명을 입력해주세요.'); return; }

        const preparedQuestions = [];
        for (let i = 0; i < form.questions.length; i += 1) {
            const q = form.questions[i];
            const cleanedChoices = (q.choices || []).map((c) => c.trim()).filter(Boolean);

            if (!q.question.trim()) { setError(`문제 ${i + 1}의 질문을 입력해주세요.`); return; }
            if (q.questionType === 'multiple_choice' && cleanedChoices.length < 2) {
                setError(`문제 ${i + 1}은 객관식이므로 보기를 2개 이상 입력해주세요.`);
                return;
            }

            preparedQuestions.push({
                id: q.id,
                question: q.question.trim(),
                questionType: q.questionType,
                choices: cleanedChoices,
            });
        }

        setSubmitting(true);
        const { error: updateError } = await updateQuiz(quiz.id, {
            questions: preparedQuestions,
            prizeDescription: form.prizeDescription.trim(),
            videoUrl: form.videoUrl.trim(),
        });
        setSubmitting(false);

        if (updateError) {
            setError('수정 중 오류가 발생했습니다: ' + (updateError.message || '다시 시도해주세요.'));
            return;
        }

        onUpdated({
            ...quiz,
            questions: preparedQuestions,
            prize_description: form.prizeDescription.trim(),
            video_url: form.videoUrl.trim() || null,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-[#0c0714]/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn" onClick={onClose}>
            <div
                className="bg-white border border-[var(--moca-border)] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-[var(--moca-border)] bg-[var(--moca-surface-2)] flex items-center justify-between">
                    <p className="text-sm font-black text-[var(--moca-text)]">✏️ 퀴즈 수정</p>
                    <button onClick={onClose} className="text-[var(--moca-text-3)] hover:text-[var(--moca-text)] text-xl leading-none">✕</button>
                </div>

                <div className="px-6 py-4 overflow-y-auto flex-1 space-y-3">
                    {form.questions.map((q, idx) => (
                        <QuestionEditor
                            key={q.id || idx}
                            index={idx}
                            question={q}
                            onChange={updateQuestion}
                            onRemove={removeQuestion}
                            canRemove={form.questions.length > 1}
                            showCorrectAnswer={false}
                        />
                    ))}

                    {form.questions.length < MAX_QUESTIONS && (
                        <button
                            onClick={addQuestion}
                            className="w-full py-2 rounded-xl border border-dashed border-[var(--moca-primary)] text-[12px] font-black text-[var(--moca-primary)]"
                        >
                            + 문제 추가 (최대 {MAX_QUESTIONS}개)
                        </button>
                    )}

                    <div>
                        <label className="text-[11px] font-bold text-[var(--moca-text-3)]">유튜브 영상 링크 (선택)</label>
                        <input
                            value={form.videoUrl}
                            onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                            placeholder="예: https://www.youtube.com/watch?v=xxxxxxxx"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-[var(--moca-text-3)]">상품 설명</label>
                        <input
                            value={form.prizeDescription}
                            onChange={(e) => setForm((f) => ({ ...f, prizeDescription: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                            placeholder="예: 아이패드 4개"
                        />
                    </div>

                    <p className="text-[10px] text-[var(--moca-text-3)]">정답 확정/재확정은 퀴즈 목록에서 열리는 제출 현황 화면에서 진행하세요. 여기서는 문항·보기·상품·영상 링크만 정정할 수 있습니다.</p>

                    {error && <p className="text-[12px] font-bold text-red-500">{error}</p>}
                </div>

                <div className="px-6 py-4 border-t border-[var(--moca-border)] bg-[var(--moca-surface-2)]">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full py-2.5 rounded-xl bg-[var(--moca-primary)] text-white font-black text-[13px] disabled:opacity-50"
                    >
                        {submitting ? '저장 중...' : '수정 저장'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SubmissionsModal = ({ quiz, onClose, onQuizUpdated }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [pushResult, setPushResult] = useState(null);
    const [sendingPush, setSendingPush] = useState(false);
    const [answerDrafts, setAnswerDrafts] = useState(() => quiz.correct_answers || {});

    const questions = quiz.questions || [];

    useEffect(() => {
        setAnswerDrafts(quiz.correct_answers || {});
    }, [quiz.id]);

    const setAnswerDraft = (questionId, value) => {
        setAnswerDrafts((prev) => ({ ...prev, [questionId]: value }));
    };

    const load = async () => {
        setLoading(true);
        const data = await fetchSubmissions(quiz.id);
        setSubmissions(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, [quiz.id]);

    const toggleWinner = async (submission) => {
        const nextIsWinner = !submission.is_winner;
        setSubmissions((prev) => prev.map((s) => s.id === submission.id ? { ...s, is_winner: nextIsWinner } : s));
        const { error } = await markWinner(submission.id, nextIsWinner);
        if (error) {
            setSubmissions((prev) => prev.map((s) => s.id === submission.id ? { ...s, is_winner: submission.is_winner } : s));
            alert('당첨 상태 변경 중 오류가 발생했습니다: ' + (error.message || ''));
        }
    };

    const handleClose = async () => {
        const { error } = await closeQuiz(quiz.id);
        if (error) { alert('마감 처리 중 오류가 발생했습니다: ' + (error.message || '')); return; }
        onQuizUpdated({ ...quiz, status: 'closed' });
    };

    const handlePublish = async () => {
        for (let i = 0; i < questions.length; i += 1) {
            const q = questions[i];
            if (!(answerDrafts[q.id] || '').trim()) {
                alert(`${questions.length > 1 ? `Q${i + 1} ` : ''}"${q.question}"의 정답을 먼저 확정해주세요.`);
                return;
            }
        }

        const winnerCount = submissions.filter((s) => s.is_winner).length;
        if (!window.confirm(`정답과 당첨자(${winnerCount}명)가 전체 공개됩니다. 계속하시겠습니까?`)) return;

        setPublishing(true);
        const trimmedAnswers = {};
        questions.forEach((q) => { trimmedAnswers[q.id] = (answerDrafts[q.id] || '').trim(); });

        const { error: answerError } = await updateCorrectAnswers(quiz.id, trimmedAnswers);
        if (answerError) {
            setPublishing(false);
            alert('정답 저장 중 오류가 발생했습니다: ' + (answerError.message || ''));
            return;
        }

        const { error } = await publishResults(quiz.id);
        setPublishing(false);
        if (error) { alert('결과 발표 중 오류가 발생했습니다: ' + (error.message || '')); return; }
        onQuizUpdated({
            ...quiz,
            status: 'announced',
            correct_answers: trimmedAnswers,
            winner_nicknames: submissions.filter((s) => s.is_winner).map((s) => s.user_nickname),
        });
    };

    const handleSendOpenReminderPush = async () => {
        const firstQuestion = questions[0]?.question || '';
        setSendingPush(true);
        const result = await sendBroadcastPush({
            title: '🎁 김대표퀴즈 참여하기',
            body: `${firstQuestion.slice(0, 30)}${firstQuestion.length > 30 ? '...' : ''} · 상품: ${quiz.prize_description}`,
            route: '/home/quiz',
        });
        setPushResult(result);
        setSendingPush(false);
    };

    const handleSendResultPush = async () => {
        setSendingPush(true);
        const result = await sendBroadcastPush({
            title: '🎉 김대표퀴즈 결과 발표',
            body: '정답과 당첨자를 확인해보세요!',
            route: '/home/quiz',
        });
        setPushResult(result);
        setSendingPush(false);
    };

    const status = STATUS_LABEL[quiz.status] || STATUS_LABEL.open;

    return (
        <div className="fixed inset-0 bg-[#0c0714]/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn" onClick={onClose}>
            <div
                className="bg-white border border-[var(--moca-border)] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-[var(--moca-border)] bg-[var(--moca-surface-2)] flex items-start justify-between gap-3">
                    <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
                        <div className="mt-2 space-y-0.5">
                            {questions.map((q, idx) => (
                                <h3 key={q.id} className="text-[15px] font-black text-[var(--moca-text)] leading-snug">
                                    {questions.length > 1 ? `Q${idx + 1}. ` : ''}{q.question}
                                </h3>
                            ))}
                        </div>
                        <p className="text-[12px] text-[var(--moca-text-3)] font-bold mt-1">🎁 {quiz.prize_description}</p>
                        {quiz.video_url && (
                            <a href={quiz.video_url} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[var(--moca-primary)] underline mt-0.5 inline-block">🎬 등록된 영상 보기</a>
                        )}
                    </div>
                    <button onClick={onClose} className="text-[var(--moca-text-3)] hover:text-[var(--moca-text)] text-xl leading-none">✕</button>
                </div>

                <div className="px-6 py-4 overflow-y-auto flex-1">
                    {quiz.status !== 'announced' && (
                        <div className="mb-4 p-3 rounded-xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)] space-y-2">
                            <p className="text-[11px] font-black text-[var(--moca-text-3)]">정답 확정 (결과 발표 시 이 값으로 공개됩니다)</p>
                            {questions.map((q, idx) => (
                                <div key={q.id}>
                                    <label className="text-[11px] font-bold text-[var(--moca-text-3)]">{questions.length > 1 ? `Q${idx + 1}. ` : ''}{q.question}</label>
                                    {q.questionType === 'multiple_choice' ? (
                                        <select
                                            value={answerDrafts[q.id] || ''}
                                            onChange={(e) => setAnswerDraft(q.id, e.target.value)}
                                            className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm bg-white"
                                        >
                                            <option value="">정답 선택</option>
                                            {(q.choices || []).map((c, cIdx) => (
                                                <option key={cIdx} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            value={answerDrafts[q.id] || ''}
                                            onChange={(e) => setAnswerDraft(q.id, e.target.value)}
                                            className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                                            placeholder="정답 텍스트"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {quiz.status === 'announced' && (
                        <p className="text-[12px] font-black text-[var(--moca-text)] mb-3">
                            정답: {questions.map((q) => quiz.correct_answers?.[q.id]).join(' / ')}
                        </p>
                    )}
                    <p className="text-[11px] font-bold text-[var(--moca-text-3)] mb-2">
                        당첨자 배송 정보는 회원관리 탭에서 닉네임으로 조회하세요.
                    </p>
                    {loading ? (
                        <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">불러오는 중...</p>
                    ) : submissions.length === 0 ? (
                        <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">제출자가 없습니다.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[11px] text-[var(--moca-text-3)] font-bold border-b border-[var(--moca-border)]">
                                    <th className="py-2 pr-3">닉네임</th>
                                    {questions.map((q, idx) => (
                                        <th key={q.id} className="py-2 pr-3">{questions.length > 1 ? `답변 Q${idx + 1}` : '답변'}</th>
                                    ))}
                                    <th className="py-2 pr-3">제출시각</th>
                                    <th className="py-2 pr-3">당첨</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((s) => (
                                    <tr key={s.id} className="border-b border-[var(--moca-border)] last:border-0">
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-text)]">{s.user_nickname}</td>
                                        {questions.map((q) => (
                                            <td key={q.id} className="py-2.5 pr-3 text-[var(--moca-text)]">{s.answers?.[q.id]}</td>
                                        ))}
                                        <td className="py-2.5 pr-3 text-[10px] text-[var(--moca-text-3)]">{new Date(s.created_at).toLocaleString('ko-KR')}</td>
                                        <td className="py-2.5 pr-3">
                                            <input type="checkbox" checked={!!s.is_winner} onChange={() => toggleWinner(s)} className="w-4 h-4" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-[var(--moca-border)] bg-[var(--moca-surface-2)] space-y-2">
                    <div className="flex gap-2">
                        {quiz.status === 'open' && (
                            <button onClick={handleClose} className="px-4 py-2 rounded-xl border border-[var(--moca-border)] text-[13px] font-black text-[var(--moca-text)]">
                                마감
                            </button>
                        )}
                        {quiz.status === 'open' && (
                            <button
                                onClick={handleSendOpenReminderPush}
                                disabled={sendingPush}
                                className="px-4 py-2 rounded-xl border border-fuchsia-300 text-fuchsia-700 font-black text-[13px] disabled:opacity-40"
                            >
                                {sendingPush ? '발송 중...' : '🔔 참여 독려 알림'}
                            </button>
                        )}
                        {quiz.status !== 'announced' && (
                            <button
                                onClick={handlePublish}
                                disabled={publishing}
                                className="flex-1 py-2 rounded-xl bg-[var(--moca-primary)] text-white font-black text-[13px] disabled:opacity-50"
                            >
                                {publishing ? '발표 중...' : '결과 발표'}
                            </button>
                        )}
                        {quiz.status === 'announced' && (
                            <button
                                onClick={handleSendResultPush}
                                disabled={sendingPush}
                                className="flex-1 py-2 rounded-xl border border-fuchsia-300 text-fuchsia-700 font-black text-[13px] disabled:opacity-40"
                            >
                                {sendingPush ? '발송 중...' : '🔔 결과 발표 알림 발송'}
                            </button>
                        )}
                    </div>
                    <PushResultBadge result={pushResult} />
                </div>
            </div>
        </div>
    );
};

const AdminCeoQuiz = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [editingQuiz, setEditingQuiz] = useState(null);

    const load = async () => {
        setLoading(true);
        const [data, counts] = await Promise.all([fetchAllQuizzesForAdmin(), fetchSubmissionCounts()]);
        setQuizzes(data.map((q) => ({ ...q, submission_count: counts[q.id] || 0 })));
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleCreated = (quiz) => {
        setQuizzes((prev) => [{ ...quiz, submission_count: 0 }, ...prev]);
    };

    const handleQuizUpdated = (updated) => {
        setQuizzes((prev) => prev.map((q) => q.id === updated.id ? { ...q, ...updated } : q));
        setSelectedQuiz((prev) => prev && prev.id === updated.id ? { ...prev, ...updated } : prev);
    };

    return (
        <div className="animate-fadeIn">
            <CreateQuizForm onCreated={handleCreated} />

            <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-[var(--moca-text)]">전체 퀴즈 <span className="text-[var(--moca-primary)]">{quizzes.length}</span>건</p>
                <button onClick={load} className="text-xs font-bold text-[var(--moca-text-3)] hover:text-[var(--moca-primary)]">새로고침</button>
            </div>

            {loading ? (
                <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">불러오는 중...</p>
            ) : quizzes.length === 0 ? (
                <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">등록된 퀴즈가 없습니다.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] text-[var(--moca-text-3)] font-bold border-b border-[var(--moca-border)]">
                                <th className="py-2 pr-3">상태</th>
                                <th className="py-2 pr-3">질문</th>
                                <th className="py-2 pr-3">문제수</th>
                                <th className="py-2 pr-3">상품</th>
                                <th className="py-2 pr-3">참여</th>
                                <th className="py-2 pr-3">등록일</th>
                                <th className="py-2 pr-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {quizzes.map((q) => {
                                const status = STATUS_LABEL[q.status] || STATUS_LABEL.open;
                                const questions = q.questions || [];
                                return (
                                    <tr
                                        key={q.id}
                                        onClick={() => setSelectedQuiz(q)}
                                        className="border-b border-[var(--moca-border)] last:border-0 cursor-pointer hover:bg-[var(--moca-surface-2)] transition-colors"
                                    >
                                        <td className="py-2.5 pr-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
                                        </td>
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-primary)] max-w-[280px] truncate underline decoration-dotted underline-offset-2">
                                            {questions.map((qq) => qq.question).join(' / ')}
                                        </td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)]">{questions.length}개</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)] max-w-[160px] truncate">{q.prize_description}</td>
                                        <td className="py-2.5 pr-3 font-black text-[var(--moca-primary)]">{q.submission_count ?? 0}명</td>
                                        <td className="py-2.5 pr-3 text-[10px] text-[var(--moca-text-3)]">{new Date(q.created_at).toLocaleDateString('ko-KR')}</td>
                                        <td className="py-2.5 pr-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingQuiz(q); }}
                                                className="text-[11px] font-black text-[var(--moca-text-3)] hover:text-[var(--moca-primary)]"
                                            >
                                                ✏️ 수정
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedQuiz && (
                <SubmissionsModal
                    quiz={selectedQuiz}
                    onClose={() => setSelectedQuiz(null)}
                    onQuizUpdated={handleQuizUpdated}
                />
            )}

            {editingQuiz && (
                <EditQuizModal
                    quiz={editingQuiz}
                    onClose={() => setEditingQuiz(null)}
                    onUpdated={handleQuizUpdated}
                />
            )}
        </div>
    );
};

export default AdminCeoQuiz;
