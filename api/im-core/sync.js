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
 * @param {'GET'|'POST'|'PATCH'|'DELETE'} method
 * @param {object|null} body - JSON body (GET/DELETE 시 null)
 * @param {string} prefer - Prefer 헤더 값
 */
async function imCoreQuery(path, method = 'GET', body = null, prefer = '') {
    const url = `${IM_CORE_SUPABASE_URL}/rest/v1${path}`;

    const fetchOptions = {
        method,
        headers: {
            'apikey': IM_CORE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${IM_CORE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': prefer,
        },
    };

    // GET/HEAD 요청에는 body를 붙이지 않음
    if (body !== null && method !== 'GET' && method !== 'HEAD') {
        fetchOptions.body = JSON.stringify(body);
    }

    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`im-core query failed [${res.status}]: ${errText}`);
    }

    if (res.status === 204) return null;
    
    const text = await res.text();
    if (!text || text.trim() === '') {
        return null;
    }
    
    return JSON.parse(text);
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

    // 전화번호와 localUserId 중 하나는 필수
    const cleanPhone = (phone || '').replace(/-/g, '').trim();
    if (!cleanPhone && !localUserId) {
        return res.status(400).json({ error: '전화번호 또는 localUserId가 필요합니다.' });
    }

    try {
        // ── 1. 전화번호로 기존 master_user 조회 ───────────────────────────────
        // (cleanPhone은 앞서 handler 상단에서 이미 파싱됨)
        let masterUser = null;

        if (cleanPhone) {
            const existingUsers = await imCoreQuery(
                `/master_users?phone_number=eq.${encodeURIComponent(cleanPhone)}&limit=1`,
                'GET'
            );
            if (Array.isArray(existingUsers) && existingUsers.length > 0) {
                masterUser = existingUsers[0];
            }
        }

        const isNewUser = !masterUser;

        // ── 2. 신규 유저면 master_users에 INSERT ─────────────────────────────
        // NOTE: phone_number, name 컬럼은 NOT NULL이므로 빈 문자열 fallback 처리
        if (isNewUser) {
            const safeName = (name || '').trim() || '미입력';
            const safePhone = cleanPhone || '';

            const insertResult = await imCoreQuery(
                '/master_users',
                'POST',
                {
                    phone_number: safePhone,
                    name: safeName,
                    integrated_points: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
                'return=representation'
            );
            masterUser = Array.isArray(insertResult) ? insertResult[0] : insertResult;
        }

        // masterUser가 null이면 여기서 방어 처리
        if (!masterUser || !masterUser.id) {
            throw new Error('master_user 생성 또는 조회에 실패했습니다.');
        }

        const masterUserId = masterUser.id;

        // ── 3. app_user_mapping에 MOCA 앱 매핑 추가 (중복 방지) ───────────────
        // NOTE: local_user_id 컬럼은 NOT NULL이므로 빈 문자열 fallback 처리
        const existingMapping = await imCoreQuery(
            `/app_user_mapping?master_user_id=eq.${masterUserId}&app_name=eq.${APP_ID}&limit=1`,
            'GET'
        );

        if (!Array.isArray(existingMapping) || existingMapping.length === 0) {
            await imCoreQuery(
                '/app_user_mapping',
                'POST',
                {
                    master_user_id: masterUserId,
                    app_name: APP_ID,
                    local_user_id: localUserId || '',  // NOT NULL 컬럼 → 빈 문자열로 fallback
                    nickname: nickname || null,
                    role: 'member',
                    created_at: new Date().toISOString(),
                },
                'return=minimal'
            );
        }

        // ── 4. 연결된 다른 앱 목록 조회 ──────────────────────────────────────
        let linkedApps = [];
        if (!isNewUser) {
            const allMappings = await imCoreQuery(
                `/app_user_mapping?master_user_id=eq.${masterUserId}&app_name=neq.${APP_ID}`,
                'GET'
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
