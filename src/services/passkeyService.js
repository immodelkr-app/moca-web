import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from 'capacitor-native-biometric';
import { supabase, isSupabaseEnabled } from './supabaseClient';
import { saveUser, getUser } from './userService';

/**
 * 지문 인식(Biometric/Passkey) 관련 서비스
 *
 * 주의: 이 앱은 Supabase Auth(auth.users)를 쓰지 않고, 자체 users 테이블에
 * nickname/password_hash로 로그인한다 (userService.loginUser 참고). 세션도
 * supabase.auth가 아니라 localStorage(getUser/saveUser)에 저장된다. 따라서
 * 지문 등록/로그인도 supabase.auth.getSession()/refreshSession()이 아니라
 * 로컬 세션의 nickname + password_hash를 기준으로 동작해야 한다.
 */

const BIOMETRIC_SERVER = 'immoca.kr';

/**
 * 기기 지문 등록 가능 여부 확인
 * 웹 브라우저용 Passkey는 미구현이므로 네이티브 앱에서만 지원
 */
export const isPasskeySupported = async () => {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        const result = await NativeBiometric.isAvailable();
        return result.isAvailable;
    } catch (e) {
        console.error('[Biometric] Availability check failed:', e);
        return false;
    }
};

/**
 * 기기 지문 등록 (Enroll)
 * 네이티브 앱에서만 지원 (Native Biometric Keychain 사용)
 */
export const registerPasskey = async () => {
    if (!isSupabaseEnabled()) throw new Error('Supabase 비활성화');
    if (!Capacitor.isNativePlatform()) throw new Error('지문 등록은 앱에서만 지원됩니다.');

    const user = getUser();
    if (!user?.nickname || !user?.password_hash) throw new Error('로그인이 필요합니다.');

    try {
        // 네이티브 보안 저장소(Keychain/Keystore)에 nickname + password_hash 저장
        await NativeBiometric.setCredentials({
            username: user.nickname,
            password: user.password_hash,
            server: BIOMETRIC_SERVER
        });

        console.log('[Biometric] Native credentials stored successfully');
        return { success: true };
    } catch (err) {
        console.error('[Biometric] Native registration failed:', err);
        throw err;
    }
};

/**
 * 기기 지문으로 로그인 (Authenticate)
 * 네이티브 앱에서만 지원
 */
export const loginWithPasskey = async () => {
    if (!isSupabaseEnabled()) throw new Error('Supabase 비활성화');
    if (!Capacitor.isNativePlatform()) throw new Error('지문 로그인은 앱에서만 지원됩니다.');

    try {
        // 1. 네이티브 생체 인증 다이얼로그 호출
        await NativeBiometric.verifyIdentity({
            reason: "지문 인식을 통해 로그인합니다.",
            title: "생체 인식 로그인",
            subtitle: "본인 확인",
            description: "기기에 등록된 지문 또는 얼굴을 사용하세요.",
        });

        // 2. 인증 성공 시 보안 저장소에서 nickname/password_hash 가져오기
        const credentials = await NativeBiometric.getCredentials({
            server: BIOMETRIC_SERVER
        });

        // 3. users 테이블에서 nickname + password_hash로 계정 조회 (일반 로그인과 동일한 방식)
        const { data: dbUser, error } = await supabase
            .from('users')
            .select('*')
            .eq('nickname', credentials.username)
            .eq('password_hash', credentials.password)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error || !dbUser) throw error || new Error('등록된 계정을 찾을 수 없습니다.');

        console.log('[Biometric] Native login successful:', dbUser.nickname);

        saveUser(dbUser);
        return { success: true, user: dbUser };
    } catch (err) {
        console.error('[Biometric] Native login failed:', err);
        throw err;
    }
};

