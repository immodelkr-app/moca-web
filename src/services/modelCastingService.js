/**
 * modelCastingService.js
 * 모델캐스팅(업체 구인 게시판) - 게시글/역할/지원 CRUD
 */
import { supabase } from './supabaseClient';
import { notifyAdmin } from './solapiService';

export const MONTHLY_POSTING_LIMIT = 3;

// 한국 시간 기준 오늘 (YYYY-MM-DD)
export const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * 화면 표시용 실제 상태 — DB status는 'open'이어도 마감일(당일 포함)이 지났으면 'closed'로 취급
 * (마감일 지나면 DB status를 바꿔주는 자동 처리는 없으므로 표시/지원 가능 여부는 이 함수로 판단)
 */
export const getCastingStatus = (casting) => {
    if (casting.status === 'open' && casting.deadline && casting.deadline < todayKst()) return 'closed';
    return casting.status;
};

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

/**
 * 마감 디데이 정보 — 모집중이고 마감일이 있을 때만 반환 (마감/마감일 없음은 null)
 * @returns {{ days: number, label: string, tone: 'urgent'|'normal' } | null}
 */
export const getDdayInfo = (casting) => {
    if (!casting.deadline || getCastingStatus(casting) !== 'open') return null;
    const days = Math.round((Date.parse(casting.deadline) - Date.parse(todayKst())) / 86400000);
    if (days < 0) return null;
    return { days, label: days === 0 ? 'D-DAY' : `D-${days}`, tone: days <= 3 ? 'urgent' : 'normal' };
};

/** 'YYYY-MM-DD' → '10/31(토)까지' (마감일이 없으면 빈 문자열) */
export const formatDeadlineKo = (deadline) => {
    if (!deadline) return '';
    const d = new Date(`${deadline}T00:00:00Z`);
    const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${dow})까지`;
};

/**
 * 사용자 목록 정렬 — 마감 임박순
 * 1) 모집중 + 마감일 있음 (마감 빠른 순) → 2) 모집중 + 마감일 없음 (최신 등록순) → 3) 마감 (최신 등록순)
 */
export const sortCastingsByDeadline = (castings) => {
    const rank = (c) => (getCastingStatus(c) !== 'open' ? 2 : c.deadline ? 0 : 1);
    return [...castings].sort((a, b) => {
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        if (ra === 0 && a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
        return new Date(b.created_at) - new Date(a.created_at);
    });
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

    notifyAdmin(`[모카] 업체 모카캐스팅(구인) 등록: ${title}`);

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

// ── 외부 공고(링크 가져오기) ──────────────────────────────

// 원문 링크는 http(s)만, 지원 이메일은 형식 검증 (href/mailto에 그대로 쓰이므로 javascript: 등 차단)
const validateExternalContacts = ({ sourceUrl, applyEmail }) => {
    let url = null;
    if (sourceUrl && sourceUrl.trim()) {
        try {
            const parsed = new URL(sourceUrl.trim());
            if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('protocol');
            url = parsed.href;
        } catch {
            return { error: new Error('원문 링크 형식이 올바르지 않습니다. (http:// 또는 https:// 로 시작)') };
        }
    }
    let email = null;
    if (applyEmail && applyEmail.trim()) {
        email = applyEmail.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: new Error('지원 이메일 형식이 올바르지 않습니다.') };
    }
    return { url, email };
};

/**
 * 같은 제목의 공고가 이미 있는지 (링크가 없는 공고의 중복 등록 경고용)
 * @returns {Promise<Array<{id: string, title: string}>>}
 */
export const findCastingsByTitle = async (title) => {
    if (!supabase || !title) return [];
    const { data } = await supabase.from('model_castings').select('id, title').eq('title', title.trim()).limit(3);
    return data || [];
};

const toRoleRows = (castingId, roles) => roles.map((r) => ({
    casting_id: castingId,
    role_name: r.roleName || null,
    gender: r.gender || 'any',
    age_text: r.ageText || null,
    age_min: r.ageMin ?? null,
    age_max: r.ageMax ?? null,
    headcount: r.headcount ?? 1,
    pay: r.pay || null,
    schedule: r.schedule || null,
    description: r.description || null,
}));

/**
 * 외부 공고 수정 (어드민) — 게시글 필드 + 역할 카드 전체 교체
 * 역할은 새 행을 먼저 넣은 뒤 기존 행을 지워, 중간에 실패해도 역할이 통째로 사라지지 않게 한다.
 * @param {string} castingId
 * @param {Object} params - createExternalCasting()과 동일한 필드 + status('open'|'closed')
 */
export const updateExternalCasting = async (castingId, {
    producerName, category, title, projectName, shootPeriod, shootLocation,
    description, applyGuide, contractType, deadline, status, roles = [],
    sourceUrl, sourceName, applyEmail, applySubject,
}) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };

    const contacts = validateExternalContacts({ sourceUrl, applyEmail });
    if (contacts.error) return { data: null, error: contacts.error };

    const { data: casting, error: castingError } = await supabase
        .from('model_castings')
        .update({
            producer_name: producerName || null,
            source_url: contacts.url,
            source_name: sourceName || null,
            apply_email: contacts.email,
            apply_subject: applySubject || null,
            category,
            title,
            project_name: projectName || null,
            shoot_period: shootPeriod || null,
            shoot_location: shootLocation || null,
            description: description || null,
            apply_guide: applyGuide || null,
            contract_type: contractType || null,
            deadline: deadline || null,
            status: status || 'open',
            updated_at: new Date().toISOString(),
        })
        .eq('id', castingId)
        .eq('source_type', 'external')
        .select()
        .single();
    if (castingError) {
        if (castingError.code === '23505') return { data: null, error: new Error('이미 같은 원문 링크로 등록된 다른 공고가 있습니다.') };
        return { data: null, error: castingError };
    }

    const { data: oldRoles, error: oldError } = await supabase
        .from('model_casting_roles').select('id').eq('casting_id', castingId);
    if (oldError) return { data: casting, error: oldError };

    if (roles.length > 0) {
        const { error: insertError } = await supabase.from('model_casting_roles').insert(toRoleRows(castingId, roles));
        if (insertError) return { data: casting, error: insertError };
    }

    const oldIds = (oldRoles || []).map((r) => r.id);
    if (oldIds.length > 0) {
        const { error: deleteError } = await supabase.from('model_casting_roles').delete().in('id', oldIds);
        if (deleteError) return { data: casting, error: deleteError };
    }

    return { data: casting, error: null };
};


const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_PASSWORD || 'immodel2024';

/**
 * 외부 공고 링크를 서버(/api/import-casting)에서 읽어 등록용 JSON으로 변환
 * @param {Object} params
 * @param {string} params.url
 * @param {string} [params.text] - 서버가 페이지를 못 읽을 때 어드민이 붙여넣은 본문
 * @returns {Promise<{data: Object|null, error: string|null, needText: boolean}>}
 */
export const importExternalCasting = async ({ url, text }) => {
    let res;
    try {
        res = await fetch('/api/import-casting', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-admin-token': ADMIN_TOKEN },
            body: JSON.stringify({ url, text }),
        });
    } catch {
        return { data: null, error: '네트워크 오류로 공고를 가져오지 못했습니다.', needText: false };
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { data: null, error: body.error || '공고를 가져오지 못했습니다.', needText: !!body.needText };
    return { data: body, error: null, needText: false };
};

/**
 * 외부 공고를 모카캐스팅으로 등록 (업체 계정 없이, 어드민 검수 후 호출)
 * 원문 링크는 선택(카페·밴드 글처럼 링크가 없을 수 있음). 링크가 있고 이미 등록된 링크면 중복 등록하지 않는다.
 */
export const createExternalCasting = async ({
    sourceUrl,
    sourceName,
    producerName,
    category,
    title,
    projectName,
    shootPeriod,
    shootLocation,
    description,
    applyGuide,
    applyEmail,
    applySubject,
    contractType,
    deadline,
    roles = [],
}) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };

    const contacts = validateExternalContacts({ sourceUrl, applyEmail });
    if (contacts.error) return { data: null, error: contacts.error };

    if (contacts.url) {
        const { data: existing } = await supabase
            .from('model_castings')
            .select('id')
            .eq('source_url', contacts.url)
            .maybeSingle();
        if (existing) return { data: null, error: new Error('이미 등록된 공고 링크입니다.') };
    }

    const { data: casting, error: castingError } = await supabase
        .from('model_castings')
        .insert([{
            company_id: null,
            source_type: 'external',
            source_url: contacts.url,
            source_name: sourceName || null,
            producer_name: producerName || null,
            apply_email: contacts.email,
            apply_subject: applySubject || null,
            category,
            title,
            project_name: projectName || null,
            shoot_period: shootPeriod || null,
            shoot_location: shootLocation || null,
            description: description || null,
            apply_guide: applyGuide || null,
            contract_type: contractType || null,
            deadline: deadline || null,
            status: 'open',
        }])
        .select()
        .single();
    if (castingError) {
        if (castingError.code === '23505') return { data: null, error: new Error('이미 같은 원문 링크로 등록된 공고입니다.') };
        return { data: null, error: castingError };
    }

    if (roles.length > 0) {
        const { error: roleError } = await supabase.from('model_casting_roles').insert(toRoleRows(casting.id, roles));
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
        .select('*, companies(company_name, contact_name, contact_phone, company_phone, verification_status), model_casting_roles(*), model_casting_applications(count)')
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

/**
 * 게시글 삭제 (역할/지원 내역은 FK CASCADE로 함께 삭제) — 어드민 전용
 * @param {string} castingId
 */
export const deleteCasting = async (castingId) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.from('model_castings').delete().eq('id', castingId);
    return { error };
};

// ── 조회/원문 클릭 기록 ───────────────────────────────────

/**
 * 공고 상세 조회('view') / 원문 공고 바로가기 클릭('source_click') 기록 — best-effort, 실패해도 화면엔 영향 없음
 * 조회는 같은 브라우저 세션에서 공고당 1회만 기록 (새로고침으로 부풀려지는 것 방지)
 */
export const trackCastingEvent = async ({ castingId, userId, eventType }) => {
    if (!supabase || !castingId) return;
    try {
        if (eventType === 'view') {
            const key = `casting_view_${castingId}`;
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, '1');
        }
        await supabase.from('model_casting_events').insert([{
            casting_id: castingId,
            user_id: userId || null,
            event_type: eventType,
        }]);
    } catch (err) {
        console.warn('[trackCastingEvent] 기록 실패:', err);
    }
};

/**
 * 사용자 화면용 공고별 조회 인원 — { [castingId]: number } (서로 다른 조회자 수만 공개)
 */
export const fetchCastingViewCounts = async () => {
    if (!supabase) return {};
    const { data, error } = await supabase.rpc('casting_view_counts');
    if (error) {
        console.warn('[fetchCastingViewCounts] 오류:', error);
        return {};
    }
    return Object.fromEntries((data || []).map((r) => [r.casting_id, Number(r.view_users)]));
};

/**
 * 공고별 조회/클릭 집계 (어드민) — { [castingId]: { views, viewUsers, clicks, clickUsers, lastClickAt } }
 */
export const fetchCastingEventStats = async () => {
    if (!supabase) return {};
    const { data, error } = await supabase.rpc('casting_events_admin_stats', { p_admin_key: ADMIN_TOKEN });
    if (error) {
        console.warn('[fetchCastingEventStats] 오류:', error);
        return {};
    }
    return Object.fromEntries((data || []).map((r) => [r.casting_id, {
        views: Number(r.views),
        viewUsers: Number(r.view_users),
        clicks: Number(r.clicks),
        clickUsers: Number(r.click_users),
        lastClickAt: r.last_click_at,
    }]));
};

/**
 * 수동 푸시 알림을 보낸 시각 기록 (어드민 목록의 중복 발송 방지 표시용)
 * @param {string} castingId
 * @returns {Promise<string|null>} 기록된 시각(ISO), 실패 시 null
 */
export const markCastingPushed = async (castingId) => {
    if (!supabase) return null;
    const at = new Date().toISOString();
    const { error } = await supabase.from('model_castings').update({ last_push_at: at }).eq('id', castingId);
    return error ? null : at;
};

// ── 공유 ─────────────────────────────────────────────

/** 공고 공유 링크 — 카톡 미리보기용 OG 페이지(/s/casting/:id)로 연결되고 실제 사용자는 앱 상세로 이동 */
export const getCastingShareUrl = (castingId) => `https://immoca.kr/s/casting/${castingId}`;

/** 공유/복사용 문구 (제목 + 디데이) */
export const getCastingShareText = (casting) => {
    const dday = getDdayInfo(casting);
    return `📢 [모카캐스팅] ${casting.title}${dday ? ` (${dday.label})` : ''}`;
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
