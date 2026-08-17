import React, { useEffect, useState } from 'react';
import {
    fetchAllQuizzesForAdmin, createQuiz, fetchSubmissions,
    markWinner, closeQuiz, publishResults,
} from '../services/quizService';
import { sendBroadcastPush } from '../services/pushNotificationService';

const STATUS_LABEL = {
    open: { label: '진행중', className: 'bg-emerald-100 text-emerald-700' },
    closed: { label: '마감(발표대기)', className: 'bg-amber-100 text-amber-700' },
    announced: { label: '발표완료', className: 'bg-gray-100 text-gray-500' },
};

const EMPTY_FORM = {
    question: '',
    questionType: 'multiple_choice',
    choices: ['', ''],
    prizeDescription: '',
    correctAnswer: '',
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

const CreateQuizForm = ({ onCreated }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [pushResult, setPushResult] = useState(null);
    const [sendingPush, setSendingPush] = useState(false);

    const updateChoice = (idx, value) => {
        setForm((f) => {
            const next = [...f.choices];
            next[idx] = value;
            return { ...f, choices: next };
        });
    };
    const addChoice = () => setForm((f) => ({ ...f, choices: [...f.choices, ''] }));
    const removeChoice = (idx) => setForm((f) => ({ ...f, choices: f.choices.filter((_, i) => i !== idx) }));

    const handleSubmit = async () => {
        setError('');
        const cleanedChoices = form.choices.map((c) => c.trim()).filter(Boolean);

        if (!form.question.trim()) { setError('질문을 입력해주세요.'); return; }
        if (!form.prizeDescription.trim()) { setError('상품 설명을 입력해주세요.'); return; }
        if (!form.correctAnswer.trim()) { setError('정답을 입력해주세요.'); return; }
        if (form.questionType === 'multiple_choice' && cleanedChoices.length < 2) {
            setError('객관식은 보기를 2개 이상 입력해주세요.');
            return;
        }

        setSubmitting(true);
        const { quiz, error: createError } = await createQuiz({
            question: form.question.trim(),
            questionType: form.questionType,
            choices: cleanedChoices,
            prizeDescription: form.prizeDescription.trim(),
            correctAnswer: form.correctAnswer.trim(),
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
        setSendingPush(true);
        const result = await sendBroadcastPush({
            title: '🎁 김대표퀴즈 오픈!',
            body: `${form.question.slice(0, 30)}${form.question.length > 30 ? '...' : ''} · 상품: ${form.prizeDescription}`,
            route: '/home/quiz',
        });
        setPushResult(result);
        setSendingPush(false);
    };

    return (
        <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5 mb-6">
            <p className="text-sm font-black text-[var(--moca-text)] mb-4">🎁 새 퀴즈 등록</p>

            <div className="space-y-3">
                <div>
                    <label className="text-[11px] font-bold text-[var(--moca-text-3)]">질문</label>
                    <textarea
                        value={form.question}
                        onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                        rows={2}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                        placeholder="예: 김대표가 가장 좋아하는 색깔은?"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setForm((f) => ({ ...f, questionType: 'multiple_choice' }))}
                        className={`flex-1 py-2 rounded-xl text-[12px] font-black border ${form.questionType === 'multiple_choice' ? 'bg-fuchsia-50 border-fuchsia-400 text-fuchsia-700' : 'border-[var(--moca-border)] text-[var(--moca-text-3)]'}`}
                    >
                        객관식
                    </button>
                    <button
                        onClick={() => setForm((f) => ({ ...f, questionType: 'short_answer' }))}
                        className={`flex-1 py-2 rounded-xl text-[12px] font-black border ${form.questionType === 'short_answer' ? 'bg-fuchsia-50 border-fuchsia-400 text-fuchsia-700' : 'border-[var(--moca-border)] text-[var(--moca-text-3)]'}`}
                    >
                        주관식
                    </button>
                </div>

                {form.questionType === 'multiple_choice' && (
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-[var(--moca-text-3)]">보기</label>
                        {form.choices.map((c, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    value={c}
                                    onChange={(e) => updateChoice(idx, e.target.value)}
                                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                                    placeholder={`보기 ${idx + 1}`}
                                />
                                {form.choices.length > 2 && (
                                    <button onClick={() => removeChoice(idx)} className="px-2 text-[var(--moca-text-3)] hover:text-red-500">✕</button>
                                )}
                            </div>
                        ))}
                        <button onClick={addChoice} className="text-[12px] font-bold text-[var(--moca-primary)]">+ 보기 추가</button>
                    </div>
                )}

                <div>
                    <label className="text-[11px] font-bold text-[var(--moca-text-3)]">상품 설명</label>
                    <input
                        value={form.prizeDescription}
                        onChange={(e) => setForm((f) => ({ ...f, prizeDescription: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                        placeholder="예: 아이패드 4개"
                    />
                </div>

                <div>
                    <label className="text-[11px] font-bold text-[var(--moca-text-3)]">정답</label>
                    {form.questionType === 'multiple_choice' ? (
                        <select
                            value={form.correctAnswer}
                            onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm bg-white"
                        >
                            <option value="">정답 선택</option>
                            {form.choices.filter((c) => c.trim()).map((c, idx) => (
                                <option key={idx} value={c}>{c}</option>
                            ))}
                        </select>
                    ) : (
                        <input
                            value={form.correctAnswer}
                            onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                            className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                            placeholder="정답 텍스트 (참고용 — 당첨자는 수동으로 확인/체크합니다)"
                        />
                    )}
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
                        disabled={sendingPush || !form.question.trim() || !form.prizeDescription.trim()}
                        className="px-4 py-2.5 rounded-xl border border-fuchsia-300 text-fuchsia-700 font-black text-[13px] disabled:opacity-40"
                    >
                        {sendingPush ? '발송 중...' : '🔔 새 퀴즈 알림 발송'}
                    </button>
                </div>
                <p className="text-[10px] text-[var(--moca-text-3)]">먼저 "퀴즈 등록"으로 게시판에 반영한 뒤, 원하면 "새 퀴즈 알림 발송"을 눌러 전체 회원에게 푸시를 보내세요.</p>
                <PushResultBadge result={pushResult} />
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
        const winnerCount = submissions.filter((s) => s.is_winner).length;
        if (!window.confirm(`정답과 당첨자(${winnerCount}명)가 전체 공개됩니다. 계속하시겠습니까?`)) return;
        setPublishing(true);
        const { error } = await publishResults(quiz.id);
        setPublishing(false);
        if (error) { alert('결과 발표 중 오류가 발생했습니다: ' + (error.message || '')); return; }
        onQuizUpdated({ ...quiz, status: 'announced', winner_nicknames: submissions.filter((s) => s.is_winner).map((s) => s.user_nickname) });
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
                        <h3 className="text-lg font-black text-[var(--moca-text)] mt-2">{quiz.question}</h3>
                        <p className="text-[12px] text-[var(--moca-text-3)] font-bold mt-0.5">🎁 {quiz.prize_description} · 정답: {quiz.correct_answer}</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--moca-text-3)] hover:text-[var(--moca-text)] text-xl leading-none">✕</button>
                </div>

                <div className="px-6 py-4 overflow-y-auto flex-1">
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
                                    <th className="py-2 pr-3">답변</th>
                                    <th className="py-2 pr-3">제출시각</th>
                                    <th className="py-2 pr-3">당첨</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map((s) => (
                                    <tr key={s.id} className="border-b border-[var(--moca-border)] last:border-0">
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-text)]">{s.user_nickname}</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text)]">{s.answer_text}</td>
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

    const load = async () => {
        setLoading(true);
        const data = await fetchAllQuizzesForAdmin();
        setQuizzes(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleCreated = (quiz) => {
        setQuizzes((prev) => [quiz, ...prev]);
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
                                <th className="py-2 pr-3">유형</th>
                                <th className="py-2 pr-3">상품</th>
                                <th className="py-2 pr-3">등록일</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quizzes.map((q) => {
                                const status = STATUS_LABEL[q.status] || STATUS_LABEL.open;
                                return (
                                    <tr
                                        key={q.id}
                                        onClick={() => setSelectedQuiz(q)}
                                        className="border-b border-[var(--moca-border)] last:border-0 cursor-pointer hover:bg-[var(--moca-surface-2)] transition-colors"
                                    >
                                        <td className="py-2.5 pr-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
                                        </td>
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-primary)] max-w-[280px] truncate underline decoration-dotted underline-offset-2">{q.question}</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)]">{q.question_type === 'multiple_choice' ? '객관식' : '주관식'}</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)] max-w-[160px] truncate">{q.prize_description}</td>
                                        <td className="py-2.5 pr-3 text-[10px] text-[var(--moca-text-3)]">{new Date(q.created_at).toLocaleDateString('ko-KR')}</td>
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
        </div>
    );
};

export default AdminCeoQuiz;
