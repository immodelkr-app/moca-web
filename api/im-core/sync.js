/**
 * /api/im-core/sync.js
 * Vercel Serverless Function - im-core-auth 통합 동기화 엔드포인트
 *
 * POST /api/im-core/sync
 * body: { phone, name, nickname, localUserId, referralSource, appId }
 *
 * 응답: {
 *   success: boolean,
 *   masterUserId: string,
 *   integratedPoints: number,
 *   isNewUser: boolean,
 *   linkedApps?: string[]
 * }
 */

const IM_CORE_SUPABASE_URL = 'https://siqyyissgquwykjrktqr.supabase.co';
// IMPORTANT: IM_CORE_SERVICE_ROLE_KEY 환경변수를 Vercel 프로젝트 설정에 등록해야 합니다.
// service_role 키는 RLS를 우회하여 서버사이드에서 안전하게 데이터를 조회/삽입합니다.
const IM_CORE_SERVICE_ROLE_KEY = process.env.IM_CORE_SERVICE_ROLE_KEY;
const APP_ID = 'MOCA';

/**
 * im-core-auth Supabase에 REST API로 쿼리를 실행하는 헬퍼
 * @param {string} path - 테이블 경로 (e.g. '/master_users')
 * @param {RequestInit} options
 */
async function imCoreQuery(path, options = {}) {
    const url = `${IM_CORE_SUPABASE_URL}/rest/v1${path}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'apikey': IM_CORE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${IM_CORE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': options.prefer || '',
            ...options.headers,
        },
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`im-core query failed [${res.status}]: ${errText}`);
    }

    // 204 No Content 는 바디가 없음
    if (res.status === 204) return null;
    return res.json();
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!IM_CORE_SERVICE_ROLE_KEY) {
        console.error('[im-core/sync] IM_CORE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.');
        return res.status(500).json({ error: 'Server configuration error: missing service key.' });
    }

    const { phone, name, nickname, localUserId, referralSource } = req.body || {};

    if (!phone && !localUserId) {
        return res.status(400).json({ error: '전화번호 또는 localUserId가 필요합니다.' });
    }

    try {
        // ── 1. 전화번호로 기존 master_user 조회 ───────────────────────────────
        // 전화번호 포맷 통일 (하이픈 제거)
        const cleanPhone = (phone || '').replace(/-/g, '').trim();
        let masterUser = null;

        if (cleanPhone) {
            const existingUsers = await imCoreQuery(
                `/master_users?phone_number=eq.${encodeURIComponent(cleanPhone)}&limit=1`,
                { method: 'GET' }
            );
            if (Array.isArray(existingUsers) && existingUsers.length > 0) {
                masterUser = existingUsers[0];
            }
        }

        const isNewUser = !masterUser;

        // ── 2. 신규 유저면 master_users에 INSERT ─────────────────────────────
        if (isNewUser) {
            const insertResult = await imCoreQuery('/master_users', {
                method: 'POST',
                prefer: 'return=representation',
                body: JSON.stringify({
                    phone_number: cleanPhone || null,
                    name: name || null,
                    integrated_points: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }),
            });
            masterUser = Array.isArray(insertResult) ? insertResult[0] : insertResult;
        }

        const masterUserId = masterUser.id;

        // ── 3. app_user_mapping에 MOCA 앱 매핑 추가 (중복 방지) ───────────────
        const existingMapping = await imCoreQuery(
            `/app_user_mapping?master_user_id=eq.${masterUserId}&app_name=eq.${APP_ID}&limit=1`,
            { method: 'GET' }
        );

        if (!Array.isArray(existingMapping) || existingMapping.length === 0) {
            await imCoreQuery('/app_user_mapping', {
                method: 'POST',
                prefer: 'return=minimal',
                body: JSON.stringify({
                    master_user_id: masterUserId,
                    app_name: APP_ID,
                    local_user_id: localUserId || null,
                    nickname: nickname || null,
                    role: 'member',
                    created_at: new Date().toISOString(),
                }),
            });
        }

        // ── 4. 연결된 다른 앱 목록 조회 ──────────────────────────────────────
        let linkedApps = [];
        if (!isNewUser) {
            const allMappings = await imCoreQuery(
                `/app_user_mapping?master_user_id=eq.${masterUserId}&app_name=neq.${APP_ID}`,
                { method: 'GET' }
            );
            if (Array.isArray(allMappings)) {
                linkedApps = [...new Set(allMappings.map((m) => m.app_name))];
            }
        }

        console.log(`[im-core/sync] 동기화 완료 | masterUserId: ${masterUserId} | isNewUser: ${isNewUser} | linkedApps: ${linkedApps.join(', ') || 'none'}`);

        return res.status(200).json({
            success: true,
            masterUserId,
            integratedPoints: masterUser.integrated_points || 0,
            isNewUser,
            linkedApps: linkedApps.length > 0 ? linkedApps : undefined,
        });
    } catch (error) {
        console.error('[im-core/sync] 동기화 오류:', error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}
