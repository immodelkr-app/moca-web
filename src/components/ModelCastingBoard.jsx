import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CastingDdayBadge from './CastingDdayBadge';
import CastingConsentCard from './CastingConsentCard';
import { fetchCastings, fetchCastingViewCounts, formatDeadlineKo, getCastingStatus, sortCastingsByDeadline } from '../services/modelCastingService';

const STATUS_LABEL = {
    open: { label: '모집중', className: 'bg-[#EDE9FE] text-[#7C3AED]' },
    closed: { label: '마감', className: 'bg-[#F3F4F6] text-[#6B7280]' },
    cancelled: { label: '취소됨', className: 'bg-[#FEE2E2] text-[#DC2626]' },
};

const GENDER_LABEL = { male: '남성', female: '여성', any: '성별무관' };
const uniq = (arr) => [...new Set(arr.filter(Boolean))].join(', ');
const ageOf = (r) => r.age_text || ((r.age_min || r.age_max) ? `${r.age_min || ''}~${r.age_max || ''}세` : '');

const ModelCastingBoard = () => {
    const navigate = useNavigate();
    const [castings, setCastings] = useState([]);
    const [viewCounts, setViewCounts] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCastingViewCounts().then(setViewCounts);
        fetchCastings({}).then(({ data }) => {
            setCastings(sortCastingsByDeadline(data));
            setLoading(false);
        });
    }, []);

    return (
        <div className="min-h-screen bg-white pb-24">
            <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center gap-3 bg-white/90 backdrop-blur-md border-b border-[#F3F0FA]">
                <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <h1 className="text-lg font-black text-[#1F1235]">모카캐스팅</h1>
            </div>

            <div className="pt-20 px-5 max-w-2xl mx-auto">
                <CastingConsentCard />
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
                            const status = STATUS_LABEL[getCastingStatus(c)] || STATUS_LABEL.open;
                            const totalHeadcount = (c.model_casting_roles || []).reduce((sum, r) => sum + (r.headcount || 0), 0);
                            return (
                                <button
                                    key={c.id}
                                    onClick={() => navigate(`/home/castings/${c.id}`)}
                                    className="w-full text-left rounded-2xl border border-[#E8E0FA] bg-white p-4 shadow-2xs hover:border-[#D8B4FE] active:scale-[0.99] transition-all"
                                >
                                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                        <span className={`px-2 py-0.5 whitespace-nowrap rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
                                        <CastingDdayBadge casting={c} />
                                        <span className="px-2 py-0.5 whitespace-nowrap rounded-full bg-[#F3F4F6] text-[#6B7280] text-[10px] font-bold">{c.category}</span>
                                        {c.source_type === 'external' && <span className="px-2 py-0.5 whitespace-nowrap rounded-full bg-[#FEF3C7] text-[#B45309] text-[10px] font-black">외부 공고</span>}
                                    </div>
                                    <h3 className="font-black text-[#1F1235] text-[15px] leading-snug pb-3 border-b border-dashed border-[#E5E7EB]">{c.title}</h3>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mt-3">
                                        {[
                                            ['제작', c.companies?.company_name || c.producer_name || '업체'],
                                            ['역할', uniq((c.model_casting_roles || []).map((r) => r.role_name))],
                                            ['성별', uniq((c.model_casting_roles || []).map((r) => GENDER_LABEL[r.gender] || '성별무관'))],
                                            ['연령', uniq((c.model_casting_roles || []).map(ageOf))],
                                            ['출연료', uniq((c.model_casting_roles || []).map((r) => r.pay))],
                                            ['마감', c.deadline ? formatDeadlineKo(c.deadline) : '상시'],
                                        ].map(([label, value]) => (
                                            <div key={label} className="min-w-0">
                                                <p className="text-[11px] text-[#9CA3AF] font-bold">{label}</p>
                                                <p className="text-[13px] font-bold text-[#1F1235] line-clamp-2 break-keep">{value || '-'}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[11px] text-[#9CA3AF] font-bold mt-3">모집 {totalHeadcount}명 · 조회 {viewCounts[c.id] ?? 0}명</p>
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
