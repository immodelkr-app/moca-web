import { supabase, isSupabaseEnabled } from './supabaseClient';

/**
 * GOLD 등급 신청 최소 활동 조건
 * - 모카그램 댓글 3개 이상
 */
const REQUIRED_COMMENT_COUNT = 3;

const countRows = async (table, userNickname) => {
    if (!isSupabaseEnabled() || !userNickname) return 0;
    const { count, error } = await supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('user_nickname', userNickname);
    if (error) {
        console.error(`[goldEligibilityService] ${table} count error:`, error);
        return 0;
    }
    return count || 0;
};

/** GOLD 등급 신청 가능 여부 + 항목별 충족 상태 조회 */
export const getGoldEligibility = async (user) => {
    const userNickname = user?.nickname || user?.name;

    const commentCount = await countRows('certification_comments', userNickname);
    const commentComplete = commentCount >= REQUIRED_COMMENT_COUNT;

    return {
        commentCount,
        commentComplete,
        requiredCommentCount: REQUIRED_COMMENT_COUNT,
        allComplete: commentComplete,
    };
};
