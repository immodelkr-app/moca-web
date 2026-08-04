import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';
import { getCompanyByUserId } from '../services/companyService';
import { fetchCompanyCastings, closeCasting, MONTHLY_POSTING_LIMIT, getMonthlyPostingCount } from '../services/modelCastingService';
import { checkVerificationStatus } from '../services/emailVerificationService';
import CompanyEmailVerifyModal from './CompanyEmailVerifyModal';

const STATUS_LABEL = {
    open: { label: '모집중', className: 'bg-[#EDE9FE] text-[#7C3AED]' },
    closed: { label: '마감', className: 'bg-[#F3F4F6] text-[#6B7280]' },
    cancelled: { label: '취소됨', className: 'bg-[#FEE2E2] text-[#DC2626]' },
};

const VERIFICATION_BANNER = {
    pending: {
        className: 'bg-[#FEF3C7] border-[#FDE68A] text-[#92400E]',
        text: '사업자 인증 심사중입니다. 인증 완료 후 게시글을 등록할 수 있어요. (영업일 기준 1~2일 소요)',
    },
    rejected: {
        className: 'bg-[#FEE2E2] border-[#FECACA] text-[#991B1B]',
        text: '사업자 인증이 반려되었습니다. 고객센터로 문의해 주세요.',
    },
};

const CompanyCastingList = () => {
    const navigate = useNavigate();
    const user = getUser();
    const [company, setCompany] = useState(null);
    const [castings, setCastings] = useState([]);
    const [monthlyCount, setMonthlyCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [emailVerified, setEmailVerified] = useState(null); // null=확인중, true/false
    const [showVerifyModal, setShowVerifyModal] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { data: companyData } = await getCompanyByUserId(user.id);
            setCompany(companyData);

            if (companyData) {
                const [{ data: castingData }, count] = await Promise.all([
                    fetchCompanyCastings(companyData.id),
                    getMonthlyPostingCount(companyData.id),
                ]);
                setCastings(castingData);
                setMonthlyCount(count);
            }
            setLoading(false);
        };
        load();

        if (user?.email) {
            checkVerificationStatus(user.email).then(({ verified }) => setEmailVerified(!!verified));
        } else {
            setEmailVerified(false);
        }
    }, [user?.id]);

    const handleClose = async (castingId) => {
        if (!window.confirm('이 게시글을 마감 처리할까요?')) return;
        const { error } = await closeCasting(castingId);
        if (error) {
            alert('마감 처리에 실패했습니다: ' + error.message);
            return;
        }
        setCastings((prev) => prev.map((c) => (c.id === castingId ? { ...c, status: 'closed' } : c)));
    };

    const isVerified = company?.verification_status === 'verified';

    if (loading) {
        return <div className="py-20 text-center text-[#9CA3AF] font-bold text-sm">불러오는 중...</div>;
    }

    return (
        <div className="space-y-5">
            {company && company.verification_status !== 'verified' && (
                <div className={`rounded-2xl border px-4 py-3 text-xs font-bold ${VERIFICATION_BANNER[company.verification_status]?.className}`}>
                    {VERIFICATION_BANNER[company.verification_status]?.text}
                </div>
            )}

            {emailVerified === false && (
                <div className="rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] px-4 py-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-bold text-[#5B21B6]">
                        {user?.email
                            ? '이메일 인증이 필요합니다. 지원자 프로필을 이메일로 받으려면 먼저 인증해 주세요.'
                            : '등록된 이메일이 없습니다. 지원자 알림을 받으려면 고객센터로 문의해 이메일을 등록해 주세요.'}
                    </p>
                    {user?.email && (
                        <button
                            onClick={() => setShowVerifyModal(true)}
                            className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-[#9333EA] text-white font-black text-[11px] hover:opacity-90 transition-all"
                        >
                            인증하기
                        </button>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-[#1F1235]">{company?.company_name || '내 모델캐스팅'}</h1>
                    <p className="text-[11px] text-[#9CA3AF] font-bold mt-0.5">
                        이번 달 등록 {monthlyCount}/{MONTHLY_POSTING_LIMIT}
                        {isVerified && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[#7C3AED]">
                                <span className="material-symbols-outlined text-[13px]">verified</span>
                                모카 인증업체
                            </span>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/company/castings/new')}
                    disabled={!isVerified || monthlyCount >= MONTHLY_POSTING_LIMIT || !emailVerified}
                    className="px-4 py-2.5 rounded-2xl bg-[#9333EA] text-white font-black text-sm shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    + 새 게시글
                </button>
            </div>

            {castings.length === 0 ? (
                <div className="py-16 text-center text-[#9CA3AF] font-bold text-sm border border-dashed border-[#E8E0FA] rounded-2xl">
                    아직 등록한 게시글이 없습니다.
                </div>
            ) : (
                <div className="space-y-3">
                    {castings.map((casting) => {
                        const status = STATUS_LABEL[casting.status] || STATUS_LABEL.open;
                        const totalHeadcount = (casting.model_casting_roles || []).reduce((sum, r) => sum + (r.headcount || 0), 0);
                        return (
                            <div key={casting.id} className="rounded-2xl border border-[#E8E0FA] bg-white p-4 shadow-2xs">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black mb-1.5 ${status.className}`}>
                                            {status.label}
                                        </span>
                                        <h3 className="font-black text-[#1F1235] text-sm truncate">{casting.title}</h3>
                                        <p className="text-[11px] text-[#9CA3AF] font-bold mt-1">
                                            {casting.category} · 모집 {totalHeadcount}명 · 마감 {casting.deadline}
                                        </p>
                                        <p className="text-[11px] text-[#7C3AED] font-black mt-1">
                                            지원자 {casting.model_casting_applications?.[0]?.count ?? 0}명
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <button
                                        onClick={() => navigate(`/company/castings/${casting.id}/applicants`)}
                                        className="flex-1 py-2 rounded-xl bg-[#F3E8FF] text-[#7C3AED] font-black text-xs hover:bg-[#E8D5FF] transition-colors"
                                    >
                                        지원자 확인
                                    </button>
                                    <button
                                        onClick={() => navigate(`/company/castings/${casting.id}/edit`)}
                                        className="px-3 py-2 rounded-xl border border-[#E8E0FA] text-[#9CA3AF] font-black text-xs hover:text-[#7C3AED] hover:border-[#D8B4FE] transition-colors"
                                    >
                                        수정
                                    </button>
                                    {casting.status === 'open' && (
                                        <button
                                            onClick={() => handleClose(casting.id)}
                                            className="px-3 py-2 rounded-xl border border-[#E8E0FA] text-[#9CA3AF] font-black text-xs hover:text-[#DC2626] hover:border-[#FECACA] transition-colors"
                                        >
                                            마감
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showVerifyModal && user?.email && (
                <CompanyEmailVerifyModal
                    email={user.email}
                    onClose={() => setShowVerifyModal(false)}
                    onVerified={() => {
                        setEmailVerified(true);
                        setShowVerifyModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default CompanyCastingList;
