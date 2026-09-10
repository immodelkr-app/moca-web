import React, { useEffect, useRef, useState } from 'react';
import {
    fetchAllMocaLiveStreams, createMocaLiveStream, updateMocaLiveStream,
    deleteMocaLiveStream, goLive, stopLive, extractYoutubeVideoId, uploadMocaLiveCover,
} from '../services/mocaLiveService';
import { sendBroadcastPush } from '../services/pushNotificationService';
import {
    fetchQuizzesForLive, createLiveQuiz, openLiveQuiz, closeLiveQuiz, archiveLiveQuiz,
    fetchCorrectAnswererNicknames, fetchQuizAnswerStats,
    fetchNumberGamesForLive, createNumberGame, cancelNumberGame, endNumberGameNow, archiveNumberGame,
    fetchNumberGameWinnerNicknames,
    fetchKeywordEventsForLive, createKeywordEvent, cancelKeywordEvent, endKeywordEventNow, archiveKeywordEvent,
    fetchKeywordEventWinnerNicknames,
    fetchLiveChatMessages, subscribeToLiveChat, sendLiveChatMessage,
    fetchPinnedMessage, setPinnedMessage, clearPinnedMessage,
    openLiveViewerPresence, closeLiveViewerPresence,
} from '../services/mocaLiveEngagementService';
import { grantWinnerPoints } from '../services/quizService';

const MAX_COVER_MB = 10;

// 관리자는 시청자로 집계되지 않도록 track() 없이 상태만 구독해서 인원수를 읽는다.
const LiveViewerCount = ({ liveId }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!liveId) return;
        const channel = openLiveViewerPresence(liveId, setCount, false);
        return () => closeLiveViewerPresence(channel);
    }, [liveId]);

    if (count === 0) return null;
    return <span className="ml-1.5 text-[10px] font-black text-[var(--moca-text-3)] align-middle">👀 {count}명</span>;
};

const EMPTY_FORM = {
    title: '',
    streamType: 'youtube', // 'youtube' | 'rtmp'
    youtubeInput: '',
    playbackUrl: '',
    streamerName: '김대표',
    coverImageUrl: '',
    targetGrade: 'ALL', // 'ALL' | 'GOLD'
};

// 커버 썸네일 업로더 - jpg/png 파일을 바로 올리거나, URL을 직접 붙여넣을 수도 있음
const CoverUploader = ({ value, onChange, onError }) => {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { onError('이미지 파일(jpg, png 등)만 업로드 가능합니다.'); return; }
        if (file.size > MAX_COVER_MB * 1024 * 1024) { onError(`최대 ${MAX_COVER_MB}MB까지 업로드 가능합니다.`); return; }

        setUploading(true);
        const { url, error } = await uploadMocaLiveCover(file);
        setUploading(false);
        if (error) { onError('업로드 실패: ' + (error.message || '')); return; }
        onChange(url);
    };

    return (
        <div>
            <label className="text-[11px] font-bold text-[var(--moca-text-3)]">커버 이미지 (선택, 비우면 유튜브 썸네일 사용)</label>
            <div className="flex gap-2 mt-1 items-start">
                <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-gray-100 border border-[var(--moca-border)] flex-shrink-0 flex items-center justify-center">
                    {value ? (
                        <img src={value} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-[10px] text-[var(--moca-text-3)]">미리보기</span>
                    )}
                    {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /></div>}
                </div>
                <div className="flex-1 space-y-1.5">
                    <button
                        type="button"
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full py-2 rounded-xl border border-dashed border-[var(--moca-border)] text-[11px] font-bold text-[var(--moca-text-3)] disabled:opacity-50"
                    >
                        {uploading ? '업로드 중...' : '📷 jpg/png 파일 선택'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                    <input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-[var(--moca-border)] text-[11px]"
                        placeholder="또는 이미지 URL 직접 입력"
                    />
                </div>
            </div>
        </div>
    );
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

const EMPTY_QUIZ_FORM = { question: '', options: ['', ''] };

// 라이브 중 실시간 퀴즈 관리 - 문제 등록/시작/마감(정답 확정+채점)/정답자 포인트 지급.
const AdminMocaLiveQuizPanel = ({ liveId }) => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_QUIZ_FORM);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [statsByQuiz, setStatsByQuiz] = useState({});
    const [closingQuizId, setClosingQuizId] = useState(null);
    const [correctChoice, setCorrectChoice] = useState(null);
    const [grantingQuizId, setGrantingQuizId] = useState(null);
    const [grantAmount, setGrantAmount] = useState('100');

    const load = async () => {
        setLoading(true);
        const data = await fetchQuizzesForLive(liveId);
        setQuizzes(data);
        setLoading(false);

        const closedIds = data.filter((q) => q.status !== 'draft').map((q) => q.id);
        const statsEntries = await Promise.all(
            closedIds.map(async (id) => [id, await fetchQuizAnswerStats(id)])
        );
        setStatsByQuiz(Object.fromEntries(statsEntries));
    };

    useEffect(() => { load(); }, [liveId]);

    const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

    const updateOption = (idx, value) => {
        setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === idx ? value : o)) }));
    };

    const addOption = () => {
        if (form.options.length >= 4) return;
        setForm((f) => ({ ...f, options: [...f.options, ''] }));
    };

    const removeOption = (idx) => {
        if (form.options.length <= 2) return;
        setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== idx) }));
    };

    const handleCreate = async () => {
        const question = form.question.trim();
        const options = form.options.map((o) => o.trim()).filter(Boolean);
        if (!question) { flash('문제를 입력해주세요.'); return; }
        if (options.length < 2) { flash('보기를 2개 이상 입력해주세요.'); return; }

        setSaving(true);
        const { error } = await createLiveQuiz(liveId, question, options);
        setSaving(false);
        if (error) { flash('등록 실패: ' + (error.message || '')); return; }

        setForm(EMPTY_QUIZ_FORM);
        flash('퀴즈가 등록되었습니다. "퀴즈 시작"을 눌러 시청자에게 노출하세요.');
        await load();
    };

    const handleOpen = async (quiz) => {
        if (!window.confirm(`'${quiz.question}' 퀴즈를 시작할까요?\n진행 중인 다른 퀴즈는 자동으로 마감됩니다.`)) return;
        const { error } = await openLiveQuiz(quiz.id, liveId);
        if (error) { flash('시작 실패: ' + (error.message || '')); return; }
        flash('🎮 퀴즈가 시작되었습니다. 시청자에게 실시간으로 노출됩니다.');
        await load();
    };

    const startClosing = (quiz) => {
        setClosingQuizId(quiz.id);
        setCorrectChoice(null);
    };

    const handleConfirmClose = async (quiz) => {
        if (correctChoice === null) { flash('정답을 선택해주세요.'); return; }
        const { error } = await closeLiveQuiz(quiz.id, correctChoice);
        if (error) { flash('마감 실패: ' + (error.message || '')); return; }
        setClosingQuizId(null);
        flash('✅ 정답이 확정되었습니다. 시청자에게 결과가 표시됩니다.');
        await load();
    };

    const handleGrantPoints = async (quiz) => {
        const amount = Number(grantAmount);
        if (!amount || amount <= 0) { flash('지급할 포인트 수를 입력해주세요.'); return; }

        const nicknames = await fetchCorrectAnswererNicknames(quiz.id);
        if (nicknames.length === 0) { flash('정답을 맞춘 시청자가 없습니다.'); return; }
        if (!window.confirm(`정답자 ${nicknames.length}명에게 ${amount}P씩 지급할까요?`)) return;

        setGrantingQuizId(quiz.id);
        const results = await grantWinnerPoints(nicknames, amount, `모카TV 라이브 퀴즈 정답 (${quiz.question})`);
        setGrantingQuizId(null);

        const successCount = results.filter((r) => r.success).length;
        flash(`포인트 지급 완료: 성공 ${successCount}건 / 실패 ${results.length - successCount}건`);
    };

    // 시청자 화면에서 내리기(보관) - 응답 기록/포인트 지급 이력은 그대로 남는다.
    // 방송을 껐다 켜도 지난 퀴즈 결과가 다시 노출되는 걸 막기 위해 다음 퀴즈 전 눌러준다.
    const handleArchive = async (quiz) => {
        if (!window.confirm('이 퀴즈를 시청자 화면에서 내릴까요? (응답 기록은 어드민에 그대로 남습니다)')) return;
        const { error } = await archiveLiveQuiz(quiz.id);
        if (error) { flash('보관 실패: ' + (error.message || '')); return; }
        flash('🗄 시청자 화면에서 내려갔습니다.');
        await load();
    };

    return (
        <div className="bg-[var(--moca-surface-2)] rounded-2xl p-4 mt-2">
            <p className="text-[12px] font-black text-[var(--moca-text)] mb-3">🎮 실시간 퀴즈 관리</p>

            {msg && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                    {msg}
                </div>
            )}

            <div className="bg-white rounded-xl p-3 mb-3 space-y-2">
                <input
                    value={form.question}
                    onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                    placeholder="문제를 입력하세요 (예: 오늘 방송에서 소개한 브랜드는?)"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--moca-border)] text-[12px]"
                />
                {form.options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                        <input
                            value={opt}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            placeholder={`보기 ${idx + 1}`}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--moca-border)] text-[12px]"
                        />
                        {form.options.length > 2 && (
                            <button onClick={() => removeOption(idx)} className="text-[10px] text-[var(--moca-text-3)] font-bold px-1">삭제</button>
                        )}
                    </div>
                ))}
                <div className="flex items-center justify-between pt-1">
                    <button
                        onClick={addOption}
                        disabled={form.options.length >= 4}
                        className="text-[11px] font-bold text-[var(--moca-primary)] disabled:opacity-30"
                    >
                        + 보기 추가 (최대 4개)
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={saving}
                        className="px-3 py-1.5 rounded-lg bg-[var(--moca-primary)] text-white text-[11px] font-black disabled:opacity-50"
                    >
                        {saving ? '등록 중...' : '퀴즈 등록'}
                    </button>
                </div>
            </div>

            {loading ? (
                <p className="text-[11px] text-[var(--moca-text-3)] font-bold py-4 text-center">불러오는 중...</p>
            ) : quizzes.length === 0 ? (
                <p className="text-[11px] text-[var(--moca-text-3)] font-bold py-4 text-center">등록된 퀴즈가 없습니다.</p>
            ) : (
                <div className="space-y-2">
                    {quizzes.map((q) => {
                        const stats = statsByQuiz[q.id];
                        return (
                            <div key={q.id} className="bg-white rounded-xl p-3">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <p className="text-[12px] font-bold text-[var(--moca-text)] flex-1">{q.question}</p>
                                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black ${
                                        q.status === 'open' ? 'bg-red-100 text-red-700'
                                        : q.status === 'closed' ? 'bg-gray-100 text-gray-500'
                                        : q.status === 'archived' ? 'bg-slate-100 text-slate-400'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {q.status === 'open' ? '🔴 진행 중' : q.status === 'closed' ? '마감' : q.status === 'archived' ? '🗄 보관됨' : '대기(초안)'}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-1 mb-2">
                                    {(q.options || []).map((opt, idx) => (
                                        <span
                                            key={idx}
                                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                                q.status === 'closed' && q.correct_option_index === idx
                                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                                                    : 'border-[var(--moca-border)] text-[var(--moca-text-3)]'
                                            }`}
                                        >
                                            {opt}{stats?.byOption?.[idx] ? ` (${stats.byOption[idx]})` : ''}
                                        </span>
                                    ))}
                                </div>

                                {closingQuizId === q.id ? (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[var(--moca-border)] mt-1.5">
                                        <span className="text-[10px] font-bold text-[var(--moca-text-3)]">정답 선택:</span>
                                        {(q.options || []).map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setCorrectChoice(idx)}
                                                className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${correctChoice === idx ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-[var(--moca-border)] text-[var(--moca-text-3)]'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                        <button onClick={() => handleConfirmClose(q)} className="ml-auto text-[10px] font-black text-emerald-600">확정</button>
                                        <button onClick={() => setClosingQuizId(null)} className="text-[10px] font-bold text-[var(--moca-text-3)]">취소</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[var(--moca-border)] mt-1.5">
                                        {q.status !== 'open' && (
                                            <button onClick={() => handleOpen(q)} className="text-[11px] font-black text-red-500">
                                                {q.status === 'draft' ? '▶ 퀴즈 시작' : '↻ 다시 시작'}
                                            </button>
                                        )}
                                        {q.status === 'open' && (
                                            <button onClick={() => startClosing(q)} className="text-[11px] font-black text-[var(--moca-primary)]">🔒 정답 확정 & 마감</button>
                                        )}
                                        {q.status === 'closed' && (
                                            <>
                                                <input
                                                    value={grantAmount}
                                                    onChange={(e) => setGrantAmount(e.target.value)}
                                                    type="number"
                                                    className="w-16 px-2 py-1 rounded-lg border border-[var(--moca-border)] text-[10px]"
                                                />
                                                <span className="text-[10px] text-[var(--moca-text-3)]">P씩</span>
                                                <button
                                                    onClick={() => handleGrantPoints(q)}
                                                    disabled={grantingQuizId === q.id}
                                                    className="text-[11px] font-black text-amber-600 disabled:opacity-40"
                                                >
                                                    {grantingQuizId === q.id ? '지급 중...' : '🎁 정답자 포인트 지급'}
                                                </button>
                                                <button onClick={() => handleArchive(q)} className="text-[11px] font-black text-slate-400 hover:text-slate-600">
                                                    🗄 내리기
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const EMPTY_NUMBER_GAME_FORM = { minValue: '1', maxValue: '100', answer: '', prizeLabel: '', winnerCount: '1' };

// 숫자 맞추기 관리 - 범위/정답/경품/당첨인원을 정해 등록하면 즉시 시청자에게 노출되어 진행됨.
const AdminMocaLiveNumberGamePanel = ({ liveId }) => {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_NUMBER_GAME_FORM);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [grantingGameId, setGrantingGameId] = useState(null);
    const [grantAmount, setGrantAmount] = useState('100');

    const load = async () => {
        setLoading(true);
        const data = await fetchNumberGamesForLive(liveId);
        setGames(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, [liveId]);

    const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

    const hasOpenGame = games.some((g) => g.status === 'open');

    const handleStart = async () => {
        const minValue = Number(form.minValue);
        const maxValue = Number(form.maxValue);
        const answer = Number(form.answer);
        const winnerCount = Number(form.winnerCount) || 1;

        if (!Number.isInteger(minValue) || !Number.isInteger(maxValue) || minValue >= maxValue) {
            flash('범위를 올바르게 입력해주세요 (최소 < 최대).'); return;
        }
        if (!Number.isInteger(answer) || answer < minValue || answer > maxValue) {
            flash('정답은 범위 안의 숫자여야 합니다.'); return;
        }
        if (hasOpenGame) {
            flash('이미 진행 중인 게임이 있습니다. 먼저 마감하거나 취소해주세요.'); return;
        }

        setSaving(true);
        const { error } = await createNumberGame(liveId, { minValue, maxValue, answer, prizeLabel: form.prizeLabel.trim(), winnerCount });
        setSaving(false);
        if (error) { flash('시작 실패: ' + (error.message || '')); return; }

        setForm(EMPTY_NUMBER_GAME_FORM);
        flash('🔢 게임이 시작되었습니다. 시청자에게 실시간으로 노출됩니다.');
        await load();
    };

    const handleCancel = async (game) => {
        if (!window.confirm('진행 중인 게임을 취소할까요? (정답 공개 없이 종료)')) return;
        const { error } = await cancelNumberGame(game.id);
        if (error) { flash('취소 실패: ' + (error.message || '')); return; }
        flash('게임이 취소되었습니다.');
        await load();
    };

    const handleEndNow = async (game) => {
        if (!window.confirm('지금 바로 게임을 마감할까요? (당첨 인원이 안 찼어도 종료됩니다)')) return;
        const { error } = await endNumberGameNow(game.id);
        if (error) { flash('마감 실패: ' + (error.message || '')); return; }
        flash('게임이 마감되었습니다.');
        await load();
    };

    const handleGrantPoints = async (game) => {
        const amount = Number(grantAmount);
        if (!amount || amount <= 0) { flash('지급할 포인트 수를 입력해주세요.'); return; }

        const nicknames = await fetchNumberGameWinnerNicknames(game.id);
        if (nicknames.length === 0) { flash('당첨자가 없습니다.'); return; }
        if (!window.confirm(`당첨자 ${nicknames.length}명에게 ${amount}P씩 지급할까요?`)) return;

        setGrantingGameId(game.id);
        const results = await grantWinnerPoints(nicknames, amount, `모카TV 숫자맞추기 당첨 (정답 ${game.answer})`);
        setGrantingGameId(null);

        const successCount = results.filter((r) => r.success).length;
        flash(`포인트 지급 완료: 성공 ${successCount}건 / 실패 ${results.length - successCount}건`);
    };

    // 시청자 화면에서 내리기(보관) - 당첨 기록/포인트 지급 이력은 그대로 남는다.
    const handleArchive = async (game) => {
        if (!window.confirm('이 게임을 시청자 화면에서 내릴까요? (당첨 기록은 어드민에 그대로 남습니다)')) return;
        const { error } = await archiveNumberGame(game.id);
        if (error) { flash('보관 실패: ' + (error.message || '')); return; }
        flash('🗄 시청자 화면에서 내려갔습니다.');
        await load();
    };

    return (
        <div className="bg-[var(--moca-surface-2)] rounded-2xl p-4 mt-2">
            <p className="text-[12px] font-black text-[var(--moca-text)] mb-3">🔢 숫자 맞추기 관리</p>

            {msg && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                    {msg}
                </div>
            )}

            {!hasOpenGame && (
                <div className="bg-white rounded-xl p-3 mb-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                        <input
                            value={form.minValue}
                            onChange={(e) => setForm((f) => ({ ...f, minValue: e.target.value }))}
                            type="number"
                            placeholder="최소"
                            className="w-16 px-2 py-1.5 rounded-lg border border-[var(--moca-border)] text-[12px]"
                        />
                        <span className="text-[11px] text-[var(--moca-text-3)]">~</span>
                        <input
                            value={form.maxValue}
                            onChange={(e) => setForm((f) => ({ ...f, maxValue: e.target.value }))}
                            type="number"
                            placeholder="최대"
                            className="w-16 px-2 py-1.5 rounded-lg border border-[var(--moca-border)] text-[12px]"
                        />
                        <span className="text-[11px] text-[var(--moca-text-3)] ml-2">정답:</span>
                        <input
                            value={form.answer}
                            onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))}
                            type="number"
                            placeholder="예: 42"
                            className="w-20 px-2 py-1.5 rounded-lg border border-[var(--moca-border)] text-[12px]"
                        />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <input
                            value={form.prizeLabel}
                            onChange={(e) => setForm((f) => ({ ...f, prizeLabel: e.target.value }))}
                            placeholder="경품 설명 (선택, 예: 스타벅스 기프티콘)"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--moca-border)] text-[12px]"
                        />
                        <input
                            value={form.winnerCount}
                            onChange={(e) => setForm((f) => ({ ...f, winnerCount: e.target.value }))}
                            type="number"
                            min="1"
                            className="w-14 px-2 py-1.5 rounded-lg border border-[var(--moca-border)] text-[12px]"
                        />
                        <span className="text-[10px] text-[var(--moca-text-3)]">명 당첨</span>
                    </div>
                    <button
                        onClick={handleStart}
                        disabled={saving}
                        className="w-full py-2 rounded-lg bg-[var(--moca-primary)] text-white text-[12px] font-black disabled:opacity-50"
                    >
                        {saving ? '시작 중...' : '🔢 게임 시작'}
                    </button>
                </div>
            )}

            {loading ? (
                <p className="text-[11px] text-[var(--moca-text-3)] font-bold py-4 text-center">불러오는 중...</p>
            ) : games.length === 0 ? (
                <p className="text-[11px] text-[var(--moca-text-3)] font-bold py-4 text-center">등록된 게임이 없습니다.</p>
            ) : (
                <div className="space-y-2">
                    {games.map((g) => (
                        <div key={g.id} className="bg-white rounded-xl p-3">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <p className="text-[12px] font-bold text-[var(--moca-text)]">
                                    {g.min_value}~{g.max_value} · 정답 {g.answer}
                                    {g.prize_label && <span className="text-[var(--moca-text-3)]"> · {g.prize_label}</span>}
                                </p>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    g.status === 'open' ? 'bg-red-100 text-red-700'
                                    : g.status === 'closed' ? 'bg-gray-100 text-gray-500'
                                    : g.status === 'archived' ? 'bg-slate-100 text-slate-400'
                                    : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {g.status === 'open' ? '🔴 진행 중' : g.status === 'closed' ? '마감' : g.status === 'archived' ? '🗄 보관됨' : '취소됨'}
                                </span>
                            </div>
                            <p className="text-[10px] text-[var(--moca-text-3)] mb-2">
                                당첨 {g.current_winner_count}/{g.winner_count}명
                            </p>

                            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[var(--moca-border)] mt-1.5">
                                {g.status === 'open' && (
                                    <>
                                        <button onClick={() => handleEndNow(g)} className="text-[11px] font-black text-[var(--moca-primary)]">⏹ 지금 마감</button>
                                        <button onClick={() => handleCancel(g)} className="text-[11px] font-black text-[var(--moca-text-3)]">🚫 취소</button>
                                    </>
                                )}
                                {g.status === 'closed' && (
                                    <>
                                        <input
                                            value={grantAmount}
                                            onChange={(e) => setGrantAmount(e.target.value)}
                                            type="number"
                                            className="w-16 px-2 py-1 rounded-lg border border-[var(--moca-border)] text-[10px]"
                                        />
                                        <span className="text-[10px] text-[var(--moca-text-3)]">P씩</span>
                                        <button
                                            onClick={() => handleGrantPoints(g)}
                                            disabled={grantingGameId === g.id}
                                            className="text-[11px] font-black text-amber-600 disabled:opacity-40"
                                        >
                                            {grantingGameId === g.id ? '지급 중...' : '🎁 당첨자 포인트 지급'}
                                        </button>
                                        <button onClick={() => handleArchive(g)} className="text-[11px] font-black text-slate-400 hover:text-slate-600">
                                            🗄 내리기
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const EMPTY_KEYWORD_EVENT_FORM = { keyword: '', prizeLabel: '', winnerCount: '1' };

// 키워드 정답 맞추기 관리 - 문제/보기 없이 정답 키워드 한 단어만 등록. 방송에서 말로 질문하고,
// 시청자가 채팅에 그 단어가 들어간 메시지를 치면 (평소 채팅 그대로) 자동으로 당첨 처리됨.
const AdminMocaLiveKeywordEventPanel = ({ liveId }) => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(EMPTY_KEYWORD_EVENT_FORM);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [grantingEventId, setGrantingEventId] = useState(null);
    const [grantAmount, setGrantAmount] = useState('100');

    const load = async () => {
        setLoading(true);
        const data = await fetchKeywordEventsForLive(liveId);
        setEvents(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, [liveId]);

    const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

    const hasOpenEvent = events.some((e) => e.status === 'open');

    const handleStart = async () => {
        const keyword = form.keyword.trim();
        const winnerCount = Number(form.winnerCount) || 1;
        if (!keyword) { flash('정답 키워드를 입력해주세요.'); return; }
        if (hasOpenEvent) { flash('이미 진행 중인 이벤트가 있습니다. 먼저 마감하거나 취소해주세요.'); return; }

        setSaving(true);
        const { error } = await createKeywordEvent(liveId, { keyword, prizeLabel: form.prizeLabel.trim(), winnerCount });
        setSaving(false);
        if (error) { flash('시작 실패: ' + (error.message || '')); return; }

        setForm(EMPTY_KEYWORD_EVENT_FORM);
        flash('💬 이벤트가 시작되었습니다. 이제 방송에서 말로 질문하시면, 채팅에 정답을 치는 시청자가 자동으로 당첨돼요.');
        await load();
    };

    const handleCancel = async (event) => {
        if (!window.confirm('진행 중인 이벤트를 취소할까요?')) return;
        const { error } = await cancelKeywordEvent(event.id);
        if (error) { flash('취소 실패: ' + (error.message || '')); return; }
        flash('이벤트가 취소되었습니다.');
        await load();
    };

    const handleEndNow = async (event) => {
        if (!window.confirm('지금 바로 이벤트를 마감할까요? (당첨 인원이 안 찼어도 종료됩니다)')) return;
        const { error } = await endKeywordEventNow(event.id);
        if (error) { flash('마감 실패: ' + (error.message || '')); return; }
        flash('이벤트가 마감되었습니다.');
        await load();
    };

    const handleGrantPoints = async (event) => {
        const amount = Number(grantAmount);
        if (!amount || amount <= 0) { flash('지급할 포인트 수를 입력해주세요.'); return; }

        const nicknames = await fetchKeywordEventWinnerNicknames(event.id);
        if (nicknames.length === 0) { flash('당첨자가 없습니다.'); return; }
        if (!window.confirm(`당첨자 ${nicknames.length}명에게 ${amount}P씩 지급할까요?`)) return;

        setGrantingEventId(event.id);
        const results = await grantWinnerPoints(nicknames, amount, `모카TV 정답 맞추기 당첨 (정답 ${event.keyword})`);
        setGrantingEventId(null);

        const successCount = results.filter((r) => r.success).length;
        flash(`포인트 지급 완료: 성공 ${successCount}건 / 실패 ${results.length - successCount}건`);
    };

    // 시청자 화면에서 내리기(보관) - 당첨 기록/포인트 지급 이력은 그대로 남는다.
    const handleArchive = async (event) => {
        if (!window.confirm('이 이벤트를 시청자 화면에서 내릴까요? (당첨 기록은 어드민에 그대로 남습니다)')) return;
        const { error } = await archiveKeywordEvent(event.id);
        if (error) { flash('보관 실패: ' + (error.message || '')); return; }
        flash('🗄 시청자 화면에서 내려갔습니다.');
        await load();
    };

    return (
        <div className="bg-[var(--moca-surface-2)] rounded-2xl p-4 mt-2">
            <p className="text-[12px] font-black text-[var(--moca-text)] mb-1">💬 정답 맞추기 이벤트 관리</p>
            <p className="text-[10px] text-[var(--moca-text-3)] mb-3 leading-relaxed">
                문제/보기를 미리 안 써도 돼요. 정답 키워드만 등록하고 방송에서 말로 질문하면, 시청자가 채팅창에
                그 단어가 들어간 메시지를 치는 순간 자동으로 당첨 처리됩니다 (선착순, 1인 1회).
            </p>

            {msg && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                    {msg}
                </div>
            )}

            {!hasOpenEvent && (
                <div className="bg-white rounded-xl p-3 mb-3 space-y-2">
                    <input
                        value={form.keyword}
                        onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
                        placeholder="정답 키워드 (예: 아임모델)"
                        className="w-full px-3 py-2 rounded-lg border border-[var(--moca-border)] text-[12px]"
                    />
                    <div className="flex items-center gap-1.5">
                        <input
                            value={form.prizeLabel}
                            onChange={(e) => setForm((f) => ({ ...f, prizeLabel: e.target.value }))}
                            placeholder="경품 설명 (선택)"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-[var(--moca-border)] text-[12px]"
                        />
                        <input
                            value={form.winnerCount}
                            onChange={(e) => setForm((f) => ({ ...f, winnerCount: e.target.value }))}
                            type="number"
                            min="1"
                            className="w-14 px-2 py-1.5 rounded-lg border border-[var(--moca-border)] text-[12px]"
                        />
                        <span className="text-[10px] text-[var(--moca-text-3)]">명 당첨</span>
                    </div>
                    <button
                        onClick={handleStart}
                        disabled={saving}
                        className="w-full py-2 rounded-lg bg-[var(--moca-primary)] text-white text-[12px] font-black disabled:opacity-50"
                    >
                        {saving ? '시작 중...' : '💬 이벤트 시작'}
                    </button>
                </div>
            )}

            {loading ? (
                <p className="text-[11px] text-[var(--moca-text-3)] font-bold py-4 text-center">불러오는 중...</p>
            ) : events.length === 0 ? (
                <p className="text-[11px] text-[var(--moca-text-3)] font-bold py-4 text-center">등록된 이벤트가 없습니다.</p>
            ) : (
                <div className="space-y-2">
                    {events.map((e) => (
                        <div key={e.id} className="bg-white rounded-xl p-3">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                <p className="text-[12px] font-bold text-[var(--moca-text)]">
                                    정답: {e.keyword}
                                    {e.prize_label && <span className="text-[var(--moca-text-3)]"> · {e.prize_label}</span>}
                                </p>
                                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black ${
                                    e.status === 'open' ? 'bg-red-100 text-red-700'
                                    : e.status === 'closed' ? 'bg-gray-100 text-gray-500'
                                    : e.status === 'archived' ? 'bg-slate-100 text-slate-400'
                                    : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {e.status === 'open' ? '🔴 진행 중' : e.status === 'closed' ? '마감' : e.status === 'archived' ? '🗄 보관됨' : '취소됨'}
                                </span>
                            </div>
                            <p className="text-[10px] text-[var(--moca-text-3)] mb-2">
                                당첨 {e.current_winner_count}/{e.winner_count}명
                            </p>

                            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-[var(--moca-border)] mt-1.5">
                                {e.status === 'open' && (
                                    <>
                                        <button onClick={() => handleEndNow(e)} className="text-[11px] font-black text-[var(--moca-primary)]">⏹ 지금 마감</button>
                                        <button onClick={() => handleCancel(e)} className="text-[11px] font-black text-[var(--moca-text-3)]">🚫 취소</button>
                                    </>
                                )}
                                {e.status === 'closed' && (
                                    <>
                                        <input
                                            value={grantAmount}
                                            onChange={(ev) => setGrantAmount(ev.target.value)}
                                            type="number"
                                            className="w-16 px-2 py-1 rounded-lg border border-[var(--moca-border)] text-[10px]"
                                        />
                                        <span className="text-[10px] text-[var(--moca-text-3)]">P씩</span>
                                        <button
                                            onClick={() => handleGrantPoints(e)}
                                            disabled={grantingEventId === e.id}
                                            className="text-[11px] font-black text-amber-600 disabled:opacity-40"
                                        >
                                            {grantingEventId === e.id ? '지급 중...' : '🎁 당첨자 포인트 지급'}
                                        </button>
                                        <button onClick={() => handleArchive(e)} className="text-[11px] font-black text-slate-400 hover:text-slate-600">
                                            🗄 내리기
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// 라이브별 게임 관리 진입점 - 정답 맞추기(키워드) / 실시간 퀴즈 / 숫자맞추기 탭으로 구분
const AdminMocaLiveGamesPanel = ({ liveId }) => {
    const [tab, setTab] = useState('keyword');

    return (
        <div>
            <div className="flex gap-1 p-1 rounded-xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)] w-fit">
                <button
                    onClick={() => setTab('keyword')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-colors ${tab === 'keyword' ? 'bg-white text-[var(--moca-primary)] shadow-sm' : 'text-[var(--moca-text-3)]'}`}
                >
                    💬 정답 맞추기
                </button>
                <button
                    onClick={() => setTab('number')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-colors ${tab === 'number' ? 'bg-white text-[var(--moca-primary)] shadow-sm' : 'text-[var(--moca-text-3)]'}`}
                >
                    🔢 숫자 맞추기
                </button>
                <button
                    onClick={() => setTab('quiz')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-colors ${tab === 'quiz' ? 'bg-white text-[var(--moca-primary)] shadow-sm' : 'text-[var(--moca-text-3)]'}`}
                >
                    🎮 실시간 퀴즈
                </button>
            </div>
            {tab === 'keyword' && <AdminMocaLiveKeywordEventPanel liveId={liveId} />}
            {tab === 'number' && <AdminMocaLiveNumberGamePanel liveId={liveId} />}
            {tab === 'quiz' && <AdminMocaLiveQuizPanel liveId={liveId} />}
        </div>
    );
};

// 고정 댓글(공지) + 운영자 채팅 관리
// - 고정 댓글: 직접 문구를 입력하거나 최근 채팅 중 하나를 골라 그대로 고정
// - 운영자 채팅: 시청자처럼 프론트에 로그인하지 않아도 여기서 바로 채팅에 메시지를 보낼 수 있음
//   (is_host=true로 저장되어 시청자 화면 채팅창에 다른 색/배지로 구분 표시됨)
const AdminMocaLivePinnedMessagePanel = ({ liveId, streamerName }) => {
    const [pinned, setPinned] = useState(null);
    const [loading, setLoading] = useState(true);
    const [manualText, setManualText] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [recentChat, setRecentChat] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [sendingChat, setSendingChat] = useState(false);

    const load = async () => {
        setLoading(true);
        const [pin, chat] = await Promise.all([
            fetchPinnedMessage(liveId),
            fetchLiveChatMessages(liveId, 20),
        ]);
        setPinned(pin);
        setRecentChat(chat);
        setLoading(false);
    };

    useEffect(() => {
        load();
        const unsubscribe = subscribeToLiveChat(liveId, (newMsg) => {
            setRecentChat((prev) => [...prev.slice(-19), newMsg]);
        });
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [liveId]);

    const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

    const handlePin = async (text, author) => {
        if (!text.trim()) { flash('고정할 내용을 입력해주세요.'); return; }
        setSaving(true);
        const { error } = await setPinnedMessage(liveId, text, author || null);
        setSaving(false);
        if (error) { flash('고정 실패: ' + (error.message || '')); return; }
        setManualText('');
        flash('📌 고정되었습니다.');
        await load();
    };

    const handleUnpin = async () => {
        const { error } = await clearPinnedMessage(liveId);
        if (error) { flash('해제 실패: ' + (error.message || '')); return; }
        flash('고정이 해제되었습니다.');
        await load();
    };

    const handleSendChat = async () => {
        const text = chatInput.trim();
        if (!text || sendingChat) return;
        setSendingChat(true);
        const { error } = await sendLiveChatMessage(liveId, streamerName || '김대표', text, { isHost: true });
        setSendingChat(false);
        if (error) { flash('채팅 전송 실패: ' + (error.message || '')); return; }
        setChatInput('');
    };

    return (
        <div className="bg-[var(--moca-surface-2)] rounded-2xl p-4 mt-2">
            <p className="text-[12px] font-black text-[var(--moca-text)] mb-3">👑 운영자 채팅 보내기</p>
            <div className="bg-white rounded-xl p-3 mb-4 space-y-1.5">
                <div className="flex items-center gap-1.5">
                    <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                        placeholder={`${streamerName || '김대표'}(으)로 채팅 보내기`}
                        className="flex-1 px-3 py-2 rounded-lg border border-[var(--moca-border)] text-[12px]"
                    />
                    <button
                        onClick={handleSendChat}
                        disabled={sendingChat || !chatInput.trim()}
                        className="px-3 py-2 rounded-lg bg-amber-500 text-white text-[11px] font-black disabled:opacity-40"
                    >
                        {sendingChat ? '전송 중...' : '👑 전송'}
                    </button>
                </div>
                <p className="text-[10px] text-[var(--moca-text-3)]">프론트에 로그인하지 않아도 여기서 바로 채팅을 보낼 수 있어요. 시청자 화면엔 👑 배지와 강조색으로 표시됩니다.</p>
            </div>

            <p className="text-[12px] font-black text-[var(--moca-text)] mb-3">📌 고정 댓글 관리</p>

            {msg && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                    {msg}
                </div>
            )}

            {pinned ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex items-start justify-between gap-2">
                    <p className="text-[12px] font-bold text-amber-800 flex-1">
                        {pinned.pinned_message_author && <span className="font-black">{pinned.pinned_message_author}: </span>}
                        {pinned.pinned_message}
                    </p>
                    <button onClick={handleUnpin} className="text-[11px] font-black text-red-500 flex-shrink-0">해제</button>
                </div>
            ) : (
                <p className="text-[11px] text-[var(--moca-text-3)] font-bold mb-3">현재 고정된 댓글이 없습니다.</p>
            )}

            <div className="bg-white rounded-xl p-3 mb-3 space-y-2">
                <p className="text-[11px] font-bold text-[var(--moca-text-3)]">직접 입력해서 고정</p>
                <div className="flex items-center gap-1.5">
                    <input
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        placeholder="예: 정답은 채팅에 그대로 쳐주세요!"
                        className="flex-1 px-3 py-2 rounded-lg border border-[var(--moca-border)] text-[12px]"
                    />
                    <button
                        onClick={() => handlePin(manualText, null)}
                        disabled={saving || !manualText.trim()}
                        className="px-3 py-2 rounded-lg bg-[var(--moca-primary)] text-white text-[11px] font-black disabled:opacity-40"
                    >
                        📌 고정
                    </button>
                </div>
            </div>

            <p className="text-[11px] font-bold text-[var(--moca-text-3)] mb-1.5">최근 채팅에서 골라 고정</p>
            {loading ? (
                <p className="text-[11px] text-[var(--moca-text-3)] font-bold py-4 text-center">불러오는 중...</p>
            ) : recentChat.length === 0 ? (
                <p className="text-[11px] text-[var(--moca-text-3)] font-bold py-4 text-center">아직 채팅이 없습니다.</p>
            ) : (
                <div className="bg-white rounded-xl max-h-64 overflow-y-auto divide-y divide-[var(--moca-border)]">
                    {recentChat.slice().reverse().map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-2 px-3 py-2">
                            <p className="text-[11.5px] text-[var(--moca-text)] flex-1 truncate">
                                <span className={`font-black ${c.is_host ? 'text-amber-600' : ''}`}>{c.is_host && '👑 '}{c.user_nickname}</span>: {c.message}
                            </p>
                            <button
                                onClick={() => handlePin(c.message, c.user_nickname)}
                                disabled={saving}
                                className="text-[11px] font-bold text-[var(--moca-primary)] flex-shrink-0 disabled:opacity-40"
                            >
                                📌 고정
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const AdminMocaLive = () => {
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [pushResult, setPushResult] = useState(null);
    const [sendingPush, setSendingPush] = useState(false);
    const [quizPanelId, setQuizPanelId] = useState(null);
    const [pinnedPanelId, setPinnedPanelId] = useState(null);

    const load = async () => {
        setLoading(true);
        const data = await fetchAllMocaLiveStreams();
        setStreams(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const flashMsg = (text) => {
        setMsg(text);
        setTimeout(() => setMsg(''), 3000);
    };

    const openCreate = () => {
        setEditingId(null);
        // RTMP 채널은 재발급 없이 재사용하므로, 마지막에 쓴 재생 URL을 기본값으로 미리 채워준다.
        const lastPlaybackUrl = window.localStorage.getItem('mocaLive_lastRtmpPlaybackUrl') || '';
        setForm({ ...EMPTY_FORM, playbackUrl: lastPlaybackUrl });
        setError('');
        setActiveTab('create');
    };

    const openEdit = (stream) => {
        setEditingId(stream.id);
        setForm({
            title: stream.title,
            streamType: stream.stream_type || 'youtube',
            youtubeInput: stream.youtube_video_id || '',
            playbackUrl: stream.playback_url || '',
            streamerName: stream.streamer_name,
            coverImageUrl: stream.cover_image_url || '',
            targetGrade: stream.target_grade || 'ALL',
        });
        setError('');
        setActiveTab('create');
    };

    const handleSave = async () => {
        setError('');
        if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }

        let videoId = '';
        let playbackUrl = '';
        if (form.streamType === 'rtmp') {
            playbackUrl = form.playbackUrl.trim();
            if (!playbackUrl) { setError('RTMP 채널의 재생 URL(HLS)을 입력해주세요.'); return; }
            window.localStorage.setItem('mocaLive_lastRtmpPlaybackUrl', playbackUrl);
        } else {
            videoId = extractYoutubeVideoId(form.youtubeInput);
            if (!videoId) { setError('유튜브 링크 또는 videoId 형식이 올바르지 않습니다.'); return; }
        }

        setSaving(true);
        const payload = {
            title: form.title.trim(),
            streamType: form.streamType,
            youtubeVideoId: videoId,
            playbackUrl,
            streamerName: form.streamerName.trim() || '김대표',
            coverImageUrl: form.coverImageUrl.trim(),
            targetGrade: form.targetGrade,
        };
        const { error: saveError } = editingId
            ? await updateMocaLiveStream(editingId, payload)
            : await createMocaLiveStream(payload);
        setSaving(false);

        if (saveError) {
            setError('저장 중 오류가 발생했습니다: ' + (saveError.message || ''));
            return;
        }

        flashMsg(editingId ? '수정되었습니다.' : '등록되었습니다.');
        setActiveTab('list');
        await load();
    };

    const handleGoLive = async (stream) => {
        if (!window.confirm(`'${stream.title}'을(를) 지금 라이브로 전환할까요?\n다른 방송이 라이브 중이면 자동으로 종료됩니다.`)) return;
        const { error: liveError } = await goLive(stream.id);
        if (liveError) {
            flashMsg('라이브 전환 중 오류가 발생했습니다: ' + (liveError.message || ''));
            return;
        }
        flashMsg('🔴 라이브가 시작되었습니다.');
        await load();
    };

    const handleStop = async (stream) => {
        if (!window.confirm(`'${stream.title}' 라이브를 종료할까요?`)) return;
        const { error: stopError } = await stopLive(stream.id);
        if (stopError) {
            flashMsg('종료 중 오류가 발생했습니다: ' + (stopError.message || ''));
            return;
        }
        flashMsg('라이브가 종료되었습니다.');
        await load();
    };

    const handleDelete = async (stream) => {
        if (!window.confirm(`'${stream.title}'을(를) 삭제하시겠습니까?`)) return;
        const { error: deleteError } = await deleteMocaLiveStream(stream.id);
        if (deleteError) {
            flashMsg('삭제 중 오류가 발생했습니다: ' + (deleteError.message || ''));
            return;
        }
        flashMsg('삭제되었습니다.');
        await load();
    };

    const handleSendLivePush = async (stream) => {
        setSendingPush(true);
        const result = await sendBroadcastPush({
            title: '🔴 모카TV 라이브 방송 중!',
            body: stream.title,
            route: '/home/dashboard',
        });
        setPushResult(result);
        setSendingPush(false);
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex gap-1 p-1 mb-4 rounded-2xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)]">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-black transition-colors ${activeTab === 'list' ? 'bg-white text-[var(--moca-primary)] shadow-sm' : 'text-[var(--moca-text-3)]'}`}
                >
                    전체 방송 {streams.length}건
                </button>
                <button
                    onClick={openCreate}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-black transition-colors ${activeTab === 'create' ? 'bg-white text-[var(--moca-primary)] shadow-sm' : 'text-[var(--moca-text-3)]'}`}
                >
                    🔴 새 라이브 등록
                </button>
            </div>

            {msg && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
                    {msg}
                </div>
            )}

            {activeTab === 'create' && (
                <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5 mb-6">
                    <p className="text-sm font-black text-[var(--moca-text)] mb-4">
                        {editingId ? '✏️ 라이브 방송 수정' : '🔴 새 라이브 방송 등록'}
                    </p>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[11px] font-bold text-[var(--moca-text-3)]">제목 *</label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                                placeholder="예: 김대표와 함께하는 오디션 합격 Q&A"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-[var(--moca-text-3)]">송출 방식 *</label>
                            <div className="flex gap-1 mt-1 p-1 rounded-xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)]">
                                <button
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, streamType: 'youtube' }))}
                                    className={`flex-1 py-2 rounded-lg text-[12px] font-black transition-colors ${form.streamType === 'youtube' ? 'bg-white text-[var(--moca-primary)] shadow-sm' : 'text-[var(--moca-text-3)]'}`}
                                >
                                    유튜브 링크
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm((f) => ({ ...f, streamType: 'rtmp' }))}
                                    className={`flex-1 py-2 rounded-lg text-[12px] font-black transition-colors ${form.streamType === 'rtmp' ? 'bg-white text-[var(--moca-primary)] shadow-sm' : 'text-[var(--moca-text-3)]'}`}
                                >
                                    RTMP (AWS IVS 등)
                                </button>
                            </div>
                        </div>

                        {form.streamType === 'youtube' ? (
                            <div>
                                <label className="text-[11px] font-bold text-[var(--moca-text-3)]">유튜브 라이브 링크 (미등록/비공개 권장) *</label>
                                <input
                                    value={form.youtubeInput}
                                    onChange={(e) => setForm((f) => ({ ...f, youtubeInput: e.target.value }))}
                                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                                    placeholder="예: https://www.youtube.com/watch?v=xxxxxxxxxxx"
                                />
                                <p className="text-[10px] text-[var(--moca-text-3)] mt-1">유튜브 스튜디오에서 라이브를 "미등록(링크 공개)"으로 켠 뒤 그 링크를 붙여넣으세요. 검색엔 노출되지 않고 모카 앱을 통해서만 시청됩니다.</p>
                            </div>
                        ) : (
                            <div>
                                <label className="text-[11px] font-bold text-[var(--moca-text-3)]">재생 URL (HLS, .m3u8) *</label>
                                <input
                                    value={form.playbackUrl}
                                    onChange={(e) => setForm((f) => ({ ...f, playbackUrl: e.target.value }))}
                                    className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                                    placeholder="예: https://xxxxxxxxxxxx.us-east-1.playback.live-video.net/.../channel.m3u8"
                                />
                                <p className="text-[10px] text-[var(--moca-text-3)] mt-1 leading-relaxed">
                                    AWS 콘솔 → Amazon IVS에서 채널을 한 번만 만들면 Ingest 서버 주소·스트림키·Playback URL이 발급됩니다.
                                    채널은 계속 재사용하므로 방송마다 새로 만들 필요는 없고, 여기엔 그 중 <b>Playback URL</b>만 입력하면 됩니다.
                                    실제 방송 송출은 OBS 등에 Ingest 주소+스트림키를 넣어 별도로 진행하세요 (스트림키는 외부 유출 방지를 위해 이 화면에 저장하지 않습니다).
                                </p>
                            </div>
                        )}

                        <div>
                            <label className="text-[11px] font-bold text-[var(--moca-text-3)]">진행자명</label>
                            <input
                                value={form.streamerName}
                                onChange={(e) => setForm((f) => ({ ...f, streamerName: e.target.value }))}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                                placeholder="예: 김대표"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-[var(--moca-text-3)]">노출 대상 등급 *</label>
                            <div className="flex gap-2 mt-1">
                                {[{ id: 'ALL', label: '전체등급 공개' }, { id: 'GOLD', label: '골드모카 등급 전용' }].map((opt) => (
                                    <label
                                        key={opt.id}
                                        className={`flex-1 cursor-pointer text-center py-2.5 rounded-xl border-2 text-[12px] font-black transition-colors ${form.targetGrade === opt.id ? 'border-[var(--moca-primary)] bg-[var(--moca-primary)]/5 text-[var(--moca-primary)]' : 'border-[var(--moca-border)] text-[var(--moca-text-3)]'}`}
                                    >
                                        <input
                                            type="radio"
                                            name="targetGrade"
                                            value={opt.id}
                                            checked={form.targetGrade === opt.id}
                                            onChange={(e) => setForm((f) => ({ ...f, targetGrade: e.target.value }))}
                                            className="hidden"
                                        />
                                        {opt.label}
                                    </label>
                                ))}
                            </div>
                            <p className="text-[10px] text-[var(--moca-text-3)] mt-1">골드모카 등급 전용으로 설정하면 GOLD 이상 회원에게만 홈 대시보드에 노출됩니다.</p>
                        </div>

                        <CoverUploader
                            value={form.coverImageUrl}
                            onChange={(url) => setForm((f) => ({ ...f, coverImageUrl: url }))}
                            onError={setError}
                        />

                        {error && <p className="text-[12px] font-bold text-red-500">{error}</p>}

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 py-2.5 rounded-xl bg-[var(--moca-primary)] text-white font-black text-[13px] disabled:opacity-50"
                            >
                                {saving ? '저장 중...' : editingId ? '수정 저장' : '등록'}
                            </button>
                            <button
                                onClick={() => setActiveTab('list')}
                                className="px-4 py-2.5 rounded-xl border border-[var(--moca-border)] text-[var(--moca-text-3)] font-black text-[13px]"
                            >
                                취소
                            </button>
                        </div>
                        <p className="text-[10px] text-[var(--moca-text-3)]">등록만으로는 앱에 노출되지 않습니다. 목록에서 "🔴 라이브 시작"을 눌러야 실제로 대시보드에 노출됩니다.</p>
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-black text-[var(--moca-text)]">전체 방송 <span className="text-[var(--moca-primary)]">{streams.length}</span>건</p>
                        <button onClick={load} className="text-xs font-bold text-[var(--moca-text-3)] hover:text-[var(--moca-primary)]">새로고침</button>
                    </div>

                    {loading ? (
                        <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">불러오는 중...</p>
                    ) : streams.length === 0 ? (
                        <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">등록된 라이브 방송이 없습니다.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[11px] text-[var(--moca-text-3)] font-bold border-b border-[var(--moca-border)]">
                                        <th className="py-2 pr-3">상태</th>
                                        <th className="py-2 pr-3">제목</th>
                                        <th className="py-2 pr-3">진행자</th>
                                        <th className="py-2 pr-3">등록일</th>
                                        <th className="py-2 pr-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {streams.map((s) => (
                                        <React.Fragment key={s.id}>
                                        <tr className="border-b border-[var(--moca-border)] last:border-0">
                                            <td className="py-2.5 pr-3 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${s.is_live ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {s.is_live ? '🔴 라이브 중' : '대기'}
                                                </span>
                                                {s.is_live && <LiveViewerCount liveId={s.id} />}
                                            </td>
                                            <td className="py-2.5 pr-3 font-bold text-[var(--moca-text)] max-w-[240px] truncate">
                                                <span className="inline-block mr-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-gray-100 text-gray-500 align-middle">
                                                    {s.stream_type === 'rtmp' ? 'RTMP' : 'YT'}
                                                </span>
                                                {s.target_grade === 'GOLD' && (
                                                    <span className="inline-block mr-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-700 align-middle">
                                                        GOLD
                                                    </span>
                                                )}
                                                {s.title}
                                                {s.heart_count > 0 && (
                                                    <span className="inline-block ml-1.5 text-[10px] text-red-400 align-middle">❤️ {s.heart_count}</span>
                                                )}
                                            </td>
                                            <td className="py-2.5 pr-3 text-[var(--moca-text-3)]">{s.streamer_name}</td>
                                            <td className="py-2.5 pr-3 text-[10px] text-[var(--moca-text-3)]">{new Date(s.created_at).toLocaleDateString('ko-KR')}</td>
                                            <td className="py-2.5 pr-3">
                                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                                    {s.is_live ? (
                                                        <button onClick={() => handleStop(s)} className="text-[11px] font-black text-red-500 hover:underline">종료</button>
                                                    ) : (
                                                        <button onClick={() => handleGoLive(s)} className="text-[11px] font-black text-red-500 hover:underline">🔴 라이브 시작</button>
                                                    )}
                                                    {s.is_live && (
                                                        <button
                                                            onClick={() => handleSendLivePush(s)}
                                                            disabled={sendingPush}
                                                            className="text-[11px] font-black text-fuchsia-600 hover:underline disabled:opacity-40"
                                                        >
                                                            {sendingPush ? '발송 중...' : '🔔 알림'}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setQuizPanelId(quizPanelId === s.id ? null : s.id)}
                                                        className="text-[11px] font-black text-violet-600 hover:underline"
                                                    >
                                                        🎮 게임 {quizPanelId === s.id ? '닫기' : '관리'}
                                                    </button>
                                                    <button
                                                        onClick={() => setPinnedPanelId(pinnedPanelId === s.id ? null : s.id)}
                                                        className="text-[11px] font-black text-amber-600 hover:underline"
                                                    >
                                                        📌 고정댓글 {pinnedPanelId === s.id ? '닫기' : '관리'}
                                                    </button>
                                                    <button onClick={() => openEdit(s)} className="text-[11px] font-black text-[var(--moca-text-3)] hover:text-[var(--moca-primary)]">✏️ 수정</button>
                                                    <button onClick={() => handleDelete(s)} className="text-[11px] font-black text-[var(--moca-text-3)] hover:text-red-500">삭제</button>
                                                </div>
                                            </td>
                                        </tr>
                                        {quizPanelId === s.id && (
                                            <tr>
                                                <td colSpan={5} className="pb-3">
                                                    <AdminMocaLiveGamesPanel liveId={s.id} />
                                                </td>
                                            </tr>
                                        )}
                                        {pinnedPanelId === s.id && (
                                            <tr>
                                                <td colSpan={5} className="pb-3">
                                                    <AdminMocaLivePinnedMessagePanel liveId={s.id} streamerName={s.streamer_name} />
                                                </td>
                                            </tr>
                                        )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <PushResultBadge result={pushResult} />
                </>
            )}
        </div>
    );
};

export default AdminMocaLive;
