import { supabase, isSupabaseEnabled } from './supabaseClient';

/**
 * GOLD 등급 신청 최소 활동 조건
 * - 모카그램 댓글 3개 이상 (실제 승인 게이트)
 * 프로필 필수항목/게시글 업로드는 게이트에서는 빠졌지만,
 * 이미 완료한 기록을 보여주기 위해 참고용으로 계속 조회한다.
 */
const REQUIRED_PROFILE_FIELDS = ['name', 'gender', 'age', 'height', 'weight', 'shoe_size'];
const REQUIRED_COMMENT_COUNT = 3;
const REQUIRED_POST_COUNT = 1;

export const isProfileComplete = (user) => {
    if (!user) return false;
    return REQUIRED_PROFILE_FIELDS.every((field) => {
        const value = user[field];
        return value !== null && value !== undefined && String(value).trim() !== '';
    });
};

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

    const [commentCount, postCount] = await Promise.all([
        countRows('certification_comments', userNickname),
        countRows('certification_posts', userNickname),
    ]);

    const commentComplete = commentCount >= REQUIRED_COMMENT_COUNT;
    const profileComplete = isProfileComplete(user);
    const postComplete = postCount >= REQUIRED_POST_COUNT;

    return {
        commentCount,
        commentComplete,
        requiredCommentCount: REQUIRED_COMMENT_COUNT,
        profileComplete,
        postCount,
        postComplete,
        requiredPostCount: REQUIRED_POST_COUNT,
        allComplete: commentComplete,
    };
};
