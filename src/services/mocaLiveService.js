import { supabase, isSupabaseEnabled } from './supabaseClient';

/**
 * 모카 자체 라이브방송(김대표 소통/교육) 서비스.
 * 판매방송인 모델뷰티 라이브(liveStreamService)와 달리, 송출은 유튜브 라이브로 하고
 * 모카는 관리자가 수동으로 videoId를 등록/토글해 홈 대시보드에 노출한다.
 */

// 유튜브 URL(watch/live/youtu.be/embed) 또는 순수 videoId를 입력받아 videoId만 추출
export const extractYoutubeVideoId = (input) => {
    if (!input) return '';
    const trimmed = input.trim();

    const patterns = [
        /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
        /(?:youtube\.com\/live\/)([\w-]{11})/,
        /(?:youtube\.com\/embed\/)([\w-]{11})/,
        /(?:youtu\.be\/)([\w-]{11})/,
    ];

    for (const pattern of patterns) {
        const match = trimmed.match(pattern);
        if (match) return match[1];
    }

    // 이미 순수 videoId 형태(11자)인 경우
    if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

    return '';
};

// 커버 이미지 파일(jpg/png 등)을 Storage에 업로드하고 공개 URL 반환
export const uploadMocaLiveCover = async (file) => {
    if (!isSupabaseEnabled()) return { url: null, error: new Error('Supabase not connected') };
    try {
        const ext = file.name.split('.').pop();
        const filePath = `moca-live-covers/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('moca_assets')
            .upload(filePath, file, { upsert: true, contentType: file.type });

        if (uploadError) return { url: null, error: uploadError };

        const { data } = supabase.storage.from('moca_assets').getPublicUrl(filePath);
        return { url: data.publicUrl, error: null };
    } catch (err) {
        return { url: null, error: err };
    }
};

// 홈 대시보드용 - is_live 변경(시작/종료)이나 예고(scheduled_at) 등록/수정을 실시간으로
// 반영. 배너가 마운트 시 한 번만 조회하면, 이미 화면을 열어둔 사용자는 관리자가 종료해도
// 새로고침 전까지 썸네일이 그대로 남아있게 되어(눌러도 재생 안 되는 죽은 배너) 추가함.
export const subscribeToMocaLiveState = (onChange) => {
    if (!isSupabaseEnabled()) return () => {};

    const refetch = async () => {
        const active = await fetchActiveMocaLive();
        const upcoming = active ? null : await fetchUpcomingMocaLive();
        onChange({ active, upcoming });
    };

    const channel = supabase
        .channel('moca_live_streams_active')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'moca_live_streams' },
            refetch
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

// 홈 대시보드용 - 현재 라이브 중인 방송 1건 조회
export const fetchActiveMocaLive = async () => {
    if (!isSupabaseEnabled()) return null;

    try {
        const { data, error } = await supabase
            .from('moca_live_streams')
            .select('*')
            .eq('is_live', true)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data || null;
    } catch (e) {
        console.warn('[mocaLiveService] 모카 라이브 조회 실패:', e.message || e);
        return null;
    }
};

// 홈 대시보드용 - 아직 라이브는 아니지만 예고(방송 예정 일시)가 등록된 방송 1건 조회.
// 예정 시각이 지나도 관리자가 라이브 전환/삭제하기 전까지는 계속 예고로 노출한다
// (배너 쪽에서 "곧 시작합니다"로 문구만 바꿔 보여줌).
export const fetchUpcomingMocaLive = async () => {
    if (!isSupabaseEnabled()) return null;

    try {
        const { data, error } = await supabase
            .from('moca_live_streams')
            .select('*')
            .eq('is_live', false)
            .not('scheduled_at', 'is', null)
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data || null;
    } catch (e) {
        console.warn('[mocaLiveService] 모카 라이브 예고 조회 실패:', e.message || e);
        return null;
    }
};

// 관리자용 - 전체 목록 조회
export const fetchAllMocaLiveStreams = async () => {
    if (!isSupabaseEnabled()) return [];

    const { data, error } = await supabase
        .from('moca_live_streams')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[mocaLiveService] 전체 목록 조회 실패:', error);
        return [];
    }
    return data || [];
};

// 관리자용 - 단건 조회 (방송 컨트롤 페이지에서 사용)
export const fetchMocaLiveStreamById = async (id) => {
    if (!isSupabaseEnabled()) return null;

    const { data, error } = await supabase
        .from('moca_live_streams')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('[mocaLiveService] 단건 조회 실패:', error);
        return null;
    }
    return data;
};

// 라이브 방송 등록
export const createMocaLiveStream = async ({ title, streamType, youtubeVideoId, playbackUrl, streamerName, coverImageUrl, targetGrade, vodUrl, scheduledAt }) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };

    const { data, error } = await supabase
        .from('moca_live_streams')
        .insert([{
            title,
            stream_type: streamType || 'youtube',
            youtube_video_id: streamType === 'rtmp' ? null : youtubeVideoId,
            playback_url: streamType === 'rtmp' ? playbackUrl : null,
            streamer_name: streamerName || '김대표',
            cover_image_url: coverImageUrl || null,
            target_grade: targetGrade || 'ALL',
            vod_url: vodUrl || null,
            scheduled_at: scheduledAt || null,
        }])
        .select()
        .single();

    return { data, error };
};

// 라이브 방송 정보 수정
export const updateMocaLiveStream = async (id, { title, streamType, youtubeVideoId, playbackUrl, streamerName, coverImageUrl, targetGrade, vodUrl, scheduledAt }) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };

    const { data, error } = await supabase
        .from('moca_live_streams')
        .update({
            title,
            stream_type: streamType || 'youtube',
            youtube_video_id: streamType === 'rtmp' ? null : youtubeVideoId,
            playback_url: streamType === 'rtmp' ? playbackUrl : null,
            streamer_name: streamerName || '김대표',
            cover_image_url: coverImageUrl || null,
            target_grade: targetGrade || 'ALL',
            vod_url: vodUrl || null,
            scheduled_at: scheduledAt || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    return { data, error };
};

// 다시보기(VOD) 목록 - 유튜브 라이브는 종료 후 같은 videoId가 자동으로 다시보기가 되고,
// RTMP는 관리자가 vod_url을 수동으로 채워준 것만 다시보기 대상이 된다.
export const fetchPastMocaLiveStreams = async (limit = 12) => {
    if (!isSupabaseEnabled()) return [];

    try {
        const { data, error } = await supabase
            .from('moca_live_streams')
            .select('*')
            .eq('is_live', false)
            .or('stream_type.eq.youtube,vod_url.not.is.null')
            .order('updated_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.warn('[mocaLiveService] 다시보기 목록 조회 실패:', e.message || e);
        return [];
    }
};

// 예고 알림 신청 여부 조회 - 홈 대시보드 예고 카드의 "🔔 알림 받기" 버튼 초기 상태 표시용
export const isSubscribedToLiveReminder = async (liveId, userId) => {
    if (!isSupabaseEnabled() || !liveId || !userId) return false;

    const { data, error } = await supabase
        .from('moca_live_reminder_subscriptions')
        .select('id')
        .eq('live_id', liveId)
        .eq('user_id', userId)
        .maybeSingle();

    if (error) {
        console.warn('[mocaLiveService] 예고 알림 신청 여부 조회 실패:', error.message || error);
        return false;
    }
    return !!data;
};

// 예고 알림 신청 - 방송 시작 10분 전, DB의 pg_cron 스케줄러(send_moca_live_reminders)가
// 신청자에게만 자동으로 푸시를 발송한다 (전체 발송이 아니라 신청자 타겟팅).
export const addLiveReminderSubscription = async (liveId, userId, userNickname) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };

    const { error } = await supabase
        .from('moca_live_reminder_subscriptions')
        .upsert({ live_id: liveId, user_id: userId, user_nickname: userNickname }, { onConflict: 'live_id,user_id' });

    return { error };
};

// 예고 알림 신청 해제
export const removeLiveReminderSubscription = async (liveId, userId) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };

    const { error } = await supabase
        .from('moca_live_reminder_subscriptions')
        .delete()
        .eq('live_id', liveId)
        .eq('user_id', userId);

    return { error };
};

// 관리자용 - 예고 알림 신청자 수 (방송 컨트롤 화면에서 관심도 참고용)
export const fetchLiveReminderSubscriberCount = async (liveId) => {
    if (!isSupabaseEnabled()) return 0;

    const { count, error } = await supabase
        .from('moca_live_reminder_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('live_id', liveId);

    if (error) {
        console.warn('[mocaLiveService] 예고 알림 신청자 수 조회 실패:', error.message || error);
        return 0;
    }
    return count || 0;
};

// 라이브 방송 삭제
export const deleteMocaLiveStream = async (id) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { error } = await supabase
        .from('moca_live_streams')
        .delete()
        .eq('id', id);
    return { error };
};

// 라이브 시작 - 동시에 하나만 라이브 상태를 유지하도록 나머지는 자동으로 종료 처리
export const goLive = async (id) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };

    const { error: stopOthersError } = await supabase
        .from('moca_live_streams')
        .update({ is_live: false, updated_at: new Date().toISOString() })
        .neq('id', id)
        .eq('is_live', true);

    if (stopOthersError) return { error: stopOthersError };

    const { data, error } = await supabase
        .from('moca_live_streams')
        .update({ is_live: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    return { data, error };
};

// 라이브 종료
export const stopLive = async (id) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };

    const { data, error } = await supabase
        .from('moca_live_streams')
        .update({ is_live: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

    return { data, error };
};
