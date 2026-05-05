import { supabase } from './supabaseClient';

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
                receivers
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
            body: { type: 'friendtalk', receivers }
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
 * 솔라피 일반 SMS 단체 발송
 * @param {string[]} phoneNumbers - 수신할 전화번호 배열
 * @param {string} message - 발송할 메시지 본문
 */
export const sendBulkMessage = async (phoneNumbers, message) => {
    try {
        const { data, error } = await supabase.functions.invoke('aligo-send', {
            body: { phoneNumbers, message, type: 'sms' }
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
