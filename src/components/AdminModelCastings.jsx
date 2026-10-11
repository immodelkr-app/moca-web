import React, { useEffect, useState } from 'react';
import { fetchCastings, importExternalCasting, createExternalCasting, updateExternalCasting, findCastingsByTitle, closeCasting, deleteCasting, getCastingStatus, todayKst, fetchCastingEventStats, fetchCastingClicks, getDdayInfo } from '../services/modelCastingService';

const CATEGORIES = [
    'TV광고', '뮤직비디오', '화보촬영', 'TV프로그램',
    'SNS/온라인예능', 'SNS/온라인광고', '홈쇼핑/라이브커머스', '교육/기업/홍보영상', '기타',
];
const SOURCE_CHANNELS = ['필름메이커스', '아임모델 카페', '밴드', '기타'];
const GENDER_OPTIONS = [{ value: 'any', label: '무관' }, { value: 'female', label: '여자' }, { value: 'male', label: '남자' }];

const inputCls = 'w-full border border-[var(--moca-border)] rounded-lg px-2.5 py-1.5 text-sm font-bold text-[var(--moca-text)] bg-white';
const labelCls = 'block text-[11px] text-[var(--moca-text-3)] font-bold mb-1';

const toFormState = (casting) => ({
    title: casting.title || '',
    category: CATEGORIES.includes(casting.category) ? casting.category : '기타',
    projectName: casting.projectName || '',
    producerName: casting.producerName || '',
    shootPeriod: casting.shootPeriod || '',
    shootLocation: casting.shootLocation || '',
    deadline: casting.deadline || '',
    contractType: casting.contractType || '',
    description: casting.description || '',
    applyGuide: casting.applyGuide || '',
    sourceUrl: casting.sourceUrl || '',
    sourceName: casting.sourceName || '',
    applyEmail: casting.applyEmail || '',
    applySubject: casting.applySubject || '',
    roles: (casting.roles || []).map((r) => ({
        roleName: r.roleName || '',
        gender: ['male', 'female', 'any'].includes(r.gender) ? r.gender : 'any',
        ageMin: r.ageMin ?? '',
        ageMax: r.ageMax ?? '',
        headcount: r.headcount ?? 1,
        pay: r.pay || '',
        schedule: r.schedule || '',
        description: r.description || '',
    })),
});

// 등록/수정 공용 입력 폼 (제목~지원방법 + 모집 역할 카드)
const CastingFormFields = ({ form, setForm }) => {
    const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
    const setRole = (idx, key, value) => setForm((f) => ({
        ...f,
        roles: f.roles.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    }));
    return (
        <>
        <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={labelCls}>제목</label><input className={inputCls} value={form.title} onChange={(e) => setField('title', e.target.value)} /></div>
            <div><label className={labelCls}>카테고리</label>
                <select className={inputCls} value={form.category} onChange={(e) => setField('category', e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div><label className={labelCls}>마감일 (비우면 앱에 표기 안 함)</label><input type="date" className={inputCls} value={form.deadline} onChange={(e) => setField('deadline', e.target.value)} /></div>
            <div><label className={labelCls}>프로젝트명</label><input className={inputCls} value={form.projectName} onChange={(e) => setField('projectName', e.target.value)} /></div>
            <div><label className={labelCls}>제작사</label><input className={inputCls} value={form.producerName} onChange={(e) => setField('producerName', e.target.value)} /></div>
            <div><label className={labelCls}>촬영기간</label><input className={inputCls} value={form.shootPeriod} onChange={(e) => setField('shootPeriod', e.target.value)} /></div>
            <div><label className={labelCls}>촬영장소</label><input className={inputCls} value={form.shootLocation} onChange={(e) => setField('shootLocation', e.target.value)} /></div>
            <div className="col-span-2"><label className={labelCls}>계약형태</label><input className={inputCls} value={form.contractType} onChange={(e) => setField('contractType', e.target.value)} /></div>
            <div className="col-span-2"><label className={labelCls}>상세 설명</label><textarea rows={6} className={inputCls} value={form.description} onChange={(e) => setField('description', e.target.value)} /></div>
            <div className="col-span-2"><label className={labelCls}>지원 방법 안내 (앱 상세에 문구로 노출됩니다)</label><textarea rows={4} className={inputCls} value={form.applyGuide} onChange={(e) => setField('applyGuide', e.target.value)} /></div>
            <div><label className={labelCls}>출처 채널 (어드민 전용)</label>
                <select className={inputCls} value={form.sourceName} onChange={(e) => setField('sourceName', e.target.value)}>
                    <option value="">선택 안 함</option>
                    {SOURCE_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div><label className={labelCls}>원문 링크 (비우면 "원문 공고 바로가기" 버튼 숨김)</label><input className={inputCls} value={form.sourceUrl} onChange={(e) => setField('sourceUrl', e.target.value)} placeholder="https://..." /></div>
            <div><label className={labelCls}>지원 이메일 (입력 시 "이메일로 지원하기" 버튼 노출)</label><input type="email" className={inputCls} value={form.applyEmail} onChange={(e) => setField('applyEmail', e.target.value)} placeholder="example@company.com" /></div>
            <div><label className={labelCls}>이메일 제목 (버튼 누르면 미리 입력됨)</label><input className={inputCls} value={form.applySubject} onChange={(e) => setField('applySubject', e.target.value)} placeholder="[말머리] 작품명 / 이름 / 나이" /></div>
            <p className="col-span-2 text-[10px] font-bold text-[var(--moca-text-3)] -mt-1">※ 지원 이메일은 앱의 지원 버튼 표시에만 사용합니다. 영업·홍보 목적의 수집/발송에는 사용하지 마세요.</p>
        </div>

        <div>
            <p className={labelCls}>모집 역할 ({form.roles.length})</p>
            <div className="space-y-2">
                {form.roles.map((r, idx) => (
                    <div key={idx} className="border border-[var(--moca-border)] rounded-xl p-3 bg-white grid grid-cols-6 gap-2">
                        <div className="col-span-4"><label className={labelCls}>역할명</label><input className={inputCls} value={r.roleName} onChange={(e) => setRole(idx, 'roleName', e.target.value)} /></div>
                        <div className="col-span-2"><label className={labelCls}>성별</label>
                            <select className={inputCls} value={r.gender} onChange={(e) => setRole(idx, 'gender', e.target.value)}>
                                {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2"><label className={labelCls}>최소 나이</label><input type="number" className={inputCls} value={r.ageMin} onChange={(e) => setRole(idx, 'ageMin', e.target.value)} /></div>
                        <div className="col-span-2"><label className={labelCls}>최대 나이</label><input type="number" className={inputCls} value={r.ageMax} onChange={(e) => setRole(idx, 'ageMax', e.target.value)} /></div>
                        <div className="col-span-2"><label className={labelCls}>인원</label><input type="number" className={inputCls} value={r.headcount} onChange={(e) => setRole(idx, 'headcount', e.target.value)} /></div>
                        <div className="col-span-3"><label className={labelCls}>페이</label><input className={inputCls} value={r.pay} onChange={(e) => setRole(idx, 'pay', e.target.value)} /></div>
                        <div className="col-span-3"><label className={labelCls}>일정</label><input className={inputCls} value={r.schedule} onChange={(e) => setRole(idx, 'schedule', e.target.value)} /></div>
                        <div className="col-span-6"><label className={labelCls}>역할 설명</label><input className={inputCls} value={r.description} onChange={(e) => setRole(idx, 'description', e.target.value)} /></div>
                        <button onClick={() => setForm((f) => ({ ...f, roles: f.roles.filter((_, i) => i !== idx) }))} className="col-span-6 text-[11px] font-bold text-red-500 text-right">역할 삭제</button>
                    </div>
                ))}
            </div>
        </div>

        </>
    );
};

// 폼 상태 → 서비스 호출용 값 (숫자 변환)
const toPayload = (form) => ({
    ...form,
    title: form.title.trim(),
    roles: form.roles.map((r) => ({
        ...r,
        ageMin: r.ageMin === '' ? null : Number(r.ageMin),
        ageMax: r.ageMax === '' ? null : Number(r.ageMax),
        headcount: r.headcount === '' ? 1 : Number(r.headcount),
    })),
});

// DB 행(snake_case) → 수정 폼 상태
const castingToFormState = (c) => ({
    ...toFormState({
        title: c.title, category: c.category, projectName: c.project_name, producerName: c.producer_name,
        shootPeriod: c.shoot_period, shootLocation: c.shoot_location, deadline: c.deadline,
        contractType: c.contract_type, description: c.description, applyGuide: c.apply_guide,
        sourceUrl: c.source_url, sourceName: c.source_name, applyEmail: c.apply_email, applySubject: c.apply_subject,
        roles: (c.model_casting_roles || []).map((r) => ({
            roleName: r.role_name, gender: r.gender, ageMin: r.age_min, ageMax: r.age_max,
            headcount: r.headcount, pay: r.pay, schedule: r.schedule, description: r.description,
        })),
    }),
    status: c.status === 'closed' ? 'closed' : 'open',
});

// 외부 공고 수정 팝업
const CastingEditModal = ({ casting, onClose, onSaved }) => {
    const [form, setForm] = useState(() => castingToFormState(casting));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!form.title.trim()) {
            setError('제목은 필수입니다.');
            return;
        }
        setSaving(true);
        setError('');
        const { error: err } = await updateExternalCasting(casting.id, toPayload(form));
        setSaving(false);
        if (err) {
            setError(err.message || '수정에 실패했습니다.');
            return;
        }
        onSaved();
    };

    return (
        <div className="fixed inset-0 bg-[#0c0714]/60 backdrop-blur-sm flex items-center justify-center z-[10000] p-4" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <div className="bg-white border border-[var(--moca-border)] w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-[var(--moca-border)] flex items-center justify-between bg-[var(--moca-surface-2)]">
                    <h3 className="text-base font-black text-[var(--moca-text)]">외부 공고 수정</h3>
                    <button onClick={onClose} className="text-[var(--moca-text-3)] hover:text-[var(--moca-text)] text-xl leading-none">✕</button>
                </div>
                <div className="px-6 py-5 overflow-y-auto space-y-3">
                    <div>
                        <label className={labelCls}>상태</label>
                        <select className={inputCls} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                            <option value="open">모집중 (마감일이 지나면 자동으로 마감 표시)</option>
                            <option value="closed">마감</option>
                        </select>
                    </div>
                    <CastingFormFields form={form} setForm={setForm} />
                    {error && <p className="text-xs font-bold text-red-600">{error}</p>}
                </div>
                <div className="px-6 py-3 border-t border-[var(--moca-border)] flex justify-end gap-2 bg-[var(--moca-surface-2)]">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-[var(--moca-border)] text-xs font-black text-[var(--moca-text-3)]">취소</button>
                    <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-[var(--moca-primary)] text-white text-xs font-black disabled:opacity-40">{saving ? '저장 중...' : '저장'}</button>
                </div>
            </div>
        </div>
    );
};

// 외부 공고(링크 또는 붙여넣은 본문) → AI 정리 → 검수/수정 → 등록
const ExternalImportPanel = ({ onCreated }) => {
    const [url, setUrl] = useState('');
    const [pastedText, setPastedText] = useState('');
    const [pasteMode, setPasteMode] = useState(false);
    const [channel, setChannel] = useState(SOURCE_CHANNELS[1]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState(null);

    const canImport = pasteMode ? pastedText.trim().length > 0 : url.trim().length > 0;

    const handleImport = async () => {
        if (!canImport) return;
        setLoading(true);
        setError('');
        const { data, error: err, needText } = await importExternalCasting({
            url: url.trim(),
            text: pasteMode ? pastedText : undefined,
        });
        setLoading(false);
        if (err) {
            setError(err);
            if (needText) setPasteMode(true);
            return;
        }
        setForm(toFormState({
            ...data.casting,
            sourceUrl: data.sourceUrl || '',
            sourceName: data.sourceName || channel,
        }));
    };

    const handleReset = () => {
        setUrl(''); setPastedText(''); setPasteMode(false); setError(''); setForm(null);
    };

    const handleSave = async () => {
        if (!form.title.trim()) {
            setError('제목은 필수입니다.');
            return;
        }
        if (form.deadline && form.deadline < todayKst()) {
            setError('마감일이 이미 지났습니다. 마감일을 확인해 주세요.');
            return;
        }
        if (!form.sourceUrl.trim()) {
            // 링크가 없으면 링크 중복 검사가 불가능하므로 같은 제목 공고만 경고
            const similar = await findCastingsByTitle(form.title);
            if (similar.length > 0 && !window.confirm('같은 제목의 공고가 이미 등록되어 있습니다. 그래도 등록할까요?')) return;
        }
        setSaving(true);
        setError('');
        const { error: err } = await createExternalCasting(toPayload(form));
        setSaving(false);
        if (err) {
            setError(err.message || '등록에 실패했습니다.');
            return;
        }
        handleReset();
        onCreated();
    };

    return (
        <div className="mb-6 border border-[var(--moca-border)] rounded-2xl p-4 bg-[var(--moca-surface-2)]">
            <p className="text-sm font-black text-[var(--moca-text)] mb-0.5">외부 공고 가져오기</p>
            <p className="text-[11px] text-[var(--moca-text-3)] font-bold mb-3">필름메이커스는 링크만 넣어도 되고, 카페·밴드처럼 링크로 읽을 수 없는 글은 본문을 붙여넣으면 AI가 요약해 아래 양식을 채웁니다. 확인·수정 후 등록하세요.</p>

            {!form && (
                <>
                    <div className="flex gap-2">
                        <input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder={pasteMode ? '원문 링크 (선택)' : 'https://www.filmmakers.co.kr/performerCasting/...'}
                            className={inputCls}
                        />
                        <button
                            onClick={handleImport}
                            disabled={loading || !canImport}
                            className="shrink-0 px-4 py-1.5 rounded-lg bg-[var(--moca-primary)] text-white text-xs font-black disabled:opacity-40"
                        >
                            {loading ? '정리 중...' : '불러오기'}
                        </button>
                    </div>
                    <label className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-[var(--moca-text-3)] cursor-pointer">
                        <input type="checkbox" checked={pasteMode} onChange={(e) => setPasteMode(e.target.checked)} />
                        본문을 직접 붙여넣어 등록 (링크가 없거나 읽을 수 없는 카페·밴드 글)
                    </label>
                    {pasteMode && (
                        <>
                            <select value={channel} onChange={(e) => setChannel(e.target.value)} className={`${inputCls} mt-2`}>
                                {SOURCE_CHANNELS.map((c) => <option key={c} value={c}>출처: {c}</option>)}
                            </select>
                            <textarea
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                rows={8}
                                placeholder="공고 본문을 복사해 붙여넣은 뒤 '불러오기'를 누르세요."
                                className={`${inputCls} mt-2`}
                            />
                        </>
                    )}
                </>
            )}

            {error && <p className="text-xs font-bold text-red-600 mt-2">{error}</p>}

            {form && (
                <div className="space-y-3 mt-1">
                    <CastingFormFields form={form} setForm={setForm} />

                    <div className="flex gap-2 justify-end">
                        <button onClick={handleReset} className="px-4 py-2 rounded-lg border border-[var(--moca-border)] text-xs font-black text-[var(--moca-text-3)]">취소</button>
                        <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-[var(--moca-primary)] text-white text-xs font-black disabled:opacity-40">{saving ? '등록 중...' : '모카캐스팅에 등록'}</button>
                    </div>
                </div>
            )}
        </div>
    );
};

const STATUS_LABEL = {
    open: { label: '모집중', className: 'bg-emerald-100 text-emerald-700' },
    closed: { label: '마감', className: 'bg-gray-100 text-gray-500' },
    cancelled: { label: '취소됨', className: 'bg-red-100 text-red-600' },
};

// 마감일 없는 모집중 공고는 자동 마감되지 않으므로, 등록 경과일을 보여 주고 일정 기간이 지나면 정리 대상으로 표시
const STALE_DAYS = 30;
const getNoDeadlineAge = (casting) => {
    if (casting.deadline || getCastingStatus(casting) !== 'open') return null;
    const createdKst = new Date(new Date(casting.created_at).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    const days = Math.max(0, Math.round((Date.parse(todayKst()) - Date.parse(createdKst)) / 86400000));
    return { days, stale: days >= STALE_DAYS };
};

// 클릭률(%) = 원문 클릭 인원 ÷ 조회 인원. 조회가 없으면 null
const getClickRate = (stats) => {
    if (!stats || !stats.viewUsers) return null;
    return Math.round((stats.clickUsers / stats.viewUsers) * 1000) / 10;
};
const formatClickRate = (stats) => {
    const rate = getClickRate(stats);
    return rate === null ? '-' : `${rate}%`;
};

// 사용자가 눌러볼 외부 이동 버튼(원문 링크 / 이메일 지원)이 있는 외부 공고인지
const hasOutlet = (c) => c.source_type === 'external' && !!(c.source_url || c.apply_email);

const getApplicantCount = (casting) => casting.model_casting_applications?.[0]?.count ?? 0;

const CastingDetailModal = ({ casting, stats, onClose, onChanged }) => {
    const [busy, setBusy] = useState(false);
    const [clicks, setClicks] = useState(null);
    useEffect(() => {
        fetchCastingClicks(casting.id).then(setClicks);
    }, [casting.id]);
    const [editing, setEditing] = useState(false);
    if (!casting) return null;
    const effectiveStatus = getCastingStatus(casting);
    const status = STATUS_LABEL[effectiveStatus] || STATUS_LABEL.open;
    const isExternal = casting.source_type === 'external';

    const handleCloseCasting = async () => {
        if (!window.confirm('이 공고를 마감 처리할까요? 앱에서 "마감"으로 표시됩니다.')) return;
        setBusy(true);
        const { error } = await closeCasting(casting.id);
        setBusy(false);
        if (error) { alert('마감 처리에 실패했습니다: ' + error.message); return; }
        onChanged();
    };
    const handleDelete = async () => {
        if (!window.confirm('이 공고를 완전히 삭제할까요? 역할·지원 내역도 함께 삭제되며 되돌릴 수 없습니다.')) return;
        setBusy(true);
        const { error } = await deleteCasting(casting.id);
        setBusy(false);
        if (error) { alert('삭제에 실패했습니다: ' + error.message); return; }
        onChanged();
    };

    return (
        <div className="fixed inset-0 bg-[#0c0714]/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn" onClick={onClose}>
            <div
                className="bg-white border border-[var(--moca-border)] w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-[var(--moca-border)] flex items-start justify-between gap-3 bg-[var(--moca-surface-2)]">
                    <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
                        {isExternal
                            ? <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-700">외부 공고</span>
                            : <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--moca-primary)]/10 text-[var(--moca-primary)]">지원자 {getApplicantCount(casting)}명</span>}
                        <h3 className="text-lg font-black text-[var(--moca-text)] mt-2">{casting.title}</h3>
                        <p className="text-[12px] text-[var(--moca-text-3)] font-bold mt-0.5">{casting.companies?.company_name || casting.producer_name || '-'} · {casting.category}</p>
                    </div>
                    <button onClick={onClose} className="text-[var(--moca-text-3)] hover:text-[var(--moca-text)] text-xl leading-none">✕</button>
                </div>

                <div className="px-6 py-5 overflow-y-auto space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                        <div><p className="text-[11px] text-[var(--moca-text-3)] font-bold">프로젝트명</p><p className="font-bold text-[var(--moca-text)]">{casting.project_name || '-'}</p></div>
                        <div><p className="text-[11px] text-[var(--moca-text-3)] font-bold">계약형태</p><p className="font-bold text-[var(--moca-text)]">{casting.contract_type || '-'}</p></div>
                        <div><p className="text-[11px] text-[var(--moca-text-3)] font-bold">촬영기간</p><p className="font-bold text-[var(--moca-text)]">{casting.shoot_period || '-'}</p></div>
                        <div><p className="text-[11px] text-[var(--moca-text-3)] font-bold">촬영장소</p><p className="font-bold text-[var(--moca-text)]">{casting.shoot_location || '-'}</p></div>
                        <div><p className="text-[11px] text-[var(--moca-text-3)] font-bold">마감일</p><p className="font-bold text-[var(--moca-text)]">{casting.deadline || '없음'}{getDdayInfo(casting) ? ` (${getDdayInfo(casting).label})` : ''}{getNoDeadlineAge(casting) ? ` · 등록 ${getNoDeadlineAge(casting).days}일째${getNoDeadlineAge(casting).stale ? ' (정리 필요)' : ''}` : ''}</p></div>
                        <div><p className="text-[11px] text-[var(--moca-text-3)] font-bold">등록일</p><p className="font-bold text-[var(--moca-text)]">{new Date(casting.created_at).toLocaleDateString('ko-KR')}</p></div>
                    </div>

                    <div>
                        <p className="text-[11px] text-[var(--moca-text-3)] font-bold mb-1">상세 설명</p>
                        <p className="whitespace-pre-wrap text-[var(--moca-text)] bg-[var(--moca-surface-2)] rounded-xl p-3 leading-relaxed">{casting.description || '작성된 설명이 없습니다.'}</p>
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center">
                        {[
                            ['조회', stats?.views ?? 0],
                            ['조회 인원', stats?.viewUsers ?? 0],
                            ['외부이동 클릭', hasOutlet(casting) ? (stats?.clicks ?? 0) : '-'],
                            ['클릭 인원', stats?.clickUsers ?? 0],
                            ['클릭률', hasOutlet(casting) ? formatClickRate(stats) : '-'],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)] py-2">
                                <p className="text-[10px] text-[var(--moca-text-3)] font-bold">{label}</p>
                                <p className="text-lg font-black text-[var(--moca-primary)]">{value}</p>
                            </div>
                        ))}
                    </div>

                    {clicks && clicks.length > 0 && (
                        <div>
                            <p className="text-[11px] text-[var(--moca-text-3)] font-bold mb-1">원문 링크·이메일 지원 버튼을 누른 사람 ({clicks.length}건)</p>
                            <div className="max-h-40 overflow-y-auto border border-[var(--moca-border)] rounded-xl divide-y divide-[var(--moca-border)]">
                                {clicks.map((c, i) => (
                                    <div key={i} className="px-3 py-1.5 flex items-center justify-between text-[12px]">
                                        <span className="font-bold text-[var(--moca-text)]">{c.user_nickname || c.user_name || '(알 수 없음)'}{c.user_grade ? <span className="ml-1 text-[10px] text-[var(--moca-text-3)]">{c.user_grade}</span> : null}</span>
                                        <span className="text-[10px] text-[var(--moca-text-3)]">{new Date(c.clicked_at).toLocaleString('ko-KR')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isExternal && (
                        <>
                            {casting.apply_guide && (
                                <div>
                                    <p className="text-[11px] text-[var(--moca-text-3)] font-bold mb-1">지원 방법 안내 (앱 노출)</p>
                                    <p className="whitespace-pre-wrap text-[var(--moca-text)] bg-[var(--moca-surface-2)] rounded-xl p-3 leading-relaxed">{casting.apply_guide}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-[11px] text-[var(--moca-text-3)] font-bold mb-1">출처 {casting.source_name ? `· ${casting.source_name}` : '· 미지정'}</p>
                                {casting.source_url
                                    ? <a href={casting.source_url} target="_blank" rel="noreferrer noopener" className="text-[var(--moca-primary)] font-bold underline break-all">{casting.source_url}</a>
                                    : <p className="text-[12px] font-bold text-[var(--moca-text-3)]">원문 링크 없음 (앱에 원문 버튼 숨김)</p>}
                                {casting.apply_email && <p className="text-[12px] font-bold text-[var(--moca-text)] mt-1 break-all">지원 이메일: {casting.apply_email}</p>}
                            </div>
                        </>
                    )}

                    {casting.attachment_url && (
                        <div>
                            <p className="text-[11px] text-[var(--moca-text-3)] font-bold mb-1">첨부파일</p>
                            <a href={casting.attachment_url} target="_blank" rel="noreferrer" className="text-[var(--moca-primary)] font-bold underline break-all">{casting.attachment_url}</a>
                        </div>
                    )}

                    {(casting.model_casting_roles || []).length > 0 && (
                        <div>
                            <p className="text-[11px] text-[var(--moca-text-3)] font-bold mb-2">모집 역할 ({casting.model_casting_roles.length})</p>
                            <div className="space-y-2">
                                {casting.model_casting_roles.map((r) => (
                                    <div key={r.id} className="border border-[var(--moca-border)] rounded-xl p-3">
                                        <div className="flex items-center justify-between">
                                            <p className="font-black text-[var(--moca-text)]">{r.role_name || '역할 미지정'}</p>
                                            <p className="text-[11px] text-[var(--moca-text-3)] font-bold">{r.headcount || 1}명</p>
                                        </div>
                                        <p className="text-[12px] text-[var(--moca-text-3)] mt-1">
                                            {r.gender === 'male' ? '남성' : r.gender === 'female' ? '여성' : '성별무관'}
                                            {(r.age_min || r.age_max) && ` · ${r.age_min || ''}~${r.age_max || ''}세`}
                                            {r.pay && ` · ${r.pay}`}
                                            {r.schedule && ` · ${r.schedule}`}
                                        </p>
                                        {r.description && <p className="text-[12px] text-[var(--moca-text)] mt-1.5 whitespace-pre-wrap">{r.description}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-3 border-t border-[var(--moca-border)] flex justify-between gap-2 bg-[var(--moca-surface-2)]">
                    <div className="flex gap-2">
                        <button onClick={handleDelete} disabled={busy} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-xs font-black disabled:opacity-40">삭제</button>
                        {isExternal && <button onClick={() => setEditing(true)} disabled={busy} className="px-4 py-2 rounded-lg border border-[var(--moca-border)] text-[var(--moca-text)] text-xs font-black disabled:opacity-40">수정</button>}
                    </div>
                    {effectiveStatus === 'open' && (
                        <button onClick={handleCloseCasting} disabled={busy} className="px-4 py-2 rounded-lg bg-[var(--moca-primary)] text-white text-xs font-black disabled:opacity-40">마감 처리</button>
                    )}
                </div>
            </div>
            {editing && <CastingEditModal casting={casting} onClose={() => setEditing(false)} onSaved={onChanged} />}
        </div>
    );
};

const AdminModelCastings = () => {
    const [castings, setCastings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCasting, setSelectedCasting] = useState(null);
    const [stats, setStats] = useState({});

    const load = async () => {
        setLoading(true);
        const [{ data }, eventStats] = await Promise.all([fetchCastings({}), fetchCastingEventStats()]);
        setCastings(data);
        setStats(eventStats);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    return (
        <div className="animate-fadeIn">
            <ExternalImportPanel onCreated={load} />
            <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-black text-[var(--moca-text)]">전체 모카캐스팅 게시글 <span className="text-[var(--moca-primary)]">{castings.length}</span>건</p>
                <button onClick={load} className="text-xs font-bold text-[var(--moca-text-3)] hover:text-[var(--moca-primary)]">새로고침</button>
            </div>

            {loading ? (
                <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">불러오는 중...</p>
            ) : castings.length === 0 ? (
                <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">등록된 게시글이 없습니다.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[11px] text-[var(--moca-text-3)] font-bold border-b border-[var(--moca-border)]">
                                <th className="py-2 pr-3">상태</th>
                                <th className="py-2 pr-3">업체</th>
                                <th className="py-2 pr-3">카테고리</th>
                                <th className="py-2 pr-3">제목</th>
                                <th className="py-2 pr-3">모집인원</th>
                                <th className="py-2 pr-3">지원자</th>
                                <th className="py-2 pr-3">조회</th>
                                <th className="py-2 pr-3" title="원문 링크 또는 이메일 지원 버튼을 누른 횟수">외부이동 클릭</th>
                                <th className="py-2 pr-3">클릭률</th>
                                <th className="py-2 pr-3">마감일</th>
                                <th className="py-2 pr-3">등록일</th>
                            </tr>
                        </thead>
                        <tbody>
                            {castings.map((c) => {
                                const status = STATUS_LABEL[getCastingStatus(c)] || STATUS_LABEL.open;
                                const totalHeadcount = (c.model_casting_roles || []).reduce((sum, r) => sum + (r.headcount || 0), 0);
                                return (
                                    <tr
                                        key={c.id}
                                        onClick={() => setSelectedCasting(c)}
                                        className="border-b border-[var(--moca-border)] last:border-0 cursor-pointer hover:bg-[var(--moca-surface-2)] transition-colors"
                                    >
                                        <td className="py-2.5 pr-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
                                        </td>
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-text)]">{c.companies?.company_name || c.producer_name || '-'}{c.source_type === 'external' && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-700">외부</span>}</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)]">{c.category}</td>
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-primary)] max-w-[240px] truncate underline decoration-dotted underline-offset-2">{c.title}</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)]">{totalHeadcount}명</td>
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-primary)]">{c.source_type === 'external' ? <span className="text-[var(--moca-text-3)]">-</span> : `${getApplicantCount(c)}명`}</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)]">{stats[c.id]?.views ?? 0}</td>
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-text)]">{hasOutlet(c) ? `${stats[c.id]?.clicks ?? 0}` : <span className="text-[var(--moca-text-3)]">-</span>}</td>
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-primary)]">{hasOutlet(c) ? formatClickRate(stats[c.id]) : <span className="text-[var(--moca-text-3)]">-</span>}</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)] whitespace-nowrap">{c.deadline || '-'}{getDdayInfo(c) && <span className="ml-1 font-black text-[var(--moca-primary)]">{getDdayInfo(c).label}</span>}{getNoDeadlineAge(c) && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${getNoDeadlineAge(c).stale ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>{getNoDeadlineAge(c).stale ? `정리 필요 · ${getNoDeadlineAge(c).days}일째` : `등록 ${getNoDeadlineAge(c).days}일째`}</span>}</td>
                                        <td className="py-2.5 pr-3 text-[10px] text-[var(--moca-text-3)]">{new Date(c.created_at).toLocaleDateString('ko-KR')}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedCasting && (
                <CastingDetailModal
                    casting={selectedCasting}
                    stats={stats[selectedCasting.id]}
                    onClose={() => setSelectedCasting(null)}
                    onChanged={() => { setSelectedCasting(null); load(); }}
                />
            )}
        </div>
    );
};

export default AdminModelCastings;
