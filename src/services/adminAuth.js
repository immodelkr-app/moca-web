import { supabase } from './supabaseClient';

// 관리자 로그인: 비밀번호는 서버(admin_login RPC)가 검증하고, 번들에는 어떤 비밀도 없다.
// 서버가 발급한 12시간짜리 토큰을 세션 스토리지에 두고, 관리자 RPC/함수의 p_admin_key·adminKey·x-admin-token 자리에 그대로 쓴다.
// 모카TV 라이브 컨트롤 등 별도 라우트와 로그인 상태를 공유한다.
export const ADMIN_AUTH_SESSION_KEY = 'moca_admin_auth';

export const getAdminToken = () => {
    try {
        const t = window.sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) || '';
        return t.length >= 32 ? t : ''; // 옛 방식의 '1' 플래그는 무효 처리
    } catch {
        return '';
    }
};

/** @returns {Promise<{ok: boolean, locked?: boolean}>} */
export const adminLogin = async (password) => {
    if (!supabase) return { ok: false };
    const { data, error } = await supabase.rpc('admin_login', { p_password: password });
    if (error || !data) return { ok: false, locked: /locked/.test(error?.message || '') };
    try { window.sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, data); } catch { /* 저장 실패 시에도 이번 화면에서는 인증 상태로 둠 */ }
    return { ok: true };
};

export const adminLogout = async () => {
    const token = getAdminToken();
    try { window.sessionStorage.removeItem(ADMIN_AUTH_SESSION_KEY); } catch { /* noop */ }
    if (token && supabase) await supabase.rpc('admin_logout', { p_token: token }).catch(() => {});
};

/** 관리자: 전체 회원(연락처 포함, password_hash 제외). users 직접 조회 대신 사용. */
export const adminListUsers = async () => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    const { data, error } = await supabase.rpc('admin_list_users', { p_admin_key: getAdminToken() });
    return { data: Array.isArray(data) ? data : [], error };
};

/** 관리자: user_id가 있는 행들의 users 객체에 phone/email을 채워 넣는다(수강신청·업체 목록 등 조인 결과용). */
export const attachUserPhones = async (rows) => {
    const list = rows || [];
    const ids = [...new Set(list.map((r) => r.user_id).filter(Boolean))];
    if (!supabase || ids.length === 0) return list;
    const { data } = await supabase.rpc('admin_user_contacts', { p_admin_key: getAdminToken(), p_ids: ids });
    const byId = new Map((data || []).map((c) => [c.r_id, c]));
    list.forEach((r) => {
        const c = byId.get(r.user_id);
        if (c) r.users = { ...(r.users || {}), phone: c.r_phone, email: c.r_email };
    });
    return list;
};
