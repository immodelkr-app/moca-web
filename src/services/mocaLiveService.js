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

// 홈 대시보드용 - is_live 변경(시작/종료)을 실시간으로 반영. 배너가 마운트 시 한 번만
// 조회하면, 이미 화면을 열어둔 사용자는 관리자가 종료해도 새로고침 전까지 썸네일이
// 그대로 남아있게 되어(눌러도 재생 안 되는 죽은 배너) 추가함.
export const subscribeToActiveMocaLive = (onChange) => {
    if (!isSupabaseEnabled()) return () => {};

    const channel = supabase
        .channel('moca_live_streams_active')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'moca_live_streams' },
            () => { fetchActiveMocaLive().then(onChange); }
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

// 라이브 방송 등록
export const createMocaLiveStream = async ({ title, streamType, youtubeVideoId, playbackUrl, streamerName, coverImageUrl, targetGrade }) => {
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
        }])
        .select()
        .single();

    return { data, error };
};

// 라이브 방송 정보 수정
export const updateMocaLiveStream = async (id, { title, streamType, youtubeVideoId, playbackUrl, streamerName, coverImageUrl, targetGrade }) => {
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
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    return { data, error };
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
