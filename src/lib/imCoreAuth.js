/**
 * im-core-auth API 클라이언트 유틸리티
 *
 * 환경 변수 (.env):
 *   VITE_IM_CORE_AUTH_URL        - im-core-auth 서버 주소 (기본: http://localhost:3000)
 *   VITE_IM_CORE_AUTH_API_SECRET - API 보안 시크릿 키
 *
 * 사용 예시:
 *   import { syncUserWithCore, getPointsBalance } from '../lib/imCoreAuth';
 */

const IM_CORE_AUTH_URL =
  import.meta.env.VITE_IM_CORE_AUTH_URL || 'http://localhost:3000';

const API_SECRET =
  import.meta.env.VITE_IM_CORE_AUTH_API_SECRET ||
  'im-core-auth-secret-2026-immodel';

const headers = {
  'Content-Type': 'application/json',
  'x-api-secret': API_SECRET,
};

// ---------------------------------------------------------------------------
// 1. 로그인/회원가입 시 회원 통합 연동 (SSO Sync)
// ---------------------------------------------------------------------------
/**
 * MOCA 사용자를 im-core-auth에 동기화합니다.
 * 로그인 또는 회원가입 완료 직후 호출하세요.
 *
 * @param {Object} params
 * @param {string} params.phoneNumber  - 휴대폰 번호 (예: '010-1234-5678', 자동 정규화됨)
 * @param {string} params.localUserId  - MOCA 앱 DB의 User ID
 * @param {string} [params.name]       - 사용자 실명 (선택)
 *
 * @returns {Promise<{ success: boolean, masterUserId: string, integratedPoints: number, isNewUser: boolean }>}
 */
export async function syncUserWithCore({ phoneNumber, localUserId, name }) {
  try {
    const cleanPhone = (phoneNumber || '').replace(/-/g, '').trim();
    const cleanName = (name || '').trim() || '미입력';
    const res = await fetch(`${IM_CORE_AUTH_URL}/api/auth/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phoneNumber: cleanPhone,
        appName: 'MOCA', // DB 제약 조건상 반드시 대문자 'MOCA'
        localUserId,
        name: cleanName,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
    // 응답 예시: { success: true, masterUserId: "...", integratedPoints: 0, isNewUser: true }
  } catch (err) {
    console.error('[imCoreAuth] syncUserWithCore 실패:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 2. 통합 포인트 잔액 조회
// ---------------------------------------------------------------------------
/**
 * masterUserId 기준으로 통합 포인트 잔액을 조회합니다.
 *
 * @param {string} masterUserId
 * @returns {Promise<{ success: boolean, balance: number }>}
 */
export async function getPointsBalance(masterUserId) {
  try {
    const res = await fetch(
      `${IM_CORE_AUTH_URL}/api/points/balance/${masterUserId}`,
      { method: 'GET', headers }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      success: data.success,
      balance: data.balance ?? 0,
    };
  } catch (err) {
    console.error('[imCoreAuth] getPointsBalance 실패:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 3. 통합 포인트 거래 내역 조회
// ---------------------------------------------------------------------------
/**
 * masterUserId 기준으로 포인트 거래 내역을 조회합니다.
 *
 * @param {string} masterUserId
 * @returns {Promise<{ success: boolean, history: Array<{ id, amount, tx_type, description, created_at, app_source }> }>}
 */
export async function getPointsHistory(masterUserId) {
  try {
    const res = await fetch(
      `${IM_CORE_AUTH_URL}/api/points/history/${masterUserId}`,
      { method: 'GET', headers }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const rawList = data.history ?? data.transactions ?? [];
    const mappedList = rawList.map((item) => {
      const rawType = item.tx_type ?? item.type;
      const txType =
        rawType === 'reward' ? 'reward' :
        rawType === 'deduct' ? 'deduct' :
        rawType === 'earn'   ? 'reward' :
        rawType === 'use'    ? 'deduct' :
        'deduct';
      return {
        id:          String(item.id ?? ''),
        amount:      Number(item.amount ?? 0),
        tx_type:     txType,
        description: String(item.description ?? ''),
        created_at:  String(item.created_at ?? ''),
        app_source:  String(item.app_source ?? item.source_app ?? ''),
      };
    });

    return {
      success: Boolean(data.success),
      history: mappedList,
    };
  } catch (err) {
    console.error('[imCoreAuth] getPointsHistory 실패:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 4. 포인트 적립 (Reward)
// ---------------------------------------------------------------------------
/**
 * 사용자에게 포인트를 적립합니다.
 *
 * @param {Object} params
 * @param {string} params.masterUserId  - 통합 사용자 ID
 * @param {number} params.amount        - 적립 포인트 (양수)
 * @param {string} params.description   - 적립 사유 설명
 *
 * @returns {Promise<{ success: boolean, newBalance: number }>}
 */
export async function rewardPoints({ masterUserId, amount, description }) {
  try {
    const res = await fetch(`${IM_CORE_AUTH_URL}/api/points/reward`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        masterUserId,
        appSource: 'MOCA',
        amount,
        description,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (err) {
    console.error('[imCoreAuth] rewardPoints 실패:', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 5. 포인트 차감 (Deduct)
// ---------------------------------------------------------------------------
/**
 * 사용자의 포인트를 차감합니다.
 *
 * @param {Object} params
 * @param {string} params.masterUserId  - 통합 사용자 ID
 * @param {number} params.amount        - 차감 포인트 (양수)
 * @param {string} params.description   - 차감 사유 설명
 *
 * @returns {Promise<{ success: boolean, newBalance: number }>}
 */
export async function deductPoints({ masterUserId, amount, description }) {
  try {
    const res = await fetch(`${IM_CORE_AUTH_URL}/api/points/deduct`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        masterUserId,
        appSource: 'MOCA',
        amount,
        description,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (err) {
    console.error('[imCoreAuth] deductPoints 실패:', err);
    throw err;
  }
}
