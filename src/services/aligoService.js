import { supabase } from './supabaseClient';

/**
 * 알리고 알림톡 전용 발송 함수
 * @param {string} templateCode 알리고에 등록된 템플릿 코드 (예: 'TT_1234')
 * @param {Array} receivers 수신자 배열 [{ phone: '01012345678', name: '홍길동', message: '템플릿내용...', button: { "button": [...] } }]
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
            console.error('Edge Function 오류:', error);
            throw error;
        }

        if (!data.success) {
            throw new Error(data.error || '알림톡 발송을 실패했습니다.');
        }

        return data;
    } catch (err) {
        console.error('알림톡 발송 실패:', err);
        throw err;
    }
};

/**
 * 알리고 API를 통한 단체 메시지 발송 함수
 * @param {string[]} phoneNumbers - 수신할 전화번호 배열 (예: ['01012345678', '01098765432'])
 * @param {string} message - 발송할 메시지 본문
 * @param {string} type - 기본 'sms', 카카오톡은 'kakao' (Edge Function 내에서 분기 처리)
 * @returns {Promise<any>}
 */
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
        if (!data.success) throw new Error(data.error || '친구톡 발송 실패');
        return data;
    } catch (err) {
        console.error('친구톡 발송 실패:', err);
        throw err;
    }
};

export const sendBulkMessage = async (phoneNumbers, message, type = 'sms') => {
    try {
        const { data, error } = await supabase.functions.invoke('aligo-send', {
            body: { phoneNumbers, message, type }
        });

        if (error) {
            console.error('Edge Function 오류:', error);
            throw error;
        }

        if (!data.success) {
            throw new Error(data.error || '메시지 발송을 실패했습니다.');
        }

        return data;
    } catch (err) {
        console.error('알리고 연동 실패:', err);
        throw err;
    }
};
