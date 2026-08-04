import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCastings } from '../services/modelCastingService';

const STATUS_LABEL = {
    open: { label: '모집중', className: 'bg-[#EDE9FE] text-[#7C3AED]' },
    closed: { label: '마감', className: 'bg-[#F3F4F6] text-[#6B7280]' },
    cancelled: { label: '취소됨', className: 'bg-[#FEE2E2] text-[#DC2626]' },
};

const ModelCastingBoard = () => {
    const navigate = useNavigate();
    const [castings, setCastings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCastings({}).then(({ data }) => {
            setCastings(data);
            setLoading(false);
        });
    }, []);

    return (
        <div className="min-h-screen bg-white pb-24">
            <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center gap-3 bg-white/90 backdrop-blur-md border-b border-[#F3F0FA]">
                <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <h1 className="text-lg font-black text-[#1F1235]">모델캐스팅</h1>
            </div>

            <div className="pt-20 px-5 max-w-2xl mx-auto">
                {loading ? (
                    <div className="py-24 text-center text-[#9CA3AF] font-bold text-sm">불러오는 중...</div>
                ) : castings.length === 0 ? (
                    <div className="py-24 text-center">
                        <span className="material-symbols-outlined text-5xl text-[#E8E0FA] block mb-3">campaign</span>
                        <p className="text-[#9CA3AF] font-bold text-sm">등록된 구인 공고가 없습니다.</p>
                        <p className="text-[#C4B5FD] font-bold text-xs mt-1">업체의 새 공고가 등록되면 여기에서 볼 수 있어요.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {castings.map((c) => {
                            const status = STATUS_LABEL[c.status] || STATUS_LABEL.open;
                            const totalHeadcount = (c.model_casting_roles || []).reduce((sum, r) => sum + (r.headcount || 0), 0);
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => navigate(`/home/castings/${c.id}`)}
                                    className="w-full text-left rounded-2xl border border-[#E8E0FA] bg-white p-4 shadow-2xs hover:border-[#D8B4FE] active:scale-[0.99] transition-all"
                                >
                                    <div className="flex items-center gap-1.5 mb-1.5">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
                                        <span className="px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-[10px] font-bold">{c.category}</span>
                                    </div>
                                    <h3 className="font-black text-[#1F1235] text-[15px] leading-snug">{c.title}</h3>
                                    <p className="text-[11px] text-[#9CA3AF] font-bold mt-1.5">
                                        {c.companies?.company_name || '업체'} · 모집 {totalHeadcount}명 · 마감 {c.deadline}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModelCastingBoard;
