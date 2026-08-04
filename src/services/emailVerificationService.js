/**
 * emailVerificationService.js
 * 업체 회원가입 시 이메일 인증(코드 발송/확인) - Supabase Edge Function (company-email-verification) 래퍼
 * 인증코드 생성/검증은 전부 서버(service role)에서만 처리되며, 클라이언트는 절대 코드를 직접 조회/조작할 수 없다.
 */
import { supabase, isSupabaseEnabled } from './supabaseClient';

const PURPOSE = 'company_signup';

/**
 * 인증번호 이메일 발송
 * @param {string} email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendVerificationCode = async (email) => {
    if (!isSupabaseEnabled()) return { success: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' };
    try {
        const { data, error } = await supabase.functions.invoke('company-email-verification', {
            body: { action: 'send', email, purpose: PURPOSE },
        });
        if (error) return { success: false, error: error.message || '인증번호 발송 중 오류가 발생했습니다.' };
        return data;
    } catch (err) {
        return { success: false, error: '네트워크 연결 상태를 확인해주세요.' };
    }
};

/**
 * 이미 인증된 이메일인지 조회 (코드 발송 없이 상태만 확인)
 * @param {string} email
 * @returns {Promise<{success: boolean, verified?: boolean, error?: string}>}
 */
export const checkVerificationStatus = async (email) => {
    if (!isSupabaseEnabled()) return { success: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' };
    try {
        const { data, error } = await supabase.functions.invoke('company-email-verification', {
            body: { action: 'status', email, purpose: PURPOSE },
        });
        if (error) return { success: false, error: error.message || '인증 상태 확인 중 오류가 발생했습니다.' };
        return data;
    } catch (err) {
        return { success: false, error: '네트워크 연결 상태를 확인해주세요.' };
    }
};

/**
 * 인증번호 확인
 * @param {string} email
 * @param {string} code
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const verifyCode = async (email, code) => {
    if (!isSupabaseEnabled()) return { success: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' };
    try {
        const { data, error } = await supabase.functions.invoke('company-email-verification', {
            body: { action: 'verify', email, code, purpose: PURPOSE },
        });
        if (error) return { success: false, error: error.message || '인증번호 확인 중 오류가 발생했습니다.' };
        return data;
    } catch (err) {
        return { success: false, error: '네트워크 연결 상태를 확인해주세요.' };
    }
};
