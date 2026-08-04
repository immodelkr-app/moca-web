import React, { useEffect, useState } from 'react';
import { fetchCastings } from '../services/modelCastingService';

const STATUS_LABEL = {
    open: { label: '모집중', className: 'bg-emerald-100 text-emerald-700' },
    closed: { label: '마감', className: 'bg-gray-100 text-gray-500' },
    cancelled: { label: '취소됨', className: 'bg-red-100 text-red-600' },
};

const AdminModelCastings = () => {
    const [castings, setCastings] = useState([]);
    const [loading, setLoading] = useState(true);

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
                                    <tr key={c.id} className="border-b border-[var(--moca-border)] last:border-0">
                                        <td className="py-2.5 pr-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
                                        </td>
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-text)]">{c.companies?.company_name || '-'}</td>
                                        <td className="py-2.5 pr-3 text-[var(--moca-text-3)]">{c.category}</td>
                                        <td className="py-2.5 pr-3 font-bold text-[var(--moca-text)] max-w-[240px] truncate">{c.title}</td>
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
        </div>
    );
};

export default AdminModelCastings;
