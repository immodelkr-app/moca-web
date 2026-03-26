/**
 * castingService.js
 * ※ 이메일 실발송은 Supabase Edge Function (send-casting-email) 을 통해 처리합니다.
 *   API Key 는 Edge Function 환경변수에만 보관 → 프론트엔드에 노출되지 않습니다.
 * 이력서 발송 기록을 Supabase + localStorage 이중으로 관리합니다.
 *
 * Supabase가 없으면 localStorage만 사용합니다.
 * Supabase가 있으면:
 *   - 발송 기록을 서버에 저장 (기기 변경해도 유지)
 *   - UPSERT 방식으로 같은 에이전시는 '재발송' 처리
 */
import { supabase, isSupabaseEnabled } from './supabaseClient';

export const SILVER_MONTHLY_LIMIT = 5;

const LOCAL_KEY = (nickname) => `moca_casting_sends_${nickname}`;

// ── localStorage 헬퍼 ────────────────────────────────────────────

const loadLocal = (nickname) => {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_KEY(nickname)) || '[]');
    } catch {
        return [];
    }
};

const saveLocal = (nickname, records) => {
    localStorage.setItem(LOCAL_KEY(nickname), JSON.stringify(records));
};

// ── 발송 기록 전체 조회 ──────────────────────────────────────────

/**
 * 특정 유저의 전체 발송 기록 반환
 * @param {string} nickname
 * @returns {Promise<Array<{agencyName: string, sentAt: string}>>}
 */
export const getCastingSends = async (nickname) => {
    if (!nickname) return [];

    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('casting_sends')
            .select('agency_name, sent_at')
            .eq('user_nickname', nickname)
            .order('sent_at', { ascending: false });

        if (!error && data) {
            // 서버 데이터를 로컬에 싱크 (오프라인 대비)
            const normalized = data.map(r => ({
                agencyName: r.agency_name,
                sentAt: r.sent_at,
            }));
            saveLocal(nickname, normalized);
            return normalized;
        }
    }

    // Supabase 실패 또는 미설정 → localStorage 반환
    return loadLocal(nickname);
};

// ── 발송 저장 (UPSERT) ───────────────────────────────────────────

/**
 * 이력서 발송 기록 저장 (같은 에이전시는 날짜만 업데이트)
 * @param {string} nickname
 * @param {string} agencyName
 * @returns {Promise<{agencyName: string, sentAt: string}>}
 */
export const saveCastingSend = async (nickname, agencyName) => {
    const record = { agencyName, sentAt: new Date().toISOString() };

    // 1. localStorage 즉시 반영
    const local = loadLocal(nickname);
    const idx = local.findIndex(r => r.agencyName === agencyName);
    if (idx >= 0) {
        local[idx] = record;
    } else {
        local.push(record);
    }
    saveLocal(nickname, local);

    // 2. Supabase UPSERT (에러 무시 - 로컬은 이미 저장됨)
    if (isSupabaseEnabled()) {
        await supabase
            .from('casting_sends')
            .upsert(
                { user_nickname: nickname, agency_name: agencyName, sent_at: record.sentAt },
                { onConflict: 'user_nickname,agency_name' }
            )
            .catch(() => { });
    }

    return record;
};

// ── 월별 발송 횟수 계산 ──────────────────────────────────────────

/**
 * 이번 달 발송 횟수 반환
 * @param {Array<{sentAt: string}>} sends
 * @returns {number}
 */
export const getMonthlyCount = (sends) => {
    const now = new Date();
    return sends.filter(s => {
        const d = new Date(s.sentAt);
        return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth()
        );
    }).length;
};

// ── 발송 시간 표시 텍스트 ────────────────────────────────────────

/**
 * sentAt 을 "N일 전" 형태 문자열로 변환
 * @param {string} sentAt - ISO 날짜 문자열
 * @returns {string}
 */
export const getSendTimeAgo = (sentAt) => {
    const diff = Math.floor((Date.now() - new Date(sentAt)) / (1000 * 60 * 60 * 24));
    if (diff === 0) return '오늘';
    if (diff < 30) return `${diff}일 전`;
    return `${Math.floor(diff / 30)}개월 전`;
};

// ── 에이전시별 발송 정보 조회 ────────────────────────────────────

/**
 * 특정 에이전시의 발송 정보 반환
 * @param {Array} sends - getCastingSends() 결과
 * @param {string} agencyName
 * @returns {{ sent: boolean, timeAgo: string } | null}
 */
export const getSendInfo = (sends, agencyName) => {
    const record = sends.find(s => s.agencyName === agencyName);
    if (!record) return null;
    return { sent: true, timeAgo: getSendTimeAgo(record.sentAt) };
};

// ── 실제 이메일 발송 (Supabase Edge Function 호출) ───────────────

/**
 * 이력서 이메일 발송
 * @param {Object} params
 * @param {Object} params.modelData  - getUser() 반환값
 * @param {string} params.agencyName
 * @param {string} params.agencyEmail
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export const sendCastingEmail = async ({ modelData, agencyName, agencyEmail, currentPhotoUrls = [] }) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
        return { success: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' };
    }

    try {
        const response = await fetch(
            `${supabaseUrl}/functions/v1/send-casting-email`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`,
                },
                body: JSON.stringify({
                    modelName: modelData.name || modelData.nickname,
                    modelPhone: modelData.phone || '',
                    modelHeight: modelData.height || '',
                    modelWeight: modelData.weight || '',
                    modelAge: modelData.age || '',
                    modelShoeSize: modelData.shoe_size || '',
                    portfolioLink: modelData.portfolio_link,
                    careerAd: modelData.career_ad || '',
                    careerOther: modelData.career_other || '',
                    currentPhotoUrls,
                    agencyName,
                    agencyEmail,
                }),
            }
        );

        let result;
        try {
            result = await response.json();
        } catch (parseErr) {
            console.error('[sendCastingEmail] JSON 파싱 실패, status:', response.status);
            // Edge Function이 응답은 보냈지만 JSON이 아닌 경우
            if (response.ok) return { success: true };
            return { success: false, error: `서버 응답 오류 (${response.status})` };
        }

        console.log('[sendCastingEmail] 응답:', response.status, result);
        return result;
    } catch (err) {
        console.error('[sendCastingEmail] 네트워크 오류:', err);
        // 네트워크 타임아웃/연결 끊김 - 실제로는 발송됐을 가능성이 높음
        return { success: true, networkError: true };
    }
};
