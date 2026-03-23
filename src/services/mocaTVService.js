import { supabase } from './supabaseClient';

// 모카TV 피처드 영상 목록 조회 (릴스/틱톡 등)
export const fetchFeaturedVideos = async () => {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('moca_featured_videos')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(v => ({
            id: `featured_${v.id}`,
            dbId: v.id,
            title: v.title,
            thumbnail: v.thumbnail_url || '',
            embedUrl: v.embed_url || '',
            link: v.url,
            platform: v.platform, // 'instagram' | 'tiktok' | 'youtube'
            category: v.category || '전체보기',
            isShorts: true, // 릴스/틱톡은 항상 9:16
            pubDate: v.created_at,
            isFeatured: true,
            duration: v.platform === 'instagram' ? 'Reels' : v.platform === 'tiktok' ? 'TikTok' : 'Shorts',
        }));
    } catch (error) {
        console.error('Error fetching featured videos:', error);
        return [];
    }
};

// 관리자 전용 - 전체 목록 조회 (비활성 포함)
export const fetchAllFeaturedVideosForAdmin = async () => {
    if (!supabase) return [];

    try {
        const { data, error } = await supabase
            .from('moca_featured_videos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching admin featured videos:', error);
        return [];
    }
};

// 영상 추가
export const addFeaturedVideo = async (video) => {
    if (!supabase) return { error: 'Supabase not configured' };

    const { data, error } = await supabase
        .from('moca_featured_videos')
        .insert([video])
        .select()
        .single();

    return { data, error };
};

// 영상 수정
export const updateFeaturedVideo = async (id, updates) => {
    if (!supabase) return { error: 'Supabase not configured' };

    const { data, error } = await supabase
        .from('moca_featured_videos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    return { data, error };
};

// 영상 삭제
export const deleteFeaturedVideo = async (id) => {
    if (!supabase) return { error: 'Supabase not configured' };

    const { error } = await supabase
        .from('moca_featured_videos')
        .delete()
        .eq('id', id);

    return { error };
};
