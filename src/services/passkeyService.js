import { supabase, isSupabaseEnabled } from './supabaseClient';

/**
 * 지능 인식(Passkey) 관련 서비스
 */

/**
 * 기기 지문 등록 가능 여부 확인
 */
export const isPasskeySupported = () => {
    return !!(window.PublicKeyCredential && 
              window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable && 
              window.PublicKeyCredential.isConditionalMediationAvailable);
};

/**
 * 기기 지문(Passkey) 등록 (Enroll)
 * 유저가 로그인된 상태에서 호출
 */
export const registerPasskey = async () => {
    if (!isSupabaseEnabled()) throw new Error('Supabase 비활성화');

    try {
        // Supabase Native Passkey Enrollment
        const { data, error } = await supabase.auth.addPasskey();
        
        if (error) {
            console.error('[Passkey] Registration Error:', error);
            throw error;
        }
        
        console.log('[Passkey] Registered successfully:', data);
        return { success: true, data };
    } catch (err) {
        console.error('[Passkey] Registration failed:', err);
        throw err;
    }
};

/**
 * 기기 지문(Passkey)으로 로그인 (Authenticate)
 */
export const loginWithPasskey = async () => {
    if (!isSupabaseEnabled()) throw new Error('Supabase 비활성화');

    try {
        const { data, error } = await supabase.auth.signInWithPasskey();
        
        if (error) {
            console.error('[Passkey] Login Error:', error);
            throw error;
        }
        
        console.log('[Passkey] Logged in successfully:', data);
        return { success: true, user: data.user };
    } catch (err) {
        console.error('[Passkey] Login failed:', err);
        throw err;
    }
};
