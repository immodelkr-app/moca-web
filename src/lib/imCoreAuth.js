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
 * @param {string} [params.grade]      - 회원 등급 ('NORMAL'|'SILVER'|'GOLD'|'IMODEL'|'VIP', 선택)
 *
 * @returns {Promise<{ success: boolean, masterUserId: string, integratedPoints: number, isNewUser: boolean, grade: string, grade_locked: boolean }>}
 */
export async function syncUserWithCore({ phoneNumber, localUserId, name, grade }) {
  try {
    const cleanPhone = (phoneNumber || '').replace(/-/g, '').trim();
    const cleanName = (name || '').trim() || '미입력';
    const body = {
      phoneNumber: cleanPhone,
      appName: 'MOCA', // DB 제약 조건상 반드시 대문자 'MOCA'
      localUserId,
      name: cleanName,
    };
    // grade가 제공된 경우에만 포함 (아임모델 공화국 연동 가이드)
    if (grade) {
      body.grade = grade.toUpperCase();
    }
    const res = await fetch(`${IM_CORE_AUTH_URL}/api/auth/sync`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    return res.json();
    // 응답 예시: { success: true, masterUserId: "...", integratedPoints: 0, isNewUser: true, grade: "VIP", grade_locked: false }
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

// ---------------------------------------------------------------------------
// 6. 등급 변경 시 실시간 동기화 (아임모델 공화국 연동 가이드 §2)
// ---------------------------------------------------------------------------
/**
 * MOCA 앱 내부에서 회원 등급이 변경될 때 호출하여 아임모델 공화국에 즉시 반영합니다.
 *
 * @param {Object} params
 * @param {string} params.masterUserId  - /api/auth/sync 응답으로 받은 통합 사용자 ID
 * @param {string} params.grade         - 변경된 등급 ('NORMAL'|'SILVER'|'GOLD'|'IMODEL'|'VIP')
 *
 * @returns {Promise<void>}  성공 시 조용히 종료, grade_locked(403)은 조용히 무시
 */
export async function updateGradeInCore({ masterUserId, grade }) {
  if (!masterUserId || !grade) {
    console.warn('[imCoreAuth] updateGradeInCore: masterUserId 또는 grade 누락, 호출 건너뜀');
    return;
  }
  try {
    const res = await fetch(`${IM_CORE_AUTH_URL}/api/moca/grade-update`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        masterUserId,
        grade: grade.toUpperCase(),
      }),
    });

    if (res.status === 403) {
      // GRADE_LOCKED: 어드민이 잠금 처리 → 조용히 무시 (연동 가이드 정책)
      console.log('[imCoreAuth] updateGradeInCore: GRADE_LOCKED, 조용히 무시');
      return;
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log('[imCoreAuth] updateGradeInCore 완료:', data.grade);
  } catch (err) {
    // 등급 동기화 실패는 앱 사용에 영향 없으므로 경고만 출력
    console.warn('[imCoreAuth] updateGradeInCore 실패 (비중단):', err.message);
  }
}
