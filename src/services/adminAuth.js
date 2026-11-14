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
