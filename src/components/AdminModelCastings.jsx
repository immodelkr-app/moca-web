import React, { useEffect, useState } from 'react';
import { fetchCastings, importExternalCasting, createExternalCasting } from '../services/modelCastingService';

const CATEGORIES = [
    'TV광고', '뮤직비디오', '화보촬영', 'TV프로그램',
    'SNS/온라인예능', 'SNS/온라인광고', '홈쇼핑/라이브커머스', '교육/기업/홍보영상', '기타',
];
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

// 외부 공고 링크 → AI 정리 → 검수/수정 → 등록
const ExternalImportPanel = ({ onCreated }) => {
    const [url, setUrl] = useState('');
    const [pastedText, setPastedText] = useState('');
    const [needText, setNeedText] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [source, setSource] = useState(null); // { sourceUrl, sourceName }
    const [form, setForm] = useState(null);

    const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
    const setRole = (idx, key, value) => setForm((f) => ({
        ...f,
        roles: f.roles.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    }));

    const handleImport = async () => {
        if (!url.trim()) return;
        setLoading(true);
        setError('');
        const { data, error: err, needText: nt } = await importExternalCasting({ url: url.trim(), text: needText ? pastedText : undefined });
        setLoading(false);
        if (err) {
            setError(err);
            setNeedText(nt);
            return;
        }
        setNeedText(false);
        setSource({ sourceUrl: data.sourceUrl, sourceName: data.sourceName });
        setForm(toFormState(data.casting));
    };

    const handleReset = () => {
        setUrl(''); setPastedText(''); setNeedText(false); setError(''); setSource(null); setForm(null);
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.deadline) {
            setError('제목과 마감일은 필수입니다.');
            return;
        }
        setSaving(true);
        setError('');
        const { error: err } = await createExternalCasting({
            sourceUrl: source.sourceUrl,
            sourceName: source.sourceName,
            ...form,
            title: form.title.trim(),
            roles: form.roles.map((r) => ({
                ...r,
                ageMin: r.ageMin === '' ? null : Number(r.ageMin),
                ageMax: r.ageMax === '' ? null : Number(r.ageMax),
                headcount: r.headcount === '' ? 1 : Number(r.headcount),
            })),
        });
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
            <p className="text-[11px] text-[var(--moca-text-3)] font-bold mb-3">필름메이커스 공고 링크를 넣으면 AI가 요약해 아래 양식을 채웁니다. 확인·수정 후 등록하세요.</p>

            {!form && (
                <>
                    <div className="flex gap-2">
                        <input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.filmmakers.co.kr/performerCasting/..."
                            className={inputCls}
                        />
                        <button
                            onClick={handleImport}
                            disabled={loading || !url.trim() || (needText && !pastedText.trim())}
                            className="shrink-0 px-4 py-1.5 rounded-lg bg-[var(--moca-primary)] text-white text-xs font-black disabled:opacity-40"
                        >
                            {loading ? '정리 중...' : '불러오기'}
                        </button>
                    </div>
                    {needText && (
                        <textarea
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            rows={6}
                            placeholder="공고 페이지 본문을 복사해 붙여넣은 뒤 '불러오기'를 다시 누르세요."
                            className={`${inputCls} mt-2`}
                        />
                    )}
                </>
            )}

            {error && <p className="text-xs font-bold text-red-600 mt-2">{error}</p>}

            {form && (
                <div className="space-y-3 mt-1">
                    <p className="text-[11px] font-bold text-[var(--moca-text-3)] break-all">출처: {source.sourceName} · {source.sourceUrl}</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><label className={labelCls}>제목</label><input className={inputCls} value={form.title} onChange={(e) => setField('title', e.target.value)} /></div>
                        <div><label className={labelCls}>카테고리</label>
                            <select className={inputCls} value={form.category} onChange={(e) => setField('category', e.target.value)}>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div><label className={labelCls}>마감일</label><input type="date" className={inputCls} value={form.deadline} onChange={(e) => setField('deadline', e.target.value)} /></div>
                        <div><label className={labelCls}>프로젝트명</label><input className={inputCls} value={form.projectName} onChange={(e) => setField('projectName', e.target.value)} /></div>
                        <div><label className={labelCls}>제작사</label><input className={inputCls} value={form.producerName} onChange={(e) => setField('producerName', e.target.value)} /></div>
                        <div><label className={labelCls}>촬영기간</label><input className={inputCls} value={form.shootPeriod} onChange={(e) => setField('shootPeriod', e.target.value)} /></div>
                        <div><label className={labelCls}>촬영장소</label><input className={inputCls} value={form.shootLocation} onChange={(e) => setField('shootLocation', e.target.value)} /></div>
                        <div className="col-span-2"><label className={labelCls}>계약형태</label><input className={inputCls} value={form.contractType} onChange={(e) => setField('contractType', e.target.value)} /></div>
                        <div className="col-span-2"><label className={labelCls}>상세 설명</label><textarea rows={6} className={inputCls} value={form.description} onChange={(e) => setField('description', e.target.value)} /></div>
                        <div className="col-span-2"><label className={labelCls}>지원 방법 안내 (앱에는 지원 버튼 대신 이 문구가 노출됩니다)</label><textarea rows={4} className={inputCls} value={form.applyGuide} onChange={(e) => setField('applyGuide', e.target.value)} /></div>
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

const getApplicantCount = (casting) => casting.model_casting_applications?.[0]?.count ?? 0;

const CastingDetailModal = ({ casting, onClose }) => {
    if (!casting) return null;
    const status = STATUS_LABEL[casting.status] || STATUS_LABEL.open;

    return (
        <div className="fixed inset-0 bg-[#0c0714]/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn" onClick={onClose}>
            <div
                className="bg-white border border-[var(--moca-border)] w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-5 border-b border-[var(--moca-border)] flex items-start justify-between gap-3 bg-[var(--moca-surface-2)]">
                    <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
                        <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--moca-primary)]/10 text-[var(--moca-primary)]">지원자 {getApplicantCount(casting)}명</span>
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
                        <div><p className="text-[11px] text-[var(--moca-text-3)] font-bold">마감일</p><p className="font-bold text-[var(--moca-text)]">{casting.deadline || '-'}</p></div>
                        <div><p className="text-[11px] text-[var(--moca-text-3)] font-bold">등록일</p><p className="font-bold text-[var(--moca-text)]">{new Date(casting.created_at).toLocaleDateString('ko-KR')}</p></div>
                    </div>

                    <div>
                        <p className="text-[11px] text-[var(--moca-text-3)] font-bold mb-1">상세 설명</p>
                        <p className="whitespace-pre-wrap text-[var(--moca-text)] bg-[var(--moca-surface-2)] rounded-xl p-3 leading-relaxed">{casting.description || '작성된 설명이 없습니다.'}</p>
                    </div>

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
            </div>
        </div>
    );
};

const AdminModelCastings = () => {
    const [castings, setCastings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCasting, setSelectedCasting] = useState(null);

    const load = async () => {
        setLoading(true);
        const { data } = await fetchCastings({});
        setCastings(data);
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
                                <th className="py-2 pr-3">마감일</th>
                                <th className="py-2 pr-3">등록일</th>
                            </tr>
                        </thead>
                        <tbody>
                            {castings.map((c) => {
                                const status = STATUS_LABEL[c.status] || STATUS_LABEL.open;
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
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-primary)]">{getApplicantCount(c)}명</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)]">{c.deadline}</td>
                                        <td className="py-2.5 pr-3 text-[10px] text-[var(--moca-text-3)]">{new Date(c.created_at).toLocaleDateString('ko-KR')}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedCasting && (
                <CastingDetailModal casting={selectedCasting} onClose={() => setSelectedCasting(null)} />
            )}
        </div>
    );
};

export default AdminModelCastings;
