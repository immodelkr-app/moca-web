/**
 * userService.js
 * 사용자 가입 정보를 localStorage + Supabase에 저장/관리
 *
 * Supabase가 설정되지 않으면 localStorage만 사용합니다.
 */
import { supabase, isSupabaseEnabled } from './supabaseClient';

const USER_KEY = 'i_model_user';
const USERS_LIST_KEY = 'i_model_users_list';

/**
 * 비밀번호 단순 해시 (실제 프로덕션에서는 서버사이드에서 bcrypt 사용 권장)
 * 프론트엔드 임시 처리용
 */
const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
};

/**
 * 사용자 정보 Supabase에 저장
 * @param {Object} userData
 * @returns {Promise<{data, error}>}
 */
export const saveUserToSupabase = async (userData) => {
    if (!isSupabaseEnabled()) {
        return { data: null, error: { message: 'Supabase not configured – using localStorage' } };
    }

    const { data, error } = await supabase
        .from('users')
        .insert([{
            nickname: userData.nickname,
            password_hash: userData.password ? simpleHash(userData.password) : '',
            name: userData.name,
            phone: userData.phone,
            email: userData.email || null,
            address: userData.address,
            referral_source: userData.referralSource || [],
            grade: userData.grade || 'SILVER',
        }])
        .select()
        .single();

    return { data, error };
};

/**
 * 사용자 전체 정보 localStorage 저장
 * @param {Object} userData - { nickname, name, phone, address, email, referralSource, grade, password }
 */
export const saveUser = (userData) => {
    const userWithMeta = {
        ...userData,
        grade: userData.grade === 'BASIC' ? 'SILVER' : (userData.grade || 'SILVER'),
        joinedAt: userData.joinedAt || new Date().toISOString(),
        auth_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1시간 후 만료
    };
    // 비밀번호는 로컬 세션(현재 로그인 세션용)에 평문 저장 안 함
    const { password, ...safeData } = userWithMeta;
    localStorage.setItem(USER_KEY, JSON.stringify(safeData));

    // 로컬 가입자 목록 업데이트 (Supabase 환경이 아닐 때의 DB 역할)
    const usersListRaw = localStorage.getItem(USERS_LIST_KEY);
    let usersList = [];
    if (usersListRaw) {
        try {
            usersList = JSON.parse(usersListRaw);
        } catch (e) {
            usersList = [];
        }
    }

    const existingIndex = usersList.findIndex(u => u.nickname === userData.nickname);
    const userToSave = {
        ...safeData,
        password_hash: userData.password ? simpleHash(userData.password) : userData.password_hash || ''
    };

    if (existingIndex >= 0) {
        usersList[existingIndex] = { ...usersList[existingIndex], ...userToSave };
    } else {
        usersList.push(userToSave);
    }
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(usersList));

    return safeData;
};

/**
 * 저장된 사용자 정보 불러오기
 * @returns {Object|null}
 */
export const getUser = () => {
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    try {
        const parsed = JSON.parse(data);
        if (typeof parsed === 'string') {
            return saveUser({ nickname: parsed, name: parsed });
        }

        // 만료 시간 체크
        if (parsed.auth_expires_at) {
            const now = new Date();
            const expiresAt = new Date(parsed.auth_expires_at);
            if (now > expiresAt) {
                // 만료된 경우 로그아웃 처리
                logoutUser();
                return null;
            }
        }

        return parsed;
    } catch {
        return null;
    }
};

/**
 * 로그인 여부 확인
 */
export const isLoggedIn = () => !!getUser();

/**
 * 사용자 로그인 로직
 * @param {string} nickname
 * @param {string} password
 * @returns {Promise<{user, error}>}
 */
export const loginUser = async (nickname, password) => {
    const hash = simpleHash(password);

    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('nickname', nickname)
            .eq('password_hash', hash)
            .single();

        if (error || !data) {
            return { user: null, error: { message: '닉네임 또는 비밀번호가 일치하지 않습니다.' } };
        }

        // --- 골드 회원 자동 강등 처리 ---
        if (data.grade === 'GOLD' && data.grade_expires_at) {
            const now = new Date();
            const expiresAt = new Date(data.grade_expires_at);
            if (now > expiresAt) {
                // 만료됨 -> 강등
                const { error: downgradeError } = await supabase
                    .from('users')
                    .update({ grade: 'SILVER', grade_expires_at: null })
                    .eq('id', data.id);

                if (!downgradeError) {
                    data.grade = 'SILVER';
                    data.grade_expires_at = null;
                }
            }
        }

        return { user: data, error: null };
    } else {
        // 로컬 fallback
        const usersListRaw = localStorage.getItem(USERS_LIST_KEY);
        if (!usersListRaw) {
            return { user: null, error: { message: '가입된 사용자가 없습니다. 회원가입을 먼저 진행해주세요.' } };
        }
        let usersList = [];
        try {
            usersList = JSON.parse(usersListRaw);
        } catch (e) { }

        const user = usersList.find(u => u.nickname === nickname && u.password_hash === hash);
        if (!user) {
            return { user: null, error: { message: '닉네임 또는 비밀번호가 일치하지 않습니다.' } };
        }

        return { user, error: null };
    }
};

/**
 * 비밀번호 재설정 로직 (닉네임과 연락처로 본인 확인)
 * @param {string} nickname 
 * @param {string} phone 
 * @param {string} newPassword 
 * @returns {Promise<{success: boolean, error: object|null}>}
 */
export const resetUserPassword = async (nickname, phone, newPassword) => {
    const newHash = simpleHash(newPassword);

    if (isSupabaseEnabled()) {
        // 본인 확인을 먼저 진행
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('id')
            .eq('nickname', nickname)
            .eq('phone', phone)
            .single();

        if (findError || !user) {
            return { success: false, error: { message: '일치하는 통합 정보를 찾을 수 없습니다.' } };
        }

        // 일치할 경우 비밀번호 업데이트
        const { error: updateError } = await supabase
            .from('users')
            .update({ password_hash: newHash })
            .eq('id', user.id);

        if (updateError) {
            return { success: false, error: { message: '비밀번호 재설정 중 오류가 발생했습니다.' } };
        }

        return { success: true, error: null };
    } else {
        // 로컬 fallback
        const usersListRaw = localStorage.getItem(USERS_LIST_KEY);
        if (!usersListRaw) {
            return { success: false, error: { message: '가입된 사용자가 없습니다.' } };
        }

        let usersList = [];
        try { usersList = JSON.parse(usersListRaw); } catch (e) { }

        const index = usersList.findIndex(u => u.nickname === nickname && u.phone === phone);
        if (index === -1) {
            return { success: false, error: { message: '일치하는 통합 정보를 찾을 수 없습니다.' } };
        }

        usersList[index].password_hash = newHash;
        localStorage.setItem(USERS_LIST_KEY, JSON.stringify(usersList));

        return { success: true, error: null };
    }
};

/**
 * 로그아웃
 */
export const logoutUser = () => {
    localStorage.removeItem(USER_KEY);
};

/**
 * 회원 등급 조회
 */
export const getUserGrade = () => {
    const user = getUser();
    let grade = user?.grade || 'SILVER';
    if (grade === 'BASIC') grade = 'SILVER';
    return grade;
};

/**
 * 회원 등급 업데이트
 */
export const updateGrade = (grade) => {
    const user = getUser();
    if (!user) return null;
    return saveUser({ ...user, grade });
};

/**
 * 등급별 한글 라벨 / 컬러
 */
export const GRADE_INFO = {
    SILVER: { label: 'SILVER', color: '#C0C0C0', bg: 'bg-slate-400/20', text: 'text-slate-300' },
    GOLD: { label: 'GOLD', color: '#F59E0B', bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
    VIP: { label: '전속모델', color: '#A78BFA', bg: 'bg-purple-500/20', text: 'text-purple-300' },
};

/**
 * 등급별 이모티콘 (이름 앞에 표시)
 * SILVER: ⭐ / GOLD: 🌟
 */
export const GRADE_EMOJI = {
    SILVER: '🤍',
    GOLD: '👑',
    VIP: '💜',
};

/**
 * 프로필 사진을 Supabase Storage에 업로드하고 공개 URL 반환
 * @param {File} file
 * @param {string} userNickname
 * @returns {Promise<{url: string|null, error: string|null}>}
 */
export const uploadProfilePhoto = async (file, userNickname) => {
    if (!isSupabaseEnabled()) return { url: null, error: 'Supabase 미설정' };
    const ext = file.name.split('.').pop();
    const path = `profiles/${userNickname}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
        .from('profile-photos')
        .upload(path, file, { upsert: true, contentType: file.type });
    if (error) return { url: null, error: error.message };
    const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
};

/**
 * 스마트 프로필 저장 (포트폴리오 링크, 스펙, 사진 등)
 * localStorage에 즉시 반영 + Supabase 업데이트 시도 (스키마 없어도 무중단)
 * @param {string|undefined} userId
 * @param {Object} profileData - { height, weight, age, portfolio_link, reply_email, photo_base64, photo_url }
 */
export const updateSmartProfile = async (userId, profileData) => {
    // 1. localStorage 즉시 반영 (항상 성공)
    const currentUser = getUser();
    if (currentUser) {
        const updatedUser = { ...currentUser, ...profileData };
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

        const usersListRaw = localStorage.getItem(USERS_LIST_KEY);
        let usersList = [];
        try { usersList = JSON.parse(usersListRaw) || []; } catch (e) { }
        const idx = usersList.findIndex(u => u.nickname === currentUser.nickname);
        if (idx >= 0) {
            usersList[idx] = { ...usersList[idx], ...profileData };
        } else {
            usersList.push(updatedUser);
        }
        localStorage.setItem(USERS_LIST_KEY, JSON.stringify(usersList));
    }

    // 2. Supabase 업데이트 (photo_base64 제외 - DB 용량 이슈, 로컬스토리지 유지)
    if (isSupabaseEnabled() && userId) {
        const { photo_base64, ...supabaseFields } = profileData;
        const { error } = await supabase
            .from('users')
            .update(supabaseFields)
            .eq('id', userId);
        if (error) {
            console.warn('[updateSmartProfile] Supabase 업데이트 실패 (마이그레이션 확인):', error.message);
        }
    }

    return { success: true };
};

/**
 * 회원 정보 업데이트 (비밀번호, 이름, 연락처, 주소 등)
 * @param {string} userId - 유저 ID (Supabase row id)
 * @param {Object} updateData - 업데이트 할 필드들 { name, phone, address, password }
 */
export const updateUserProfile = async (userId, updateData) => {
    const patches = { ...updateData };
    if (patches.password) {
        patches.password_hash = simpleHash(patches.password);
        delete patches.password;
    }

    if (isSupabaseEnabled() && userId) {
        const { data, error } = await supabase
            .from('users')
            .update(patches)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            return { error: { message: '정보 수정에 실패했습니다.' } };
        }

        // 업데이트 된 정보 로컬스토리지 최신화
        const currentUser = getUser();
        if (currentUser && currentUser.id === userId) {
            // saveUser 내부에 password_hash 가 덮어씌워질 수 있으므로 구조 분해 할당 후 직접 localStorage에 반영
            const updatedMeta = { ...currentUser, ...data };
            localStorage.setItem(USER_KEY, JSON.stringify(updatedMeta));
        }

        return { user: data, error: null };
    } else {
        // 로컬스토리지 fallback
        const currentUser = getUser();
        if (!currentUser) return { error: { message: '로그인 정보를 찾을 수 없습니다.' } };

        const updatedUser = { ...currentUser, ...patches };
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

        const usersListRaw = localStorage.getItem(USERS_LIST_KEY);
        let usersList = [];
        try { usersList = JSON.parse(usersListRaw) || []; } catch (e) { }

        const index = usersList.findIndex(u => u.nickname === updatedUser.nickname);
        if (index >= 0) {
            usersList[index] = { ...usersList[index], ...updatedUser };
            localStorage.setItem(USERS_LIST_KEY, JSON.stringify(usersList));
        }

        return { user: updatedUser, error: null };
    }
};

