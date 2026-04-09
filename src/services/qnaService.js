/**
 * qnaService.js
 * Q&A 게시판 Supabase CRUD 서비스
 */
import { supabase } from './supabaseClient';

// 카테고리 상수
export const QNA_CATEGORIES = [
    { value: 'app', label: '앱 이용문의', icon: 'phone_in_talk', color: '#3B82F6', bg: '#EFF6FF' },
    { value: 'model_activity', label: '광고모델 활동', icon: 'campaign', color: '#9333EA', bg: '#F3E8FF' },
    { value: 'other', label: '기타문의', icon: 'help', color: '#6B7280', bg: '#F9FAFB' },
];

export const getCategoryInfo = (value) =>
    QNA_CATEGORIES.find(c => c.value === value) || QNA_CATEGORIES[2];

/**
 * Q&A 게시글 전체 목록 조회 (카테고리 필터 가능)
 * @param {string|null} category - 'app' | 'model_activity' | 'other' | null(전체)
 */
export const fetchQnaPosts = async (category = null) => {
    if (!supabase) return [];
    try {
        let query = supabase
            .from('qna_posts')
            .select('id, user_id, user_name, category, title, is_locked, admin_reply, replied_at, created_at')
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('[qnaService] fetchQnaPosts 오류:', e);
        return [];
    }
};

/**
 * Q&A 게시글 상세 조회 (내용 포함)
 * @param {string} id
 */
export const fetchQnaPost = async (id) => {
    if (!supabase) return null;
    try {
        const { data, error } = await supabase
            .from('qna_posts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (e) {
        console.error('[qnaService] fetchQnaPost 오류:', e);
        return null;
    }
};

/**
 * Q&A 게시글 작성
 * @param {Object} postData - { user_id, user_name, category, title, content, is_locked }
 */
export const createQnaPost = async (postData) => {
    if (!supabase) return { error: 'Supabase 미설정' };
    try {
        const { data, error } = await supabase
            .from('qna_posts')
            .insert([{
                user_id: postData.user_id || '',
                user_name: postData.user_name || '익명',
                category: postData.category || 'other',
                title: postData.title,
                content: postData.content,
                is_locked: postData.is_locked || false,
            }])
            .select()
            .single();

        if (error) throw error;
        return { data };
    } catch (e) {
        console.error('[qnaService] createQnaPost 오류:', e);
        return { error: e.message };
    }
};

/**
 * Q&A 게시글 삭제
 * @param {string} id
 */
export const deleteQnaPost = async (id) => {
    if (!supabase) return { error: 'Supabase 미설정' };
    try {
        const { error } = await supabase
            .from('qna_posts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.error('[qnaService] deleteQnaPost 오류:', e);
        return { error: e.message };
    }
};

/**
 * 관리자: Q&A 전체 목록 조회 (잠금 포함)
 */
export const fetchAllQnaPostsForAdmin = async () => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase
            .from('qna_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('[qnaService] fetchAllQnaPostsForAdmin 오류:', e);
        return [];
    }
};

/**
 * 관리자: Q&A 답변 등록/수정
 * @param {string} id - 게시글 ID
 * @param {string} reply - 답변 내용
 */
export const updateAdminReply = async (id, reply) => {
    if (!supabase) return { error: 'Supabase 미설정' };
    try {
        const { data, error } = await supabase
            .from('qna_posts')
            .update({
                admin_reply: reply,
                replied_at: reply ? new Date().toISOString() : null,
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { data };
    } catch (e) {
        console.error('[qnaService] updateAdminReply 오류:', e);
        return { error: e.message };
    }
};
