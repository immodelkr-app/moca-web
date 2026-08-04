import React, { useEffect, useState } from 'react';
import { fetchCastings } from '../services/modelCastingService';

const STATUS_LABEL = {
    open: { label: '모집중', className: 'bg-emerald-100 text-emerald-700' },
    closed: { label: '마감', className: 'bg-gray-100 text-gray-500' },
    cancelled: { label: '취소됨', className: 'bg-red-100 text-red-600' },
};

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
                        <h3 className="text-lg font-black text-[var(--moca-text)] mt-2">{casting.title}</h3>
                        <p className="text-[12px] text-[var(--moca-text-3)] font-bold mt-0.5">{casting.companies?.company_name || '-'} · {casting.category}</p>
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
            <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-black text-[var(--moca-text)]">전체 모델캐스팅 게시글 <span className="text-[var(--moca-primary)]">{castings.length}</span>건</p>
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
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-text)]">{c.companies?.company_name || '-'}</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)]">{c.category}</td>
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-primary)] max-w-[240px] truncate underline decoration-dotted underline-offset-2">{c.title}</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)]">{totalHeadcount}명</td>
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
