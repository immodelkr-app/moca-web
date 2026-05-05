import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from 'capacitor-native-biometric';
import { supabase, isSupabaseEnabled } from './supabaseClient';
import { saveUser } from './userService';

/**
 * 지문 인식(Biometric/Passkey) 관련 서비스
 */

/**
 * 기기 지문 등록 가능 여부 확인
 */
export const isPasskeySupported = async () => {
    if (Capacitor.isNativePlatform()) {
        try {
            const result = await NativeBiometric.isAvailable();
            return result.isAvailable;
        } catch (e) {
            console.error('[Biometric] Availability check failed:', e);
            return false;
        }
    }
    
    return !!(window.PublicKeyCredential && 
              window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable && 
              window.PublicKeyCredential.isConditionalMediationAvailable);
};

/**
 * 기기 지문 등록 (Enroll)
 * 웹에서는 Passkey, 앱에서는 Native Biometric Keychain 사용
 */
export const registerPasskey = async () => {
    if (!isSupabaseEnabled()) throw new Error('Supabase 비활성화');

    if (Capacitor.isNativePlatform()) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('로그인이 필요합니다.');

            // 네이티브 보안 저장소(Keychain/Keystore)에 세션 토큰 저장
            await NativeBiometric.setCredentials({
                username: session.user.email,
                password: session.refresh_token,
                server: "immoca.kr"
            });
            
            console.log('[Biometric] Native credentials stored successfully');
            return { success: true };
        } catch (err) {
            console.error('[Biometric] Native registration failed:', err);
            throw err;
        }
    }

    try {
        // 웹 브라우저 Passkey 등록
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
 * 기기 지문으로 로그인 (Authenticate)
 */
export const loginWithPasskey = async () => {
    if (!isSupabaseEnabled()) throw new Error('Supabase 비활성화');

    if (Capacitor.isNativePlatform()) {
        try {
            // 1. 네이티브 생체 인증 다이얼로그 호출
            await NativeBiometric.verifyIdentity({
                reason: "지문 인식을 통해 로그인합니다.",
                title: "생체 인식 로그인",
                subtitle: "본인 확인",
                description: "기기에 등록된 지문 또는 얼굴을 사용하세요.",
            });

            // 2. 인증 성공 시 보안 저장소에서 토큰 가져오기
            const credentials = await NativeBiometric.getCredentials({
                server: "immoca.kr"
            });

            // 3. 가져온 Refresh Token으로 세션 복구
            const { data, error } = await supabase.auth.setSession({
                access_token: '', // Access token은 비워두고 refresh_token만 전달
                refresh_token: credentials.password
            });

            if (error) throw error;

            console.log('[Biometric] Native login successful:', data);
            
            // 유저 정보 처리
            return processLoginResult(data);
        } catch (err) {
            console.error('[Biometric] Native login failed:', err);
            throw err;
        }
    }

    try {
        const { data, error } = await supabase.auth.signInWithPasskey();
        
        if (error) {
            console.error('[Passkey] Login Error:', error);
            throw error;
        }
        
        console.log('[Passkey] Logged in via Supabase Passkey:', data);
        return processLoginResult(data);
    } catch (err) {
        console.error('[Passkey] Login failed:', err);
        throw err;
    }
};

/**
 * 로그인 결과 공통 처리 로직
 */
async function processLoginResult(data) {
    const { data: dbUser, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('email', data.user.email)
        .maybeSingle();

    if (dbError) {
        console.error('[Auth] DB Profile fetch error:', dbError);
    }

    const finalUser = dbUser || {
        nickname: data.user.email?.split('@')[0] || 'moca_user',
        name: data.user.user_metadata?.full_name || '모카 회원',
        ...data.user
    };
    
    saveUser(finalUser);
    return { success: true, user: finalUser };
}

