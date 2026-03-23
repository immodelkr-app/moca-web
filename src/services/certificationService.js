import { supabase, isSupabaseEnabled } from './supabaseClient';

const LOCAL_POSTS_KEY = 'cert_posts';
const LOCAL_LIKES_KEY = 'cert_likes';
const LOCAL_COMMENTS_KEY = 'cert_comments';

// ─────────────────────────────────────────────
//  이미지 업로드
// ─────────────────────────────────────────────
export const uploadCertImage = async (file) => {
    if (!isSupabaseEnabled()) return { url: null, error: new Error('Supabase 미설정') };
    try {
        const ext = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = `certifications/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('moca_assets')
            .upload(filePath, file);

        if (uploadError) return { url: null, error: uploadError };

        const { data: publicUrlData } = supabase.storage
            .from('moca_assets')
            .getPublicUrl(filePath);

        return { url: publicUrlData.publicUrl, error: null };
    } catch (err) {
        return { url: null, error: err };
    }
};

// ─────────────────────────────────────────────
//  게시물 (Posts)
// ─────────────────────────────────────────────
export const fetchCertPosts = async (activityType = null) => {
    if (isSupabaseEnabled()) {
        let query = supabase
            .from('certification_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (activityType && activityType !== '전체') {
            query = query.eq('activity_type', activityType);
        }

        const { data, error } = await query;
        if (!error && data) return data;
        console.error('fetchCertPosts error:', error);
    }

    // localStorage fallback
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    let posts = raw ? JSON.parse(raw) : [];
    if (activityType && activityType !== '전체') {
        posts = posts.filter(p => p.activity_type === activityType);
    }
    return posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

export const createCertPost = async ({ userNickname, activityType, tagLabel, caption, imageFile, isMarketingAgreed }) => {
    let imageUrl = null;

    if (imageFile) {
        const { url, error: uploadError } = await uploadCertImage(imageFile);
        if (uploadError) {
            // 업로드 실패 시 base64로 fallback (localStorage용)
            imageUrl = await fileToBase64(imageFile);
        } else {
            imageUrl = url;
        }
    }

    const newPost = {
        id: crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}`,
        user_nickname: userNickname,
        activity_type: activityType,
        tag_label: tagLabel || '',
        caption: caption || '',
        image_url: imageUrl,
        is_marketing_agreed: isMarketingAgreed || false,
        likes_count: 0,
        created_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('certification_posts')
            .insert([{
                user_nickname: newPost.user_nickname,
                activity_type: newPost.activity_type,
                tag_label: newPost.tag_label,
                caption: newPost.caption,
                image_url: imageUrl,
                is_marketing_agreed: newPost.is_marketing_agreed,
                likes_count: 0,
            }])
            .select()
            .single();

        if (!error && data) return { post: data, error: null };
        console.error('createCertPost error:', error);
    }

    // localStorage fallback
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    const posts = raw ? JSON.parse(raw) : [];
    posts.unshift(newPost);
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
    return { post: newPost, error: null };
};

export const deleteCertPost = async (postId) => {
    if (isSupabaseEnabled()) {
        const { error } = await supabase
            .from('certification_posts')
            .delete()
            .eq('id', postId);
        if (error) console.error('deleteCertPost error:', error);
    }

    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    if (raw) {
        const posts = JSON.parse(raw).filter(p => p.id !== postId);
        localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
    }
};

// ─────────────────────────────────────────────
//  HOT 배지 & 마케팅 픽 (Admin)
// ─────────────────────────────────────────────

export const setHotStatus = async (postId, isHot) => {
    if (isSupabaseEnabled()) {
        const { error } = await supabase
            .from('certification_posts')
            .update({ is_hot: isHot })
            .eq('id', postId);
        if (error) console.error('setHotStatus error:', error);
    }
    // localStorage fallback
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    if (raw) {
        const posts = JSON.parse(raw).map(p => p.id === postId ? { ...p, is_hot: isHot } : p);
        localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
    }
};

export const setMarketingPick = async (postId, isPick, pickNote = '') => {
    if (isSupabaseEnabled()) {
        const { error } = await supabase
            .from('certification_posts')
            .update({ is_marketing_pick: isPick, pick_note: pickNote })
            .eq('id', postId);
        if (error) console.error('setMarketingPick error:', error);
    }
    // localStorage fallback
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    if (raw) {
        const posts = JSON.parse(raw).map(p => p.id === postId ? { ...p, is_marketing_pick: isPick, pick_note: pickNote } : p);
        localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
    }
};

export const fetchAllCertPostsForAdmin = async (onlyPicked = false) => {
    if (isSupabaseEnabled()) {
        let query = supabase
            .from('certification_posts')
            .select('*')
            .order('created_at', { ascending: false });
        if (onlyPicked) query = query.eq('is_marketing_pick', true);
        const { data, error } = await query;
        if (!error && data) return data;
        console.error('fetchAllCertPostsForAdmin error:', error);
    }
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    let posts = raw ? JSON.parse(raw) : [];
    if (onlyPicked) posts = posts.filter(p => p.is_marketing_pick);
    return posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
};

// ─────────────────────────────────────────────
//  좋아요 (Likes)
// ─────────────────────────────────────────────
export const fetchMyLikedPostIds = async (userNickname) => {
    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('certification_likes')
            .select('post_id')
            .eq('user_nickname', userNickname);
        if (!error && data) return data.map(l => l.post_id);
    }

    const raw = localStorage.getItem(LOCAL_LIKES_KEY);
    const likes = raw ? JSON.parse(raw) : [];
    return likes.filter(l => l.user_nickname === userNickname).map(l => l.post_id);
};

export const toggleLike = async (postId, userNickname) => {
    if (isSupabaseEnabled()) {
        // 기존 좋아요 확인
        const { data: existing } = await supabase
            .from('certification_likes')
            .select('id')
            .eq('post_id', postId)
            .eq('user_nickname', userNickname)
            .maybeSingle();

        if (existing) {
            // 취소
            await supabase.from('certification_likes').delete().eq('id', existing.id);
            const { data: post } = await supabase.from('certification_posts').select('likes_count').eq('id', postId).single();
            const newCount = Math.max(0, (post?.likes_count || 0) - 1);
            await supabase.from('certification_posts').update({ likes_count: newCount }).eq('id', postId);
            return { liked: false, newCount };
        } else {
            // 추가
            await supabase.from('certification_likes').insert([{ post_id: postId, user_nickname: userNickname }]);
            const { data: post } = await supabase.from('certification_posts').select('likes_count').eq('id', postId).single();
            const newCount = (post?.likes_count || 0) + 1;
            await supabase.from('certification_posts').update({ likes_count: newCount }).eq('id', postId);
            return { liked: true, newCount };
        }
    }

    // localStorage fallback
    const raw = localStorage.getItem(LOCAL_LIKES_KEY);
    const likes = raw ? JSON.parse(raw) : [];
    const existingIdx = likes.findIndex(l => l.post_id === postId && l.user_nickname === userNickname);

    const postsRaw = localStorage.getItem(LOCAL_POSTS_KEY);
    const posts = postsRaw ? JSON.parse(postsRaw) : [];
    const postIdx = posts.findIndex(p => p.id === postId);

    if (existingIdx > -1) {
        likes.splice(existingIdx, 1);
        if (postIdx > -1) posts[postIdx].likes_count = Math.max(0, (posts[postIdx].likes_count || 1) - 1);
        localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(likes));
        localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
        return { liked: false, newCount: posts[postIdx]?.likes_count || 0 };
    } else {
        likes.push({ post_id: postId, user_nickname: userNickname });
        if (postIdx > -1) posts[postIdx].likes_count = (posts[postIdx].likes_count || 0) + 1;
        localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(likes));
        localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
        return { liked: true, newCount: posts[postIdx]?.likes_count || 1 };
    }
};

// ─────────────────────────────────────────────
//  댓글 (Comments)
// ─────────────────────────────────────────────
export const fetchComments = async (postId) => {
    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('certification_comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });
        if (!error && data) return data;
    }

    const raw = localStorage.getItem(LOCAL_COMMENTS_KEY);
    const comments = raw ? JSON.parse(raw) : [];
    return comments.filter(c => c.post_id === postId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
};

export const addComment = async (postId, userNickname, content) => {
    const newComment = {
        id: crypto.randomUUID ? crypto.randomUUID() : `local_c_${Date.now()}`,
        post_id: postId,
        user_nickname: userNickname,
        content,
        created_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('certification_comments')
            .insert([{ post_id: postId, user_nickname: userNickname, content }])
            .select()
            .single();
        if (!error && data) return data;
        console.error('addComment error:', error);
    }

    const raw = localStorage.getItem(LOCAL_COMMENTS_KEY);
    const comments = raw ? JSON.parse(raw) : [];
    comments.push(newComment);
    localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(comments));
    return newComment;
};

export const deleteComment = async (commentId) => {
    if (isSupabaseEnabled()) {
        await supabase.from('certification_comments').delete().eq('id', commentId);
    }
    const raw = localStorage.getItem(LOCAL_COMMENTS_KEY);
    if (raw) {
        const comments = JSON.parse(raw).filter(c => c.id !== commentId);
        localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(comments));
    }
};

// ─────────────────────────────────────────────
//  Utils
// ─────────────────────────────────────────────
const fileToBase64 = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
});
