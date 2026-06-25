/**
 * pointsService.js
 * MOCA ↔ im-core-auth 통합 포인트 연동 서비스
 *
 * im-core-auth REST API (https://im-core-auth.vercel.app) 를 통해
 * 통합 포인트를 조회하고 사용자를 등록/동기화합니다.
 */

const IM_CORE_AUTH_URL =
    import.meta.env.VITE_IM_CORE_AUTH_URL || 'https://im-core-auth.vercel.app';
const IM_CORE_AUTH_API_SECRET =
    import.meta.env.VITE_IM_CORE_AUTH_API_SECRET || 'im-core-auth-secret-2026-immodel';

const POINTS_CACHE_KEY = 'moca_integrated_points_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5분 캐시

/**
 * 공통 API 요청 헬퍼
 */
const coreAuthFetch = async (path, options = {}) => {
    const url = `${IM_CORE_AUTH_URL}/api/${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'x-api-secret': IM_CORE_AUTH_API_SECRET,
            ...(options.headers || {}),
        },
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`[im-core-auth] ${path} ${res.status}: ${errText}`);
    }
    return res.json();
};

/**
 * MOCA 사용자를 im-core-auth에 동기화하고 통합 포인트를 반환합니다.
 *
 * @param {Object} user - MOCA 유저 (id 또는 nickname, phone, name 포함)
 * @returns {Promise<{
 *   success: boolean,
 *   masterUserId: string|null,
 *   integratedPoints: number,
 *   isNewUser: boolean,
 *   linkedApps: string[],
 *   error: string|null
 * }>}
 */
export const syncUserWithCoreAuth = async (user) => {
    if (!user) return { success: false, masterUserId: null, integratedPoints: 0, error: '유저 정보 없음' };

    const phone = user.phone?.replace(/-/g, '') || '';
    const localUserId = user.id || user.nickname || '';

    if (!phone || !localUserId) {
        return {
            success: false,
            masterUserId: null,
            integratedPoints: 0,
            error: '전화번호 또는 유저 ID가 없습니다.',
        };
    }

    try {
        const result = await coreAuthFetch('auth/sync', {
            method: 'POST',
            body: JSON.stringify({
                appName: 'MOCA',
                phoneNumber: phone,
                localUserId: String(localUserId),
                name: user.name || user.nickname || '미입력',
                nickname: user.nickname || '',
            }),
        });

        // 캐시 저장
        const cacheData = {
            masterUserId: result.masterUserId,
            integratedPoints: result.integratedPoints || 0,
            linkedApps: result.linkedApps || [],
            cachedAt: Date.now(),
        };
        localStorage.setItem(POINTS_CACHE_KEY, JSON.stringify(cacheData));

        return {
            success: true,
            masterUserId: result.masterUserId || null,
            integratedPoints: result.integratedPoints || 0,
            isNewUser: result.isNewUser || false,
            linkedApps: result.linkedApps || [],
            error: null,
        };
    } catch (err) {
        console.error('[pointsService] syncUserWithCoreAuth 오류:', err.message);
        return {
            success: false,
            masterUserId: null,
            integratedPoints: 0,
            error: err.message,
        };
    }
};

/**
 * 캐시에서 포인트를 즉시 반환하거나, 캐시가 만료되면 재동기화합니다.
 *
 * @param {Object} user - MOCA 유저
 * @param {boolean} forceRefresh - 캐시 무시 후 강제 새로고침
 * @returns {Promise<{ integratedPoints: number, masterUserId: string|null, linkedApps: string[], fromCache: boolean }>}
 */
export const getIntegratedPoints = async (user, forceRefresh = false) => {
    // 캐시 확인
    if (!forceRefresh) {
        try {
            const cached = JSON.parse(localStorage.getItem(POINTS_CACHE_KEY) || 'null');
            if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
                return {
                    integratedPoints: cached.integratedPoints || 0,
                    masterUserId: cached.masterUserId || null,
                    linkedApps: cached.linkedApps || [],
                    fromCache: true,
                };
            }
        } catch (e) { /* 캐시 파싱 오류 무시 */ }
    }

    // 캐시 만료 → 재동기화
    const result = await syncUserWithCoreAuth(user);
    return {
        integratedPoints: result.integratedPoints || 0,
        masterUserId: result.masterUserId || null,
        linkedApps: result.linkedApps || [],
        fromCache: false,
    };
};

/**
 * 캐시된 포인트 즉시 반환 (동기 함수, API 호출 없음)
 * @returns {{ integratedPoints: number, masterUserId: string|null } | null}
 */
export const getCachedPoints = () => {
    try {
        const cached = JSON.parse(localStorage.getItem(POINTS_CACHE_KEY) || 'null');
        if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
            return {
                integratedPoints: cached.integratedPoints || 0,
                masterUserId: cached.masterUserId || null,
                linkedApps: cached.linkedApps || [],
            };
        }
    } catch (e) { /* 무시 */ }
    return null;
};

/**
 * 포인트 캐시 초기화 (로그아웃 시 호출)
 */
export const clearPointsCache = () => {
    localStorage.removeItem(POINTS_CACHE_KEY);
};
