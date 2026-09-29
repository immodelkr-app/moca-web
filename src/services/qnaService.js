/**
 * qnaService.js
 * Q&A 게시판 Supabase CRUD 서비스
 *
 * 비공개(is_locked) 글은 테이블 직접 조회가 막혀 있고 RPC로만 접근한다.
 * (supabase/migrations/20260929_01_qna_private_posts.sql 참고)
 * - 사용자: 로컬 세션의 nickname + password_hash로 작성자 본인 여부를 서버가 판정
 * - 관리자: 관리자 비밀번호를 adminKey로 전달
 */
import { supabase } from './supabaseClient';
import { notifyAdmin } from './solapiService';
import { getUser } from './userService';

// 카테고리 상수
export const QNA_CATEGORIES = [
    { value: 'app', label: '모카 이용문의', icon: 'phone_in_talk', color: '#3B82F6', bg: '#EFF6FF' },
    { value: 'model_activity', label: '광고모델 활동', icon: 'campaign', color: '#9333EA', bg: '#F3E8FF' },
    { value: 'other', label: '기타문의', icon: 'help', color: '#6B7280', bg: '#F9FAFB' },
];

export const getCategoryInfo = (value) =>
    QNA_CATEGORIES.find(c => c.value === value) || QNA_CATEGORIES[2];

// 작성자 본인 확인용 자격 정보 (로그인 안 했으면 null → 비공개글은 모두 가려짐)
const getOwnerCredentials = () => {
    const user = getUser();
    return {
        p_nickname: user?.nickname || null,
        p_password_hash: user?.password_hash || null,
    };
};

/**
 * Q&A 게시글 전체 목록 조회 (카테고리 필터 가능)
 * 비공개글은 작성자가 아니면 title/user_name이 null, is_hidden=true로 내려온다.
 * @param {string|null} category - 'app' | 'model_activity' | 'other' | null(전체)
 */
export const fetchQnaPosts = async (category = null) => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.rpc('qna_list', {
            p_category: category,
            ...getOwnerCredentials(),
        });
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
        const { data, error } = await supabase.rpc('qna_get', {
            p_id: id,
            ...getOwnerCredentials(),
        });
        if (error) throw error;
        return data?.[0] || null;
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
        // 비공개글은 작성 직후에도 테이블 SELECT가 막혀 있어 .select()로 되돌려받지 않는다
        const { error } = await supabase
            .from('qna_posts')
            .insert([{
                user_id: postData.user_id || '',
                user_name: postData.user_name || '익명',
                category: postData.category || 'other',
                title: postData.title,
                content: postData.content,
                is_locked: postData.is_locked || false,
            }]);

        if (error) throw error;
        notifyAdmin(`[모카] 게시판 질문 등록: ${postData.user_name || '익명'} - ${postData.title}`);
        return { success: true };
    } catch (e) {
        console.error('[qnaService] createQnaPost 오류:', e);
        return { error: e.message };
    }
};

/**
 * Q&A 게시글 삭제 (작성자 본인)
 * @param {string} id
 */
export const deleteQnaPost = async (id) => {
    if (!supabase) return { error: 'Supabase 미설정' };
    try {
        const { data, error } = await supabase.rpc('qna_delete_own', {
            p_id: id,
            ...getOwnerCredentials(),
        });
        if (error) throw error;
        if (!data) return { error: '본인 글만 삭제할 수 있습니다.' };
        return { success: true };
    } catch (e) {
        console.error('[qnaService] deleteQnaPost 오류:', e);
        return { error: e.message };
    }
};

/**
 * 관리자: Q&A 전체 목록 조회 (비공개 포함)
 * @param {string} adminKey - 관리자 비밀번호
 */
export const fetchAllQnaPostsForAdmin = async (adminKey) => {
    if (!supabase) return [];
    try {
        const { data, error } = await supabase.rpc('qna_admin_list', { p_admin_key: adminKey });
        if (error) throw error;
        return data || [];
    } catch (e) {
        console.error('[qnaService] fetchAllQnaPostsForAdmin 오류:', e);
        return [];
    }
};

/**
 * 관리자: Q&A 답변 등록/수정/삭제(reply=null)
 * @param {string} adminKey - 관리자 비밀번호
 * @param {string} id - 게시글 ID
 * @param {string|null} reply - 답변 내용
 */
export const updateAdminReply = async (adminKey, id, reply) => {
    if (!supabase) return { error: 'Supabase 미설정' };
    try {
        const { data, error } = await supabase.rpc('qna_admin_reply', {
            p_admin_key: adminKey,
            p_id: id,
            p_reply: reply || '',
        });
        if (error) throw error;
        if (!data?.[0]) return { error: '게시글을 찾을 수 없습니다.' };
        return { data: data[0] };
    } catch (e) {
        console.error('[qnaService] updateAdminReply 오류:', e);
        return { error: e.message };
    }
};

/**
 * 관리자: Q&A 게시글 삭제
 * @param {string} adminKey - 관리자 비밀번호
 * @param {string} id
 */
export const deleteQnaPostAsAdmin = async (adminKey, id) => {
    if (!supabase) return { error: 'Supabase 미설정' };
    try {
        const { data, error } = await supabase.rpc('qna_admin_delete', { p_admin_key: adminKey, p_id: id });
        if (error) throw error;
        if (!data) return { error: '게시글을 찾을 수 없습니다.' };
        return { success: true };
    } catch (e) {
        console.error('[qnaService] deleteQnaPostAsAdmin 오류:', e);
        return { error: e.message };
    }
};
