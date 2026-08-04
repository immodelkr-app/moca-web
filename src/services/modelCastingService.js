/**
 * modelCastingService.js
 * 모델캐스팅(업체 구인 게시판) - 게시글/역할/지원 CRUD
 */
import { supabase } from './supabaseClient';

export const MONTHLY_POSTING_LIMIT = 3;

// ── 스팸 방지: 이번 달 게시글 수 ──────────────────────────────

/**
 * 업체가 이번 달에 등록한 게시글 수를 반환
 * @param {string} companyId
 * @returns {Promise<number>}
 */
export const getMonthlyPostingCount = async (companyId) => {
    if (!supabase) return 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count, error } = await supabase
        .from('model_castings')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', monthStart);

    if (error) return 0;
    return count || 0;
};

// ── 게시글 등록 ────────────────────────────────────────────

/**
 * 모델캐스팅 게시글 + 역할 카드 등록 (월 3개 제한 체크 포함)
 * @param {Object} params
 * @param {string} params.companyId
 * @param {string} params.category
 * @param {string} params.title
 * @param {string} [params.projectName]
 * @param {string} [params.shootPeriod]
 * @param {string} [params.shootLocation]
 * @param {string} [params.description]
 * @param {string} [params.attachmentUrl]
 * @param {string} [params.contractType]
 * @param {string} params.deadline - 'YYYY-MM-DD'
 * @param {Array<{roleName?, gender, ageMin?, ageMax?, headcount?, pay?, schedule?, description?}>} params.roles
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createCasting = async ({
    companyId,
    category,
    title,
    projectName,
    shootPeriod,
    shootLocation,
    description,
    attachmentUrl,
    contractType,
    deadline,
    roles = [],
}) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };

    const monthlyCount = await getMonthlyPostingCount(companyId);
    if (monthlyCount >= MONTHLY_POSTING_LIMIT) {
        return {
            data: null,
            error: new Error(`구인 공고는 한 달에 ${MONTHLY_POSTING_LIMIT}개까지만 등록할 수 있습니다.`),
        };
    }

    const { data: casting, error: castingError } = await supabase
        .from('model_castings')
        .insert([{
            company_id: companyId,
            category,
            title,
            project_name: projectName || null,
            shoot_period: shootPeriod || null,
            shoot_location: shootLocation || null,
            description: description || null,
            attachment_url: attachmentUrl || null,
            contract_type: contractType || null,
            deadline,
            status: 'open',
        }])
        .select()
        .single();

    if (castingError) return { data: null, error: castingError };

    if (roles.length > 0) {
        const roleRows = roles.map((r) => ({
            casting_id: casting.id,
            role_name: r.roleName || null,
            gender: r.gender || 'any',
            age_min: r.ageMin ?? null,
            age_max: r.ageMax ?? null,
            headcount: r.headcount ?? 1,
            pay: r.pay || null,
            schedule: r.schedule || null,
            description: r.description || null,
        }));

        const { error: roleError } = await supabase.from('model_casting_roles').insert(roleRows);
        if (roleError) return { data: casting, error: roleError };
    }

    return { data: casting, error: null };
};

/**
 * 모델캐스팅 게시글 + 역할 카드 수정 (역할은 전체 삭제 후 재삽입)
 * @param {string} castingId
 * @param {Object} params - createCasting()과 동일한 필드 (companyId 제외)
 */
export const updateCasting = async (castingId, {
    category,
    title,
    projectName,
    shootPeriod,
    shootLocation,
    description,
    attachmentUrl,
    contractType,
    deadline,
    roles = [],
}) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };

    const updatePayload = {
        category,
        title,
        project_name: projectName || null,
        shoot_period: shootPeriod || null,
        shoot_location: shootLocation || null,
        description: description || null,
        contract_type: contractType || null,
        deadline,
        updated_at: new Date().toISOString(),
    };
    if (attachmentUrl) updatePayload.attachment_url = attachmentUrl;

    const { data: casting, error: castingError } = await supabase
        .from('model_castings')
        .update(updatePayload)
        .eq('id', castingId)
        .select()
        .single();

    if (castingError) return { data: null, error: castingError };

    const { error: deleteError } = await supabase
        .from('model_casting_roles')
        .delete()
        .eq('casting_id', castingId);
    if (deleteError) return { data: casting, error: deleteError };

    if (roles.length > 0) {
        const roleRows = roles.map((r) => ({
            casting_id: castingId,
            role_name: r.roleName || null,
            gender: r.gender || 'any',
            age_min: r.ageMin ?? null,
            age_max: r.ageMax ?? null,
            headcount: r.headcount ?? 1,
            pay: r.pay || null,
            schedule: r.schedule || null,
            description: r.description || null,
        }));
        const { error: roleError } = await supabase.from('model_casting_roles').insert(roleRows);
        if (roleError) return { data: casting, error: roleError };
    }

    return { data: casting, error: null };
};

// ── 목록/상세 조회 ────────────────────────────────────────

/**
 * 모델캐스팅 목록 조회 (역할 카드 포함)
 * @param {Object} [filters]
 * @param {string} [filters.category]
 * @param {boolean} [filters.excludeClosed]
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const fetchCastings = async ({ category, excludeClosed } = {}) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };

    let query = supabase
        .from('model_castings')
        .select('*, companies(company_name), model_casting_roles(*), model_casting_applications(count)')
        .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (excludeClosed) query = query.eq('status', 'open');

    const { data, error } = await query;
    return { data: data || [], error };
};

/**
 * 게시글 상세 조회
 * @param {string} castingId
 */
export const fetchCastingDetail = async (castingId) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('model_castings')
        .select('*, companies(company_name, contact_name, verification_status, users(email)), model_casting_roles(*), model_casting_applications(count)')
        .eq('id', castingId)
        .single();
    return { data, error };
};

/**
 * 업체 본인이 올린 게시글 목록 (관리용)
 * @param {string} companyId
 */
export const fetchCompanyCastings = async (companyId) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('model_castings')
        .select('*, model_casting_roles(*), model_casting_applications(count)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
    return { data: data || [], error };
};

/**
 * 게시글 마감 처리
 * @param {string} castingId
 */
export const closeCasting = async (castingId) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase
        .from('model_castings')
        .update({ status: 'closed' })
        .eq('id', castingId);
    return { error };
};

// ── 지원(바로지원) ────────────────────────────────────────

/**
 * 모델이 특정 역할에 지원
 * @param {Object} params
 * @param {string} params.roleId
 * @param {string} params.castingId
 * @param {string} params.modelUserId
 */
export const applyToCasting = async ({ roleId, castingId, modelUserId }) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('model_casting_applications')
        .insert([{ role_id: roleId, casting_id: castingId, model_user_id: modelUserId }])
        .select()
        .single();
    return { data, error };
};

/**
 * 지원 등록 + 업체 이메일 알림 발송 (알림은 best-effort, 실패해도 지원 자체는 성공 처리)
 * @param {Object} params
 * @param {string} params.roleId
 * @param {string} params.castingId
 * @param {string} params.modelUserId
 * @param {Object} params.modelData - getUser() 반환값 (프로필 정보)
 * @param {string} params.castingTitle
 * @param {string} [params.roleName]
 * @param {string} params.companyName
 * @param {string} [params.companyEmail]
 * @returns {Promise<{data: Object|null, error: Error|null, emailSent: boolean}>}
 */
export const applyToCastingWithNotification = async ({
    roleId,
    castingId,
    modelUserId,
    modelData,
    castingTitle,
    roleName,
    companyName,
    companyEmail,
}) => {
    const { data, error } = await applyToCasting({ roleId, castingId, modelUserId });
    if (error) return { data: null, error, emailSent: false };

    let emailSent = false;
    try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-casting-application-email', {
            body: {
                modelName: modelData.name || modelData.nickname,
                modelPhone: modelData.phone || '',
                modelHeight: modelData.height || '',
                modelWeight: modelData.weight || '',
                modelAge: modelData.age || '',
                modelShoeSize: modelData.shoe_size || '',
                portfolioLink: modelData.portfolio_link,
                careerAd: modelData.career_ad || '',
                careerOther: modelData.career_other || '',
                castingTitle,
                roleName: roleName || '',
                companyName,
                companyEmail: companyEmail || '',
            },
        });
        if (!emailError && emailResult?.success) emailSent = true;
        else console.warn('[applyToCastingWithNotification] 이메일 발송 실패:', emailError || emailResult?.error);
    } catch (err) {
        console.warn('[applyToCastingWithNotification] 이메일 발송 예외:', err);
    }

    return { data, error: null, emailSent };
};

/**
 * 모델 본인의 지원 내역
 * @param {string} modelUserId
 */
export const fetchMyApplications = async (modelUserId) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('model_casting_applications')
        .select('*, model_castings(title, category, deadline, companies(company_name))')
        .eq('model_user_id', modelUserId)
        .order('applied_at', { ascending: false });
    return { data: data || [], error };
};

/**
 * 업체가 자기 게시글에 들어온 지원자 목록 조회
 * @param {string} castingId
 */
export const fetchApplicationsForCasting = async (castingId) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('model_casting_applications')
        .select('*, users(name, nickname, phone, height, weight, portfolio_link)')
        .eq('casting_id', castingId)
        .order('applied_at', { ascending: false });
    return { data: data || [], error };
};

/**
 * 지원 상태 변경 (업체가 서류검토/합격/불합격 처리)
 * @param {string} applicationId
 * @param {'reviewing'|'accepted'|'rejected'} status
 */
export const updateApplicationStatus = async (applicationId, status) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase
        .from('model_casting_applications')
        .update({ status })
        .eq('id', applicationId);
    return { error };
};
