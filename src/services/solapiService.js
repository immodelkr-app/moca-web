import { supabase } from './supabaseClient';

// 발송 함수(aligo-send)가 서버에서 확인하는 관리자 키. 관리자 화면에서만 쓰이는 발송 호출에 붙는다.
// (AdminPage의 ADMIN_PASSWORD와 같은 값 — AdminPage를 import하면 순환/번들이 커져 같은 env를 직접 읽는다)
const ADMIN_KEY = import.meta.env.VITE_ADMIN_PASSWORD || 'immodel2024';

/**
 * 솔라피 카카오 알림톡 발송 (템플릿 심사 필요)
 * @param {string} templateCode 솔라피에 등록된 템플릿 ID
 * @param {Array} receivers [{ phone, name, message, button, variables, templateId, pfId }]
 */
export const sendAlimtalk = async (templateCode, receivers) => {
    try {
        const { data, error } = await supabase.functions.invoke('aligo-send', {
            body: {
                type: 'kakao',
                templateCode,
                receivers,
                adminKey: ADMIN_KEY
            }
        });

        if (error) {
            console.error('[solapiService] Edge Function 오류:', error);
            throw error;
        }

        if (!data?.success) {
            throw new Error(data?.error || '알림톡 발송을 실패했습니다.');
        }

        return data;
    } catch (err) {
        console.error('[solapiService] 알림톡 발송 실패:', err);
        throw err;
    }
};

/**
 * 솔라피 친구톡 (FT) 발송 - 마케팅/광고성 메시지용 (템플릿 심사 불필요)
 * @param {Array} receivers [{ phone, content, buttons }]
 */
export const sendFriendtalk = async (receivers) => {
    try {
        const { data, error } = await supabase.functions.invoke('aligo-send', {
            body: { type: 'friendtalk', receivers, adminKey: ADMIN_KEY }
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || '친구톡 발송 실패');
        return data;
    } catch (err) {
        console.error('[solapiService] 친구톡 발송 실패:', err);
        throw err;
    }
};


/**
 * 관리자에게 신규 이벤트 알림 SMS 발송 (best-effort — 실패해도 원 작업 흐름에는 영향 없음)
 * @param {string} message
 */
export const notifyAdmin = async (message) => {
    try {
        // 수신자는 서버가 관리자 번호로 고정한다(요청에 번호를 싣지 않음). 길이·횟수도 서버에서 제한.
        const { data, error } = await supabase.functions.invoke('aligo-send', { body: { type: 'admin_notify', message } });
        if (error || !data?.success) throw error || new Error(data?.error || '발송 실패');
    } catch (err) {
        console.warn('[solapiService] 관리자 알림 발송 실패:', err.message);
    }
};

/**
 * 솔라피 일반 SMS 단체 발송
 * @param {string[]} phoneNumbers - 수신할 전화번호 배열
 * @param {string} message - 발송할 메시지 본문
 */
export const sendBulkMessage = async (phoneNumbers, message) => {
    try {
        const { data, error } = await supabase.functions.invoke('aligo-send', {
            body: { phoneNumbers, message, type: 'sms', adminKey: ADMIN_KEY }
        });

        if (error) {
            console.error('[solapiService] Edge Function 오류:', error);
            throw error;
        }

        if (!data?.success) {
            throw new Error(data?.error || '메시지 발송을 실패했습니다.');
        }

        return data;
    } catch (err) {
        console.error('[solapiService] SMS 발송 실패:', err);
        throw err;
    }
};
