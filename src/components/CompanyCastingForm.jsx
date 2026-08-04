import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getUser } from '../services/userService';
import { getCompanyByUserId, uploadCastingAttachment } from '../services/companyService';
import { createCasting, updateCasting, fetchCastingDetail } from '../services/modelCastingService';
import { checkVerificationStatus } from '../services/emailVerificationService';

const CATEGORIES = [
    'TV광고', '뮤직비디오', '화보촬영', 'TV프로그램',
    'SNS/온라인예능', 'SNS/온라인광고', '홈쇼핑/라이브커머스', '교육/기업/홍보영상', '기타',
];

const GENDER_OPTIONS = [
    { value: 'any', label: '무관' },
    { value: 'female', label: '여자' },
    { value: 'male', label: '남자' },
];

const emptyRole = () => ({
    roleName: '', gender: 'any', ageMin: '', ageMax: '', headcount: 1, pay: '', schedule: '', description: '',
});

const CompanyCastingForm = () => {
    const navigate = useNavigate();
    const { id: castingId } = useParams();
    const isEditMode = !!castingId;
    const user = getUser();
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initLoading, setInitLoading] = useState(isEditMode);
    const [error, setError] = useState('');
    const [existingAttachmentUrl, setExistingAttachmentUrl] = useState(null);
    const [emailVerified, setEmailVerified] = useState(null);

    const [form, setForm] = useState({
        category: CATEGORIES[0],
        title: '',
        projectName: '',
        shootPeriod: '',
        shootLocation: '',
        description: '',
        contractType: '',
        deadline: '',
        attachmentFile: null,
    });
    const [roles, setRoles] = useState([emptyRole()]);

    useEffect(() => {
        getCompanyByUserId(user.id).then(({ data }) => setCompany(data));
        if (user?.email) {
            checkVerificationStatus(user.email).then(({ verified }) => setEmailVerified(!!verified));
        } else {
            setEmailVerified(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!isEditMode) return;
        fetchCastingDetail(castingId).then(({ data }) => {
            if (!data) { setInitLoading(false); return; }
            setForm({
                category: data.category,
                title: data.title,
                projectName: data.project_name || '',
                shootPeriod: data.shoot_period || '',
                shootLocation: data.shoot_location || '',
                description: data.description || '',
                contractType: data.contract_type || '',
                deadline: data.deadline,
                attachmentFile: null,
            });
            setExistingAttachmentUrl(data.attachment_url || null);
            const loadedRoles = (data.model_casting_roles || []).map((r) => ({
                roleName: r.role_name || '',
                gender: r.gender || 'any',
                ageMin: r.age_min ?? '',
                ageMax: r.age_max ?? '',
                headcount: r.headcount ?? 1,
                pay: r.pay || '',
                schedule: r.schedule || '',
                description: r.description || '',
            }));
            setRoles(loadedRoles.length > 0 ? loadedRoles : [emptyRole()]);
            setInitLoading(false);
        });
    }, [isEditMode, castingId]);

    const updateRole = (idx, key, value) => {
        setRoles((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
    };

    const addRole = () => setRoles((prev) => [...prev, emptyRole()]);
    const removeRole = (idx) => setRoles((prev) => prev.filter((_, i) => i !== idx));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!company) return;

        if (!form.title || !form.deadline) {
            setError('제목과 모집 마감일은 필수입니다.');
            return;
        }
        if (roles.some((r) => !r.pay)) {
            setError('각 역할별 출연료를 입력해 주세요.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            let attachmentUrl = existingAttachmentUrl;
            if (form.attachmentFile) {
                const { url, error: uploadErr } = await uploadCastingAttachment(form.attachmentFile, company.id);
                if (uploadErr) throw uploadErr;
                attachmentUrl = url;
            }

            const payload = {
                category: form.category,
                title: form.title,
                projectName: form.projectName,
                shootPeriod: form.shootPeriod,
                shootLocation: form.shootLocation,
                description: form.description,
                attachmentUrl,
                contractType: form.contractType,
                deadline: form.deadline,
                roles: roles.map((r) => ({
                    roleName: r.roleName,
                    gender: r.gender,
                    ageMin: r.ageMin ? Number(r.ageMin) : null,
                    ageMax: r.ageMax ? Number(r.ageMax) : null,
                    headcount: Number(r.headcount) || 1,
                    pay: r.pay,
                    schedule: r.schedule,
                    description: r.description,
                })),
            };

            const { error: saveErr } = isEditMode
                ? await updateCasting(castingId, payload)
                : await createCasting({ companyId: company.id, ...payload });
            if (saveErr) throw saveErr;

            navigate('/company/castings');
        } catch (err) {
            setError(err.message || '게시글 저장에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (initLoading) {
        return <div className="py-20 text-center text-[#9CA3AF] font-bold text-sm">불러오는 중...</div>;
    }

    if (!isEditMode && company && company.verification_status !== 'verified') {
        return (
            <div className="py-16 text-center space-y-3">
                <p className="text-sm font-black text-[#1F1235]">사업자 인증 완료 후 게시글을 등록할 수 있어요.</p>
                <p className="text-xs text-[#9CA3AF] font-bold">인증은 영업일 기준 1~2일 소요됩니다.</p>
                <button onClick={() => navigate('/company/castings')} className="mt-2 px-4 py-2 rounded-xl bg-[#F3E8FF] text-[#7C3AED] font-black text-xs">
                    목록으로
                </button>
            </div>
        );
    }

    if (!isEditMode && emailVerified === false) {
        return (
            <div className="py-16 text-center space-y-3">
                <p className="text-sm font-black text-[#1F1235]">이메일 인증 완료 후 게시글을 등록할 수 있어요.</p>
                <p className="text-xs text-[#9CA3AF] font-bold">지원자 프로필을 이메일로 받으려면 먼저 이메일 인증이 필요합니다.</p>
                <button onClick={() => navigate('/company/castings')} className="mt-2 px-4 py-2 rounded-xl bg-[#F3E8FF] text-[#7C3AED] font-black text-xs">
                    목록에서 인증하기
                </button>
            </div>
        );
    }

    const inputClass = 'w-full px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold text-sm focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner';
    const labelClass = 'text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider';

    return (
        <div className="space-y-6 pb-10">
            <h1 className="text-xl font-black text-[#1F1235]">{isEditMode ? '모델캐스팅 수정' : '새 모델캐스팅 등록'}</h1>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <label className={labelClass}>카테고리</label>
                    <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className={inputClass}
                    >
                        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                <div className="space-y-1.5">
                    <label className={labelClass}>제목</label>
                    <input type="text" required placeholder="예) 헤어케어 제품 광고 20대 여성 모델 모집"
                        value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} />
                </div>

                <div className="space-y-1.5">
                    <label className={labelClass}>프로젝트명</label>
                    <input type="text" placeholder="프로젝트/작품명 (선택)"
                        value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} className={inputClass} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className={labelClass}>촬영기간</label>
                        <input type="text" placeholder="예) 8월 3~4주차"
                            value={form.shootPeriod} onChange={(e) => setForm({ ...form, shootPeriod: e.target.value })} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>촬영지역</label>
                        <input type="text" placeholder="예) 서울"
                            value={form.shootLocation} onChange={(e) => setForm({ ...form, shootLocation: e.target.value })} className={inputClass} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className={labelClass}>상세 설명</label>
                    <textarea rows={5} placeholder="촬영 내용, 업로드 경로, 지원요건 등을 자유롭게 작성해 주세요."
                        value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className={`${inputClass} resize-none`} />
                </div>

                <div className="space-y-1.5">
                    <label className={labelClass}>소개자료 첨부 (PPT 등)</label>
                    <input type="file" accept=".ppt,.pptx,.pdf,image/*"
                        onChange={(e) => setForm({ ...form, attachmentFile: e.target.files?.[0] || null })}
                        className="w-full px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#F3E8FF] file:text-[#9333EA] file:font-bold focus:outline-none" />
                    {isEditMode && existingAttachmentUrl && !form.attachmentFile && (
                        <a href={existingAttachmentUrl} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#7C3AED] underline ml-1">
                            현재 첨부파일 보기 (새 파일을 올리면 교체됩니다)
                        </a>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className={labelClass}>계약 형태</label>
                        <input type="text" placeholder="예) 표준계약서 작성"
                            value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })} className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={labelClass}>모집 마감일</label>
                        <input type="date" required
                            value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputClass} />
                    </div>
                </div>

                {/* ── 모집 역할 ── */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className={labelClass}>모집 역할</label>
                        <button type="button" onClick={addRole} className="text-[11px] font-black text-[#7C3AED]">+ 역할 추가</button>
                    </div>

                    {roles.map((role, idx) => (
                        <div key={idx} className="rounded-2xl border border-[#E8E0FA] bg-[#F8F5FF] p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-[#9333EA]">역할 {idx + 1}</span>
                                {roles.length > 1 && (
                                    <button type="button" onClick={() => removeRole(idx)} className="text-[11px] font-bold text-[#9CA3AF] hover:text-[#DC2626]">삭제</button>
                                )}
                            </div>
                            <input type="text" placeholder="역할명 (예: 20대 초중반 여성)"
                                value={role.roleName} onChange={(e) => updateRole(idx, 'roleName', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E8E0FA] font-bold text-xs focus:outline-none focus:border-[#9333EA]" />
                            <div className="grid grid-cols-3 gap-2">
                                <select value={role.gender} onChange={(e) => updateRole(idx, 'gender', e.target.value)}
                                    className="px-2 py-2.5 rounded-xl bg-white border border-[#E8E0FA] font-bold text-xs focus:outline-none">
                                    {GENDER_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                                </select>
                                <input type="number" placeholder="나이(~)" value={role.ageMin} onChange={(e) => updateRole(idx, 'ageMin', e.target.value)}
                                    className="px-2 py-2.5 rounded-xl bg-white border border-[#E8E0FA] font-bold text-xs focus:outline-none" />
                                <input type="number" placeholder="~나이" value={role.ageMax} onChange={(e) => updateRole(idx, 'ageMax', e.target.value)}
                                    className="px-2 py-2.5 rounded-xl bg-white border border-[#E8E0FA] font-bold text-xs focus:outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" min="1" placeholder="모집 인원" value={role.headcount} onChange={(e) => updateRole(idx, 'headcount', e.target.value)}
                                    className="px-3 py-2.5 rounded-xl bg-white border border-[#E8E0FA] font-bold text-xs focus:outline-none" />
                                <input type="text" placeholder="출연료 (예: 건당 최저 20만원)" value={role.pay} onChange={(e) => updateRole(idx, 'pay', e.target.value)}
                                    className="px-3 py-2.5 rounded-xl bg-white border border-[#E8E0FA] font-bold text-xs focus:outline-none" />
                            </div>
                            <input type="text" placeholder="촬영 일정" value={role.schedule} onChange={(e) => updateRole(idx, 'schedule', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E8E0FA] font-bold text-xs focus:outline-none" />
                            <textarea rows={2} placeholder="역할 설명 (선택)" value={role.description} onChange={(e) => updateRole(idx, 'description', e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#E8E0FA] font-bold text-xs focus:outline-none resize-none" />
                        </div>
                    ))}
                </div>

                {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-2xl bg-[#9333EA] text-white font-black text-base shadow-moca hover:opacity-90 disabled:opacity-50 transition-all">
                    {loading ? '저장 중...' : (isEditMode ? '수정 완료' : '게시글 등록')}
                </button>
            </form>
        </div>
    );
};

export default CompanyCastingForm;
