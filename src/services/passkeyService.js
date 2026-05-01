import { supabase, isSupabaseEnabled } from './supabaseClient';
import { saveUser } from './userService';

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
        
        console.log('[Passkey] Logged in successfully via Supabase Auth:', data);
        
        // Supabase Auth 유저 정보를 바탕으로 'users' 테이블의 추가 정보를 가져옵니다.
        // 이 앱은 'users' 테이블에 별도 정보를 관리하므로 동기화가 필요합니다.
        const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('*')
            .eq('email', data.user.email)
            .maybeSingle();

        if (dbError) {
            console.error('[Passkey] DB Profile fetch error:', dbError);
        }

        const finalUser = dbUser || {
            nickname: data.user.email?.split('@')[0] || 'moca_user',
            name: data.user.user_metadata?.full_name || '모카 회원',
            ...data.user
        };
        
        saveUser(finalUser);
        
        return { success: true, user: finalUser };
    } catch (err) {
        console.error('[Passkey] Login failed:', err);
        throw err;
    }
};

