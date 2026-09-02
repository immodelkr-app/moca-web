import { supabase } from './supabaseClient';

/**
 * 모델뷰티 체험단 목록을 가져온다.
 * 모델뷰티 /api/trials에는 CORS 헤더가 없어 브라우저에서 직접 호출할 수 없으므로,
 * Supabase Edge Function(trial-proxy)이 서버 사이드로 대신 호출한 결과를 받는다.
 * 신청/심사/배송지 등은 전부 모델뷰티 쪽에서만 처리되며, 모카는 목록 노출 + 딥링크만 담당한다.
 */
export const fetchTrialCampaigns = async () => {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase.functions.invoke('trial-proxy');
        if (error) throw error;
        if (!data?.success || !Array.isArray(data.data)) return [];
        return data.data;
    } catch (e) {
        console.warn('[trialCampaignService] 체험단 목록 조회 실패:', e.message || e);
        return [];
    }
};

/**
 * recruitEnd(ISO datetime) 기준 D-day 배지 텍스트.
 * 이미 지난 캠페인은 null을 반환한다 (trial-proxy가 recruiting 상태만 내려주지만,
 * 캐시된 응답을 보고 있는 사이 마감 시각이 지났을 수 있어 프론트에서도 한 번 더 방어한다).
 */
export const getTrialDday = (recruitEnd) => {
    if (!recruitEnd) return null;
    const end = new Date(recruitEnd);
    const now = new Date();
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    if (diffDays === 0) return '오늘마감';
    return `D-${diffDays}`;
};
