import { supabase } from './supabaseClient';

/**
 * 모델뷰티에서 지금 진행 중인 라이브방송 목록을 가져온다.
 * 모델뷰티 /api/live에는 CORS 헤더가 없고 송출용 비밀값(streamKey 등)도 함께 내려오므로,
 * Supabase Edge Function(live-proxy)이 서버 사이드로 대신 호출해 노출용 필드만 걸러 돌려준다.
 * 시청/채팅/딜/게임 등은 전부 모델뷰티 쪽에서만 처리되며, 모카는 노출 + 딥링크만 담당한다.
 */
export const fetchLiveStreams = async () => {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase.functions.invoke('live-proxy');
        if (error) throw error;
        if (!data?.success || !Array.isArray(data.data)) return [];
        return data.data;
    } catch (e) {
        console.warn('[liveStreamService] 라이브방송 목록 조회 실패:', e.message || e);
        return [];
    }
};
