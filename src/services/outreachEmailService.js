import { supabase } from './supabaseClient';


import { getAdminToken } from './adminAuth';
const call = async (payload) => {
    try {
        const { data, error } = await supabase.functions.invoke('outreach-email', { body: { adminKey: getAdminToken(), ...payload } });
        if (error) return { success: false, error: error.message || '서버 통신 중 오류가 발생했습니다.' };
        return data || { success: false, error: '응답이 비어 있습니다.' };
    } catch (err) {
        return { success: false, error: err?.message || '네트워크 연결을 확인해 주세요.' };
    }
};

export const fetchOutreachStats = () => call({ action: 'stats' });
export const sendOutreachTest = (to, subject) => call({ action: 'test', to, subject });
export const sendOutreachBatch = ({ campaignName, subject, recipients }) => call({ action: 'send', campaignName, subject, recipients });

// 메일 링크(/r/:token, /unsubscribe/:token)가 쓰는 공개 RPC (토큰 기반)
export const recordOutreachClick = async (token) => {
    try { await supabase.rpc('outreach_click', { p_token: token }); } catch { /* 클릭 기록 실패가 이동을 막으면 안 됨 */ }
};
export const unsubscribeOutreach = async (token) => {
    const { data, error } = await supabase.rpc('outreach_unsubscribe', { p_token: token });
    return { companyName: data, found: data !== null && data !== undefined, error };
};
