import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCastingDetail, fetchMyApplications } from '../services/modelCastingService';
import { getUser } from '../services/userService';
import ModelCastingApplyModal from './ModelCastingApplyModal';

const STATUS_LABEL = {
    open: { label: '모집중', className: 'bg-[#EDE9FE] text-[#7C3AED]' },
    closed: { label: '마감', className: 'bg-[#F3F4F6] text-[#6B7280]' },
    cancelled: { label: '취소됨', className: 'bg-[#FEE2E2] text-[#DC2626]' },
};

const GENDER_LABEL = { male: '남성', female: '여성', any: '성별무관' };

const ModelCastingDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [casting, setCasting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [appliedRoleIds, setAppliedRoleIds] = useState([]);
    const [applyingRole, setApplyingRole] = useState(null);
    const currentUser = getUser();

    const load = async () => {
        setLoading(true);
        const { data } = await fetchCastingDetail(id);
        setCasting(data);

        if (currentUser?.id) {
            const { data: myApps } = await fetchMyApplications(currentUser.id);
            setAppliedRoleIds((myApps || []).filter((a) => a.casting_id === id).map((a) => a.role_id));
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, [id]);

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen bg-white text-[#9CA3AF] font-bold text-sm">불러오는 중...</div>;
    }
    if (!casting) {
        return <div className="text-center py-24 text-[#1F1235] font-black">공고를 찾을 수 없습니다.</div>;
    }

    const status = STATUS_LABEL[casting.status] || STATUS_LABEL.open;
    const companyEmail = casting.companies?.users?.email || '';

    return (
        <div className="min-h-screen bg-white pb-40">
            <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center gap-3 bg-white/90 backdrop-blur-md border-b border-[#F3F0FA]">
                <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#F3E8FF] text-[#7C3AED] flex items-center justify-center active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <h1 className="text-lg font-black text-[#1F1235] truncate">모델캐스팅 상세</h1>
            </div>

            <div className="pt-20 px-5 max-w-2xl mx-auto space-y-6">
                <div>
                    <div className="flex items-center gap-1.5 mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${status.className}`}>{status.label}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] text-[10px] font-bold">{casting.category}</span>
                    </div>
                    <h2 className="text-xl font-black text-[#1F1235] leading-snug">{casting.title}</h2>
                    <p className="text-[12px] text-[#9CA3AF] font-bold mt-1.5">{casting.companies?.company_name || '업체'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-[11px] text-[#9CA3AF] font-bold">프로젝트명</p><p className="font-bold text-[#1F1235]">{casting.project_name || '-'}</p></div>
                    <div><p className="text-[11px] text-[#9CA3AF] font-bold">계약형태</p><p className="font-bold text-[#1F1235]">{casting.contract_type || '-'}</p></div>
                    <div><p className="text-[11px] text-[#9CA3AF] font-bold">촬영기간</p><p className="font-bold text-[#1F1235]">{casting.shoot_period || '-'}</p></div>
                    <div><p className="text-[11px] text-[#9CA3AF] font-bold">촬영장소</p><p className="font-bold text-[#1F1235]">{casting.shoot_location || '-'}</p></div>
                    <div><p className="text-[11px] text-[#9CA3AF] font-bold">마감일</p><p className="font-bold text-[#1F1235]">{casting.deadline}</p></div>
                </div>

                <div>
                    <p className="text-[11px] text-[#9CA3AF] font-bold mb-1.5">상세 설명</p>
                    <p className="whitespace-pre-wrap text-[#1F1235] text-sm leading-relaxed bg-[#FAF8FF] rounded-2xl p-4">{casting.description || '작성된 설명이 없습니다.'}</p>
                </div>

                {casting.attachment_url && (
                    <a href={casting.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#7C3AED] font-bold text-sm underline">
                        <span className="material-symbols-outlined text-[16px]">attach_file</span>
                        첨부파일 보기
                    </a>
                )}

                <div>
                    <h3 className="text-[13px] font-black text-[#1F1235] mb-3">모집 역할</h3>
                    <div className="space-y-3">
                        {(casting.model_casting_roles || []).map((r) => {
                            const isApplied = appliedRoleIds.includes(r.id);
                            const canApply = casting.status === 'open' && !isApplied;
                            return (
                                <div key={r.id} className="border border-[#E8E0FA] rounded-2xl p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-black text-[#1F1235] text-sm">{r.role_name || '역할 미지정'}</p>
                                            <p className="text-[11px] text-[#9CA3AF] font-bold mt-1">
                                                {GENDER_LABEL[r.gender] || '성별무관'}
                                                {(r.age_min || r.age_max) && ` · ${r.age_min || ''}~${r.age_max || ''}세`}
                                                {` · ${r.headcount || 1}명`}
                                                {r.pay && ` · ${r.pay}`}
                                                {r.schedule && ` · ${r.schedule}`}
                                            </p>
                                            {r.description && <p className="text-[12px] text-[#4B3F6B] mt-2 whitespace-pre-wrap">{r.description}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => canApply && setApplyingRole(r)}
                                        disabled={!canApply}
                                        className={`w-full mt-3 py-2.5 rounded-xl font-black text-xs transition-all ${
                                            isApplied
                                                ? 'bg-[#EDE9FE] text-[#7C3AED] cursor-default'
                                                : canApply
                                                    ? 'bg-[#9333EA] text-white hover:opacity-90 active:scale-[0.98]'
                                                    : 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
                                        }`}
                                    >
                                        {isApplied ? '지원완료' : canApply ? '지원하기' : '지원마감'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {applyingRole && (
                <ModelCastingApplyModal
                    casting={casting}
                    role={applyingRole}
                    currentUser={currentUser}
                    companyEmail={companyEmail}
                    onClose={() => setApplyingRole(null)}
                    onSuccess={(roleId) => {
                        setAppliedRoleIds((prev) => [...prev, roleId]);
                        setApplyingRole(null);
                    }}
                />
            )}
        </div>
    );
};

export default ModelCastingDetailPage;
