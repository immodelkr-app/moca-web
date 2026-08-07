import { supabase, isSupabaseEnabled } from './supabaseClient';
import { rewardPoints } from '../lib/imCoreAuth';
import { getKSTDateStr } from './attendanceService';

const LOCAL_POSTS_KEY = 'cert_posts';
const LOCAL_LIKES_KEY = 'cert_likes';
const LOCAL_COMMENTS_KEY = 'cert_comments';
const UPLOAD_POINTS = 100;
const BEST_PICK_POINTS = 500;

// ─────────────────────────────────────────────
//  업로드 기본 포인트 하루 1회 상한 체크
//  (같은 유저가 같은 날 여러 장 올려도 기본 100P는 최초 1회만 지급)
// ─────────────────────────────────────────────
const hasReceivedUploadPointsToday = async (userNickname) => {
    const todayStr = getKSTDateStr();

    if (isSupabaseEnabled()) {
        const startUtc = new Date(`${todayStr}T00:00:00+09:00`).toISOString();
        const endUtc = new Date(`${todayStr}T23:59:59.999+09:00`).toISOString();
        const { data, error } = await supabase
            .from('certification_posts')
            .select('id')
            .eq('user_nickname', userNickname)
            .gte('created_at', startUtc)
            .lte('created_at', endUtc)
            .limit(1);
        if (error) {
            console.error('[hasReceivedUploadPointsToday] error:', error);
            return false;
        }
        return (data || []).length > 0;
    }

    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    const posts = raw ? JSON.parse(raw) : [];
    return posts.some(p => p.user_nickname === userNickname && getKSTDateStr(new Date(p.created_at)) === todayStr);
};

// ─────────────────────────────────────────────
//  통합 포인트(im-core-auth) 지급
//  MOCA users 테이블은 nickname만 들고 있으므로 master_user_id를 조회해 전달
// ─────────────────────────────────────────────
const grantIntegratedPoints = async (userNickname, amount, description) => {
    if (!isSupabaseEnabled() || !userNickname) return;
    const { data, error } = await supabase
        .from('users')
        .select('master_user_id')
        .or(`nickname.eq.${userNickname},name.eq.${userNickname}`)
        .maybeSingle();

    if (error || !data?.master_user_id) {
        console.warn(`[grantIntegratedPoints] master_user_id 없음, 포인트 지급 건너뜀: ${userNickname}`);
        return;
    }

    try {
        await rewardPoints({ masterUserId: data.master_user_id, amount, description });
    } catch (err) {
        console.error('[grantIntegratedPoints] 지급 실패:', err);
    }
};

// ─────────────────────────────────────────────
//  이미지 압축 (Canvas 기반, 실패 시 원본 반환)
// ─────────────────────────────────────────────
export const compressImage = (file, { maxWidth = 1280, maxHeight = 1280, quality = 0.8 } = {}) => {
    return new Promise((resolve) => {
        if (!(file instanceof Blob)) {
            resolve(file);
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            resolve(file);
                            return;
                        }
                        const compressedFile = new File([blob], file.name || 'image.jpg', {
                            type: file.type || 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    file.type || 'image/jpeg',
                    quality
                );
            };
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
};

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
//  이미지 URL 파싱 헬퍼 (하위 호환)
// ─────────────────────────────────────────────
export const parseImageUrls = (imageUrlField) => {
    if (!imageUrlField) return [];

    // 이미 배열인 경우 (Supabase jsonb 등)
    if (Array.isArray(imageUrlField)) {
        return imageUrlField.flat(Infinity).filter(item => typeof item === 'string' && item.trim() !== '');
    }

    if (typeof imageUrlField === 'string') {
        const trimmed = imageUrlField.trim();
        if (!trimmed) return [];

        // JSON 배열 문자열인 경우
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.flat(Infinity).filter(item => typeof item === 'string' && item.trim() !== '');
                }
            } catch { /* fall through */ }
        }
        return [trimmed];
    }
    return [];
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

export const createCertPost = async ({ userNickname, activityType, tagLabel, caption, imageFiles, isMarketingAgreed }) => {
    // imageFiles: 배열 (다중 이미지) 또는 단일 File (하위 호환)
    const files = Array.isArray(imageFiles) ? imageFiles : (imageFiles ? [imageFiles] : []);
    const uploadedUrls = [];

    for (const file of files) {
        let processedFile = file;
        try {
            if (file && file.type && file.type.startsWith('image/')) {
                processedFile = await compressImage(file);
            }
        } catch (compressErr) {
            console.warn('이미지 압축 실패, 원본 업로드 진행:', compressErr);
        }

        const { url, error: uploadError } = await uploadCertImage(processedFile);
        if (uploadError) {
            // 업로드 실패 시 base64로 fallback (localStorage용)
            const base64 = await fileToBase64(processedFile);
            uploadedUrls.push(base64);
        } else {
            uploadedUrls.push(url);
        }
    }

    // 다중이면 JSON 배열 문자열, 단일이면 일반 URL 문자열
    const imageUrlValue = uploadedUrls.length > 1
        ? JSON.stringify(uploadedUrls)
        : (uploadedUrls[0] || null);

    const newPost = {
        id: crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}`,
        user_nickname: userNickname,
        activity_type: activityType,
        tag_label: tagLabel || '',
        caption: caption || '',
        image_url: imageUrlValue,
        is_marketing_agreed: isMarketingAgreed || false,
        likes_count: 0,
        created_at: new Date().toISOString(),
    };

    const alreadyRewardedToday = await hasReceivedUploadPointsToday(userNickname);

    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('certification_posts')
            .insert([{
                user_nickname: newPost.user_nickname,
                activity_type: newPost.activity_type,
                tag_label: newPost.tag_label,
                caption: newPost.caption,
                image_url: imageUrlValue,
                is_marketing_agreed: newPost.is_marketing_agreed,
                likes_count: 0,
            }])
            .select()
            .single();

        if (!error && data) {
            // 모카그램 포스트 작성 기본 포인트 지급 (아임모델 공화국 통합 포인트 연동, 하루 1회 상한)
            if (!alreadyRewardedToday) {
                grantIntegratedPoints(userNickname, UPLOAD_POINTS, '모카그램 포스트 작성 기본 보상');
            }
            return { post: data, error: null };
        }
        console.error('createCertPost error:', error);
    }

    // localStorage fallback
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    const posts = raw ? JSON.parse(raw) : [];
    posts.unshift(newPost);
    localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
    if (!alreadyRewardedToday) {
        grantIntegratedPoints(userNickname, UPLOAD_POINTS, '모카그램 포스트 작성 기본 보상');
    }
    return { post: newPost, error: null };
};

export const updateCertPost = async (postId, { activityType, tagLabel, caption }) => {
    const updates = {
        activity_type: activityType,
        tag_label: tagLabel || '',
        caption: caption || '',
    };

    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('certification_posts')
            .update(updates)
            .eq('id', postId)
            .select()
            .single();
        if (!error && data) return { post: data, error: null };
        console.error('updateCertPost error:', error);
        return { post: null, error };
    }

    // localStorage fallback
    const raw = localStorage.getItem(LOCAL_POSTS_KEY);
    const posts = raw ? JSON.parse(raw) : [];
    const idx = posts.findIndex(p => p.id === postId);
    if (idx > -1) {
        posts[idx] = { ...posts[idx], ...updates };
        localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
        return { post: posts[idx], error: null };
    }
    return { post: null, error: new Error('게시물을 찾을 수 없습니다') };
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

/**
 * 모카베스트 PICK 지정/해제. 지정 시(isPick=true) 500P 통합 포인트 보너스 지급.
 */
export const setMarketingPick = async (postId, isPick, userNickname, pickNote = '') => {
    if (isSupabaseEnabled()) {
        const { error } = await supabase
            .from('certification_posts')
            .update({ is_marketing_pick: isPick, pick_note: pickNote })
            .eq('id', postId);
        if (error) {
            console.error('setMarketingPick error:', error);
            return;
        }
    } else {
        // localStorage fallback
        const raw = localStorage.getItem(LOCAL_POSTS_KEY);
        if (raw) {
            const posts = JSON.parse(raw).map(p => p.id === postId ? { ...p, is_marketing_pick: isPick, pick_note: pickNote } : p);
            localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
        }
    }

    if (isPick && userNickname) {
        grantIntegratedPoints(userNickname, BEST_PICK_POINTS, '모카베스트 PICK 선정 보너스');
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
