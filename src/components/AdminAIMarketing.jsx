import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchClasses, fetchActiveApplicationCounts } from '../services/classService';
import { fetchAllCertPostsForAdmin, parseImageUrls } from '../services/certificationService';
import { CARD_TEMPLATES } from '../lib/cardNewsRenderer';
import {
    CLAUDE_MODELS,
    getSavedApiKey,
    saveApiKey,
    clearApiKey,
    getSavedModel,
    saveModel,
    maskApiKey,
    callClaude,
    buildInsightPrompt,
    buildCopywriterPrompt,
    buildCardCopyPrompt,
    parseCardCopy,
} from '../services/aiMarketingService';

const SUB_TABS = [
    { key: 'insight', label: '📊 데이터 인사이트', color: 'border-purple-500 text-purple-700 bg-purple-50' },
    { key: 'writer', label: '✨ 글쓰기 도우미', color: 'border-fuchsia-500 text-fuchsia-700 bg-fuchsia-50' },
    { key: 'card', label: '🖼️ 홍보물 & 카드뉴스', color: 'border-violet-500 text-violet-700 bg-violet-50' },
];

const inputClass =
    'w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-sm text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors';

const primaryBtnClass =
    'w-full bg-[var(--moca-primary)] hover:bg-[var(--moca-primary-2)] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2';

/** 결과 텍스트 + 토큰 사용량 + 복사/재생성 버튼을 보여주는 공통 결과 패널 */
const ResultPanel = ({ loading, error, result, onCopy, onRegenerate, canRegenerate, emptyHint }) => (
    <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-6 shadow-sm h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-[var(--moca-text)]">결과물</h3>
            {result?.text && (
                <div className="flex gap-2">
                    <button onClick={onCopy} className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[var(--moca-border)] text-[var(--moca-text-2)] hover:bg-gray-50">
                        📋 복사
                    </button>
                    {canRegenerate && (
                        <button onClick={onRegenerate} disabled={loading} className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-[var(--moca-border)] text-[var(--moca-text-2)] hover:bg-gray-50 disabled:opacity-40">
                            🔄 다시 생성
                        </button>
                    )}
                </div>
            )}
        </div>
        <div className="flex-1 min-h-[220px]">
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--moca-text-3)]">
                    <div className="w-8 h-8 border-2 border-[var(--moca-primary-lt)] border-t-[var(--moca-primary)] rounded-full animate-spin" />
                    <p className="text-xs font-bold">AI가 작성 중입니다...</p>
                </div>
            ) : error ? (
                <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-red-500 font-bold text-center px-4">⚠️ {error}</p>
                </div>
            ) : result?.text ? (
                <p className="text-sm text-[var(--moca-text)] whitespace-pre-wrap leading-relaxed">{result.text}</p>
            ) : (
                <div className="h-full flex items-center justify-center">
                    <p className="text-sm text-[var(--moca-text-3)]">{emptyHint || '좌측에서 실행 버튼을 눌러주세요.'}</p>
                </div>
            )}
        </div>
        {result?.text && !loading && (
            <p className="text-[10px] text-[var(--moca-text-3)] mt-4 pt-3 border-t border-[var(--moca-border)]">
                입력 {result.inputTokens.toLocaleString()} 토큰 · 출력 {result.outputTokens.toLocaleString()} 토큰 · 예상 비용 ${result.estimatedCost.toFixed(4)}
            </p>
        )}
    </div>
);

const AdminAIMarketing = ({ stats, setSuccessMsg }) => {
    const [apiKey, setApiKey] = useState(getSavedApiKey());
    const [model, setModel] = useState(getSavedModel());
    const [subTab, setSubTab] = useState('insight');

    // ── 데이터 인사이트 ──
    const [insightState, setInsightState] = useState({ loading: false, error: '', result: null });
    const [popularClasses, setPopularClasses] = useState([]);
    const [certActivity, setCertActivity] = useState(null);

    // ── 글쓰기 도우미 ──
    const [writerForm, setWriterForm] = useState({ topic: '', channel: 'SNS 캡션', tone: '' });
    const [writerState, setWriterState] = useState({ loading: false, error: '', result: null });

    // ── 홍보물 & 카드뉴스 ──
    const [cardTemplate, setCardTemplate] = useState('stat');
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedStatKey, setSelectedStatKey] = useState('stats30Days');
    const [appHighlights, setAppHighlights] = useState('소속 에이전시 정보를 한눈에\n투어일지로 활동 기록 자동 관리\n모델 전용 클래스 신청');
    const [cardCopyState, setCardCopyState] = useState({ loading: false, error: '', result: null });
    const [cardFields, setCardFields] = useState({ title: '', subtitle: '', cta: '' });
    const [cardInsightContext, setCardInsightContext] = useState('');
    const [marketingCertPosts, setMarketingCertPosts] = useState([]);
    const [selectedCertPostId, setSelectedCertPostId] = useState('');
    const canvasRef = useRef(null);
    const redrawGenerationRef = useRef(0);

    useEffect(() => {
        if (cardTemplate === 'class' && classes.length === 0) {
            fetchClasses().then(({ data }) => setClasses(data || []));
        }
    }, [cardTemplate, classes.length]);

    // 인기 클래스(신청자 수 기준) — 데이터 인사이트 소재로 사용
    useEffect(() => {
        Promise.all([fetchClasses(), fetchActiveApplicationCounts()]).then(([classesRes, countsRes]) => {
            const counts = countsRes.data || {};
            const ranked = (classesRes.data || [])
                .map((c) => ({ title: c.title, applicantCount: counts[c.id] || 0, capacity: c.capacity, status: c.status }))
                .filter((c) => c.applicantCount > 0)
                .sort((a, b) => b.applicantCount - a.applicantCount)
                .slice(0, 5);
            setPopularClasses(ranked);
        });
    }, []);

    // 인증샷(모카그램) 활동 현황 — 데이터 인사이트 소재로 사용
    useEffect(() => {
        fetchAllCertPostsForAdmin(false).then((posts) => {
            const list = posts || [];
            const now = new Date();
            const last30DaysPosts = list.filter((p) => (now - new Date(p.created_at)) <= 30 * 24 * 60 * 60 * 1000).length;

            const activityTypeBreakdown = {};
            list.forEach((p) => {
                if (p.activity_type) activityTypeBreakdown[p.activity_type] = (activityTypeBreakdown[p.activity_type] || 0) + 1;
            });

            // 마케팅 활용에 동의한 게시물 (카드뉴스 소재로 사용 — 동의 안 한 게시물은 절대 포함하지 않음)
            const agreedPosts = list
                .filter((p) => p.is_marketing_agreed)
                .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));

            const marketingAgreedTopPosts = agreedPosts
                .slice(0, 5)
                .map((p) => ({ activityType: p.activity_type, tag: p.tag_label, caption: p.caption, likes: p.likes_count || 0 }));

            setCertActivity({
                totalPosts: list.length,
                last30DaysPosts,
                activityTypeBreakdown,
                marketingAgreedTopPosts,
            });

            setMarketingCertPosts(agreedPosts.slice(0, 20).map((p) => ({
                id: p.id,
                activityType: p.activity_type,
                tag: p.tag_label,
                caption: p.caption,
                likes: p.likes_count || 0,
                imageUrl: parseImageUrls(p.image_url)[0] || '',
            })));
        });
    }, []);

    const handleApiKeyBlur = () => {
        if (apiKey) saveApiKey(apiKey);
        else clearApiKey();
    };

    const handleModelChange = (e) => {
        setModel(e.target.value);
        saveModel(e.target.value);
    };

    const handleSaveKey = () => {
        if (!apiKey) return;
        saveApiKey(apiKey);
        setSuccessMsg?.('API 키가 저장되었습니다.');
    };

    const handleClearKey = () => {
        if (!window.confirm('API 키를 삭제하시겠습니까?')) return;
        setApiKey('');
        clearApiKey();
    };

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            setSuccessMsg?.('클립보드에 복사되었습니다.');
        } catch {
            // 클립보드 접근 실패는 조용히 무시 (텍스트는 화면에 그대로 남아있음)
        }
    };

    const statOptions = [
        { key: 'stats1Day', label: '오늘 방문', value: stats.stats1Day, unit: '회' },
        { key: 'stats7Days', label: '최근 7일 방문', value: stats.stats7Days, unit: '회' },
        { key: 'stats30Days', label: '최근 30일 방문', value: stats.stats30Days, unit: '회' },
        { key: 'totalUsersCount', label: '전체 가입 멤버', value: stats.totalUsersCount, unit: '명' },
        { key: 'signupMalePercent', label: '남성 회원 비율', value: stats.signupMalePercent, unit: '%' },
        { key: 'signupFemalePercent', label: '여성 회원 비율', value: stats.signupFemalePercent, unit: '%' },
    ];

    // ── 인사이트 생성 ──
    const runInsight = async () => {
        setInsightState({ loading: true, error: '', result: insightState.result });
        try {
            const { system, prompt } = buildInsightPrompt({ ...stats, popularClasses, certActivity });
            const result = await callClaude({ apiKey, model, system, prompt, maxTokens: 1800 });
            setInsightState({ loading: false, error: '', result });
        } catch (err) {
            setInsightState({ loading: false, error: err.message, result: null });
        }
    };

    // ── 인사이트 → 콘텐츠 제작 이어가기 ──
    const sendInsightToWriter = () => {
        if (!insightState.result?.text) return;
        setWriterForm({
            topic: `아래 데이터 인사이트를 참고해서 인스타그램/SNS에 올릴 홍보 문구를 작성해줘:\n\n${insightState.result.text}`,
            channel: 'SNS 캡션',
            tone: '',
        });
        setSubTab('writer');
    };

    const sendInsightToCard = () => {
        if (!insightState.result?.text) return;
        setCardInsightContext(insightState.result.text);
        setSubTab('card');
    };

    // ── 글쓰기 도우미 → 카드뉴스 이어가기 ──
    const sendWriterToCard = () => {
        if (!writerState.result?.text) return;
        setCardInsightContext(writerState.result.text);
        setSubTab('card');
    };

    // ── 글쓰기 도우미 ──
    const runWriter = async () => {
        if (!writerForm.topic.trim()) {
            setWriterState({ loading: false, error: '어떤 문구가 필요한지 먼저 입력해주세요.', result: null });
            return;
        }
        setWriterState({ loading: true, error: '', result: writerState.result });
        try {
            const { system, prompt } = buildCopywriterPrompt(writerForm);
            const result = await callClaude({ apiKey, model, system, prompt, maxTokens: 900 });
            setWriterState({ loading: false, error: '', result });
        } catch (err) {
            setWriterState({ loading: false, error: err.message, result: null });
        }
    };

    // ── 카드뉴스 문구 생성 ──
    const buildCardData = () => {
        if (cardTemplate === 'stat') {
            const stat = statOptions.find((s) => s.key === selectedStatKey) || statOptions[0];
            return { label: stat.label, value: stat.value, unit: stat.unit };
        }
        if (cardTemplate === 'class') {
            const cls = classes.find((c) => String(c.id) === String(selectedClassId));
            return cls
                ? { title: cls.title, schedule: cls.class_date || '', priceInfo: cls.price_info || '' }
                : { title: '', schedule: '', priceInfo: '' };
        }
        if (cardTemplate === 'cert') {
            const post = marketingCertPosts.find((p) => String(p.id) === String(selectedCertPostId));
            return post
                ? { activityType: post.activityType, tag: post.tag, caption: post.caption, likes: post.likes }
                : { activityType: '', tag: '', caption: '', likes: 0 };
        }
        return { highlights: appHighlights.split('\n').filter(Boolean) };
    };

    const runCardCopy = async () => {
        setCardCopyState({ loading: true, error: '', result: cardCopyState.result });
        try {
            const { system, prompt } = buildCardCopyPrompt({
                templateType: cardTemplate,
                data: buildCardData(),
                context: cardInsightContext || undefined,
            });
            const result = await callClaude({ apiKey, model, system, prompt, maxTokens: 500 });
            const parsed = parseCardCopy(result.text);
            setCardFields(parsed);
            setCardCopyState({ loading: false, error: '', result });
        } catch (err) {
            setCardCopyState({ loading: false, error: err.message, result: null });
        }
    };

    // ── 카드뉴스 캔버스 렌더링 ──
    const redrawCard = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const template = CARD_TEMPLATES.find((t) => t.id === cardTemplate);
        if (!template) return;

        const generation = ++redrawGenerationRef.current;

        let drawArgs;
        if (cardTemplate === 'stat') {
            const stat = statOptions.find((s) => s.key === selectedStatKey) || statOptions[0];
            drawArgs = {
                label: cardFields.title || stat.label,
                value: stat.value,
                unit: stat.unit,
                sublabel: cardFields.subtitle,
            };
        } else if (cardTemplate === 'class') {
            const cls = classes.find((c) => String(c.id) === String(selectedClassId));
            drawArgs = {
                title: cardFields.title || cls?.title || '클래스 안내',
                schedule: cardFields.subtitle || cls?.class_date || '',
                priceInfo: cls?.price_info || '',
                imageUrl: cls?.image_url || '',
            };
        } else if (cardTemplate === 'cert') {
            const post = marketingCertPosts.find((p) => String(p.id) === String(selectedCertPostId));
            drawArgs = {
                headline: cardFields.title || 'MOCA와 함께하는 순간',
                activityType: post?.activityType || '',
                caption: post?.caption || '',
                likes: post?.likes || 0,
                imageUrl: post?.imageUrl || '',
            };
        } else {
            drawArgs = {
                headline: cardFields.title || 'MOCA와 함께하세요',
                bullets: appHighlights.split('\n').filter(Boolean),
                cta: cardFields.cta,
            };
        }

        try {
            await template.draw(canvas, drawArgs);
        } catch (err) {
            if (generation === redrawGenerationRef.current) {
                console.error('카드뉴스 렌더링 실패:', err);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardTemplate, cardFields, selectedStatKey, selectedClassId, classes, appHighlights, selectedCertPostId, marketingCertPosts]);

    useEffect(() => {
        redrawCard();
    }, [redrawCard, subTab]);

    const downloadCard = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        try {
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = `moca-cardnews-${cardTemplate}-${Date.now()}.png`;
            a.click();
            setSuccessMsg?.('카드뉴스 이미지를 다운로드했습니다.');
        } catch {
            setCardCopyState((s) => ({ ...s, error: '이미지 다운로드에 실패했습니다 (외부 이미지 보안 정책). 이미지 없이 다시 시도해보세요.' }));
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* ── 헤더 & API 설정 ── */}
            <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-6 shadow-sm mb-6">
                <div className="flex items-center gap-3 mb-5 border-b border-[var(--moca-border)] pb-4">
                    <span className="text-3xl">🤖</span>
                    <div>
                        <h2 className="text-xl font-black text-[var(--moca-text)]">AI 마케팅 & 데이터 분석 센터</h2>
                        <p className="text-sm text-[var(--moca-text-3)] mt-0.5">관리자 본인의 Claude API 키로 마케팅 문구, 데이터 인사이트, 카드뉴스를 생성합니다.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">Claude API Key</label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                autoComplete="off"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                onBlur={handleApiKeyBlur}
                                placeholder="sk-ant-..."
                                className={inputClass}
                            />
                            <button onClick={handleSaveKey} disabled={!apiKey} className="shrink-0 px-3 rounded-xl border border-[var(--moca-border)] text-xs font-bold text-[var(--moca-text-2)] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                                저장
                            </button>
                            {apiKey && (
                                <button onClick={handleClearKey} className="shrink-0 px-3 rounded-xl border border-[var(--moca-border)] text-xs font-bold text-[var(--moca-text-2)] hover:bg-gray-50">
                                    삭제
                                </button>
                            )}
                        </div>
                        <p className="text-[10px] text-[var(--moca-text-3)] mt-1.5">
                            {apiKey ? `저장된 키: ${maskApiKey(apiKey)} · 이 브라우저에만 저장됩니다.` : 'console.claude.com에서 발급받은 키를 입력하세요. 이 브라우저에만 저장되며 서버로 전송되지 않습니다.'}
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">Model</label>
                        <select value={model} onChange={handleModelChange} className={inputClass}>
                            {CLAUDE_MODELS.map((m) => (
                                <option key={m.id} value={m.id}>{m.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* ── 서브탭 ── */}
            <div className="flex gap-2 border-b border-[var(--moca-border)] pb-0 mb-6 flex-wrap">
                {SUB_TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setSubTab(t.key)}
                        className={`pb-3 px-4 text-[13px] font-bold transition-all border-b-2 rounded-t-lg ${
                            subTab === t.key ? t.color : 'border-transparent text-gray-500 hover:text-[var(--moca-text)] hover:bg-gray-50'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── 데이터 인사이트 ── */}
            {subTab === 'insight' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-6 shadow-sm">
                        <p className="text-sm text-[var(--moca-text-2)] mb-4">
                            통계 탭에 집계된 최근 데이터(방문/가입/성비/연령대/인기 클래스·에이전시 등)를 AI가 분석하고 실행 가능한 마케팅 제안을 작성합니다.
                        </p>
                        <div className="grid grid-cols-3 gap-2 mb-5">
                            {statOptions.slice(0, 3).map((s) => (
                                <div key={s.key} className="bg-[var(--moca-surface-2)] rounded-xl p-3 text-center border border-[var(--moca-border)]">
                                    <p className="text-[10px] text-[var(--moca-text-3)] font-bold">{s.label}</p>
                                    <p className="text-lg font-black text-[var(--moca-text)]">{s.value?.toLocaleString?.() ?? s.value}</p>
                                </div>
                            ))}
                        </div>
                        {stats.gradeBreakdown && Object.keys(stats.gradeBreakdown).length > 0 && (
                            <div className="mb-5">
                                <p className="text-xs font-bold text-[var(--moca-text-2)] mb-2">🏅 등급별 회원 분포</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(stats.gradeBreakdown).map(([label, count]) => (
                                        <div key={label} className="flex items-center justify-between bg-[var(--moca-surface-2)] rounded-lg px-3 py-2 border border-[var(--moca-border)]">
                                            <span className="text-xs font-bold text-[var(--moca-text)]">{label}</span>
                                            <span className="text-xs font-black text-[var(--moca-primary)]">{count}명</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {popularClasses.length > 0 && (
                            <div className="mb-5">
                                <p className="text-xs font-bold text-[var(--moca-text-2)] mb-2">🔥 인기 클래스 (신청자 수 기준)</p>
                                <div className="space-y-1.5">
                                    {popularClasses.map((c, i) => (
                                        <div key={c.title + i} className="flex items-center justify-between bg-[var(--moca-surface-2)] rounded-lg px-3 py-2 border border-[var(--moca-border)]">
                                            <span className="text-xs font-bold text-[var(--moca-text)] truncate">{i + 1}. {c.title}</span>
                                            <span className="text-xs font-black text-[var(--moca-primary)] shrink-0 ml-2">{c.applicantCount}명{c.capacity ? ` / ${c.capacity}명` : ''}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {certActivity && certActivity.totalPosts > 0 && (
                            <div className="mb-5">
                                <p className="text-xs font-bold text-[var(--moca-text-2)] mb-2">📸 인증샷(모카그램) 활동</p>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="bg-[var(--moca-surface-2)] rounded-lg px-3 py-2 border border-[var(--moca-border)] text-center">
                                        <p className="text-[10px] text-[var(--moca-text-3)] font-bold">전체 게시물</p>
                                        <p className="text-sm font-black text-[var(--moca-text)]">{certActivity.totalPosts}건</p>
                                    </div>
                                    <div className="bg-[var(--moca-surface-2)] rounded-lg px-3 py-2 border border-[var(--moca-border)] text-center">
                                        <p className="text-[10px] text-[var(--moca-text-3)] font-bold">최근 30일</p>
                                        <p className="text-sm font-black text-[var(--moca-text)]">{certActivity.last30DaysPosts}건</p>
                                    </div>
                                </div>
                                {Object.keys(certActivity.activityTypeBreakdown).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.entries(certActivity.activityTypeBreakdown).map(([type, count]) => (
                                            <span key={type} className="text-[10px] font-bold px-2 py-1 rounded-full bg-[var(--moca-primary-lt)] text-[var(--moca-primary)]">{type} {count}건</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <button onClick={runInsight} disabled={insightState.loading} className={primaryBtnClass}>
                            🔍 인사이트 생성
                        </button>
                    </div>
                    <ResultPanel
                        {...insightState}
                        onCopy={() => copyToClipboard(insightState.result?.text)}
                        onRegenerate={runInsight}
                        canRegenerate
                    />
                </div>
            )}
            {subTab === 'insight' && insightState.result?.text && !insightState.loading && (
                <div className="flex gap-2 mt-4 flex-wrap">
                    <button onClick={sendInsightToWriter} className="flex-1 min-w-[220px] bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200 font-bold text-sm py-3 rounded-xl transition-colors">
                        ✍️ 이 인사이트로 SNS 문구 만들기
                    </button>
                    <button onClick={sendInsightToCard} className="flex-1 min-w-[220px] bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 font-bold text-sm py-3 rounded-xl transition-colors">
                        🖼️ 이 인사이트로 카드뉴스 만들기
                    </button>
                </div>
            )}

            {/* ── 글쓰기 도우미 ── */}
            {subTab === 'writer' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-6 shadow-sm space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">채널</label>
                            <select value={writerForm.channel} onChange={(e) => setWriterForm((f) => ({ ...f, channel: e.target.value }))} className={inputClass}>
                                {['SNS 캡션', '카카오톡 알림톡', '문자 공지', '이메일'].map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">톤앤매너 (선택)</label>
                            <input type="text" value={writerForm.tone} onChange={(e) => setWriterForm((f) => ({ ...f, tone: e.target.value }))} placeholder="예: 발랄하고 친근하게" className={inputClass} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">어떤 문구가 필요하세요?</label>
                            <textarea
                                value={writerForm.topic}
                                onChange={(e) => setWriterForm((f) => ({ ...f, topic: e.target.value }))}
                                rows={5}
                                placeholder="예: 신규 클래스 오픈 안내 문자, 인증샷 이벤트 SNS 캡션 등"
                                className={`${inputClass} resize-none`}
                            />
                        </div>
                        <button onClick={runWriter} disabled={writerState.loading} className={primaryBtnClass}>
                            ✨ 문구 생성
                        </button>
                    </div>
                    <ResultPanel
                        {...writerState}
                        onCopy={() => copyToClipboard(writerState.result?.text)}
                        onRegenerate={runWriter}
                        canRegenerate
                    />
                </div>
            )}
            {subTab === 'writer' && writerState.result?.text && !writerState.loading && (
                <div className="flex gap-2 mt-4 flex-wrap">
                    <button onClick={sendWriterToCard} className="flex-1 min-w-[220px] bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 font-bold text-sm py-3 rounded-xl transition-colors">
                        🖼️ 이 문구로 카드뉴스 만들기
                    </button>
                </div>
            )}

            {/* ── 홍보물 & 카드뉴스 ── */}
            {subTab === 'card' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-6 shadow-sm space-y-4">
                        {cardInsightContext && (
                            <div className="flex items-start justify-between gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-2">
                                <p className="text-[11px] text-violet-700 font-bold leading-relaxed">📊 데이터 인사이트 내용이 참고자료로 연결되어 있습니다. AI 문구 생성 시 반영됩니다.</p>
                                <button onClick={() => setCardInsightContext('')} className="shrink-0 text-[11px] font-bold text-violet-500 hover:text-violet-700">해제</button>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-2">템플릿 선택</label>
                            <div className="flex gap-2 flex-wrap">
                                {CARD_TEMPLATES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => { setCardTemplate(t.id); setCardFields({ title: '', subtitle: '', cta: '' }); setCardCopyState({ loading: false, error: '', result: null }); setSelectedCertPostId(''); }}
                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                                            cardTemplate === t.id ? 'bg-[var(--moca-primary-lt)] border-[var(--moca-primary)] text-[var(--moca-primary)]' : 'border-[var(--moca-border)] text-[var(--moca-text-2)] hover:bg-gray-50'
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {cardTemplate === 'stat' && (
                            <div>
                                <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">강조할 지표</label>
                                <select value={selectedStatKey} onChange={(e) => setSelectedStatKey(e.target.value)} className={inputClass}>
                                    {statOptions.map((s) => (
                                        <option key={s.key} value={s.key}>{s.label} ({s.value}{s.unit})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {cardTemplate === 'class' && (
                            <div>
                                <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">클래스 선택</label>
                                <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className={inputClass}>
                                    <option value="">클래스를 선택하세요</option>
                                    {classes.map((c) => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                                {classes.length === 0 && <p className="text-[10px] text-[var(--moca-text-3)] mt-1">등록된 클래스가 없습니다.</p>}
                            </div>
                        )}

                        {cardTemplate === 'cert' && (
                            <div>
                                <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">인증샷 게시물 선택</label>
                                <select value={selectedCertPostId} onChange={(e) => setSelectedCertPostId(e.target.value)} className={inputClass}>
                                    <option value="">게시물을 선택하세요</option>
                                    {marketingCertPosts.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.activityType || '인증샷'} · {(p.caption || '').slice(0, 20)}{p.caption?.length > 20 ? '…' : ''} (❤️{p.likes})
                                        </option>
                                    ))}
                                </select>
                                {marketingCertPosts.length === 0 && <p className="text-[10px] text-[var(--moca-text-3)] mt-1">마케팅 활용에 동의한 인증샷 게시물이 없습니다.</p>}
                            </div>
                        )}

                        {cardTemplate === 'app' && (
                            <div>
                                <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1">강조 포인트 (한 줄에 하나씩, 최대 3개)</label>
                                <textarea value={appHighlights} onChange={(e) => setAppHighlights(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
                            </div>
                        )}

                        <button onClick={runCardCopy} disabled={cardCopyState.loading} className={primaryBtnClass}>
                            🪄 AI 문구 생성
                        </button>

                        {(cardFields.title || cardFields.subtitle || cardFields.cta) && (
                            <div className="space-y-2 pt-2 border-t border-[var(--moca-border)]">
                                <p className="text-xs font-bold text-[var(--moca-text-2)]">생성된 문구 (직접 수정 가능)</p>
                                <input type="text" value={cardFields.title} onChange={(e) => setCardFields((f) => ({ ...f, title: e.target.value }))} placeholder="제목" className={inputClass} />
                                <input type="text" value={cardFields.subtitle} onChange={(e) => setCardFields((f) => ({ ...f, subtitle: e.target.value }))} placeholder="부제" className={inputClass} />
                                <input type="text" value={cardFields.cta} onChange={(e) => setCardFields((f) => ({ ...f, cta: e.target.value }))} placeholder="CTA" className={inputClass} />
                            </div>
                        )}
                        {cardCopyState.error && <p className="text-xs text-red-500 font-bold">⚠️ {cardCopyState.error}</p>}
                    </div>

                    <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-6 shadow-sm flex flex-col items-center">
                        <h3 className="text-sm font-black text-[var(--moca-text)] self-start mb-3">미리보기</h3>
                        <canvas ref={canvasRef} className="w-full max-w-[360px] aspect-square rounded-xl border border-[var(--moca-border)] shadow-sm" />
                        <button onClick={downloadCard} className={`${primaryBtnClass} mt-4 max-w-[360px]`}>
                            ⬇️ PNG 다운로드
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAIMarketing;
