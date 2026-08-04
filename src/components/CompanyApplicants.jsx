import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCastingDetail, fetchApplicationsForCasting, updateApplicationStatus } from '../services/modelCastingService';

const STATUS_OPTIONS = [
    { value: 'applied', label: '지원함', className: 'bg-[#EDE9FE] text-[#7C3AED]' },
    { value: 'reviewing', label: '서류검토', className: 'bg-[#FEF3C7] text-[#92400E]' },
    { value: 'accepted', label: '합격', className: 'bg-[#DCFCE7] text-[#166534]' },
    { value: 'rejected', label: '불합격', className: 'bg-[#F3F4F6] text-[#6B7280]' },
];

const CompanyApplicants = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [casting, setCasting] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const [{ data: castingData }, { data: appData }] = await Promise.all([
            fetchCastingDetail(id),
            fetchApplicationsForCasting(id),
        ]);
        setCasting(castingData);
        setApplications(appData);
        setLoading(false);
    };

    useEffect(() => { load(); }, [id]);

    const handleStatusChange = async (applicationId, status) => {
        setApplications((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status } : a)));
        const { error } = await updateApplicationStatus(applicationId, status);
        if (error) {
            alert('상태 변경에 실패했습니다: ' + error.message);
            load();
        }
    };

    if (loading) {
        return <div className="py-20 text-center text-[#9CA3AF] font-bold text-sm">불러오는 중...</div>;
    }

    return (
        <div className="space-y-5">
            <button onClick={() => navigate('/company/castings')} className="text-[11px] font-bold text-[#9CA3AF] hover:text-[#7C3AED]">
                ← 목록으로
            </button>

            <div>
                <h1 className="text-xl font-black text-[#1F1235]">{casting?.title}</h1>
                <p className="text-[11px] text-[#9CA3AF] font-bold mt-1">지원자 {applications.length}명</p>
            </div>

            {applications.length === 0 ? (
                <div className="py-16 text-center text-[#9CA3AF] font-bold text-sm border border-dashed border-[#E8E0FA] rounded-2xl">
                    아직 지원자가 없습니다.
                </div>
            ) : (
                <div className="space-y-3">
                    {applications.map((app) => {
                        const model = app.users || {};
                        const statusInfo = STATUS_OPTIONS.find((s) => s.value === app.status) || STATUS_OPTIONS[0];
                        return (
                            <div key={app.id} className="rounded-2xl border border-[#E8E0FA] bg-white p-4 shadow-2xs">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black mb-1.5 ${statusInfo.className}`}>
                                            {statusInfo.label}
                                        </span>
                                        <h3 className="font-black text-[#1F1235] text-sm">{model.name || model.nickname}</h3>
                                        <p className="text-[11px] text-[#9CA3AF] font-bold mt-0.5">
                                            {model.phone && `${model.phone} · `}
                                            {model.height && `${model.height}cm `}
                                            {model.weight && `${model.weight}kg`}
                                        </p>
                                        {model.portfolio_link && (
                                            <a href={model.portfolio_link} target="_blank" rel="noreferrer"
                                                className="text-[11px] font-bold text-[#7C3AED] underline mt-1 inline-block">
                                                포트폴리오 보기
                                            </a>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-[#9CA3AF] font-bold whitespace-nowrap">
                                        {new Date(app.applied_at).toLocaleDateString('ko-KR')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-3">
                                    {STATUS_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleStatusChange(app.id, opt.value)}
                                            disabled={app.status === opt.value}
                                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                                app.status === opt.value
                                                    ? `${opt.className} cursor-default`
                                                    : 'bg-[#F8F5FF] text-[#9CA3AF] hover:bg-[#F3E8FF]'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CompanyApplicants;
