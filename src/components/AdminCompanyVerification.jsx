import React, { useEffect, useState } from 'react';
import { fetchCompanies, approveCompany, rejectCompany } from '../services/adminService';

const STATUS_TABS = [
    { value: 'pending', label: '심사대기' },
    { value: 'verified', label: '인증완료' },
    { value: 'rejected', label: '반려' },
];

const AdminCompanyVerification = () => {
    const [statusFilter, setStatusFilter] = useState('pending');
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const { data } = await fetchCompanies(statusFilter);
        setCompanies(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, [statusFilter]);

    const handleApprove = async (companyId) => {
        if (!window.confirm("이 업체를 '모카 인증업체'로 승인할까요?")) return;
        const { error } = await approveCompany(companyId);
        if (error) { alert('승인 실패: ' + error.message); return; }
        load();
    };

    const handleReject = async (companyId) => {
        const reason = window.prompt('반려 사유를 입력해 주세요 (선택)') || '';
        const { error } = await rejectCompany(companyId, reason);
        if (error) { alert('반려 실패: ' + error.message); return; }
        load();
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center gap-2 mb-5">
                {STATUS_TABS.map((tab) => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusFilter(tab.value)}
                        className={`px-4 py-2 rounded-full text-xs font-black transition-all ${
                            statusFilter === tab.value
                                ? 'bg-[var(--moca-primary)] text-white'
                                : 'bg-[var(--moca-surface-2)] text-[var(--moca-text-3)] hover:bg-[var(--moca-primary-lt)]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">불러오는 중...</p>
            ) : companies.length === 0 ? (
                <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">해당 상태의 업체가 없습니다.</p>
            ) : (
                <div className="space-y-3">
                    {companies.map((c) => (
                        <div key={c.id} className="rounded-2xl border border-[var(--moca-border)] bg-[var(--moca-surface-2)] p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-black text-[var(--moca-text)] text-sm">{c.company_name}</h4>
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold">
                                            {c.verification_type === 'affiliation' ? '소속확인형' : '사업자형'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--moca-text-3)] font-bold">
                                        {c.business_number ? `사업자번호 ${c.business_number}` : '사업자번호 없음(프리랜서)'} · 담당자 {c.contact_name} ({c.contact_phone})
                                    </p>
                                    <p className="text-xs text-[var(--moca-text-3)] font-bold mt-0.5">
                                        {c.company_address} {c.company_address_detail}
                                    </p>
                                    <p className="text-[10px] text-[var(--moca-text-3)] mt-1">
                                        가입 계정: {c.users?.nickname} ({c.users?.email || '이메일 미입력'}) · {new Date(c.created_at).toLocaleDateString('ko-KR')}
                                    </p>
                                    <a href={c.business_cert_url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-[11px] font-bold text-[var(--moca-primary)] underline">
                                        인증서류 확인
                                    </a>
                                    {c.verification_status === 'rejected' && c.rejected_reason && (
                                        <p className="text-[11px] text-red-500 font-bold mt-1">반려 사유: {c.rejected_reason}</p>
                                    )}
                                </div>
                                {c.verification_status === 'pending' && (
                                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                                        <button onClick={() => handleApprove(c.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600 transition-colors">
                                            승인
                                        </button>
                                        <button onClick={() => handleReject(c.id)} className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-[11px] font-black hover:bg-gray-300 transition-colors">
                                            반려
                                        </button>
                                    </div>
                                )}
                                {c.verification_status === 'verified' && (
                                    <button onClick={() => handleReject(c.id)} className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-[11px] font-black hover:bg-gray-300 transition-colors flex-shrink-0">
                                        인증 취소
                                    </button>
                                )}
                                {c.verification_status === 'rejected' && (
                                    <button onClick={() => handleApprove(c.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-black hover:bg-emerald-600 transition-colors flex-shrink-0">
                                        재승인
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminCompanyVerification;
