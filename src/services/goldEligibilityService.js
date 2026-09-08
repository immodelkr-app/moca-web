import { supabase, isSupabaseEnabled } from './supabaseClient';

/**
 * GOLD 등급 신청 최소 활동 조건
 * - 스마트프로필 필수 항목(포트폴리오 링크 제외) 전체 기재
 * - 김대표퀴즈 1회 이상 참여
 * - 모카그램 게시글 1개 이상 (카테고리 무관)
 * - 모카그램 댓글 3개 이상
 */
const REQUIRED_PROFILE_FIELDS = ['name', 'gender', 'age', 'height', 'weight', 'shoe_size'];
const REQUIRED_POST_COUNT = 1;
const REQUIRED_COMMENT_COUNT = 3;

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

const hasQuizParticipation = async (userNickname) => {
    if (!isSupabaseEnabled() || !userNickname) return false;
    const { count, error } = await supabase
        .from('quiz_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('user_nickname', userNickname);
    if (error) {
        console.error('[goldEligibilityService] quiz_submissions count error:', error);
        return false;
    }
    return (count || 0) > 0;
};

/** GOLD 등급 신청 가능 여부 + 항목별 충족 상태 조회 */
export const getGoldEligibility = async (user) => {
    const userNickname = user?.nickname || user?.name;

    const [postCount, commentCount, quizParticipated] = await Promise.all([
        countRows('certification_posts', userNickname),
        countRows('certification_comments', userNickname),
        hasQuizParticipation(userNickname),
    ]);

    const profileComplete = isProfileComplete(user);
    const postComplete = postCount >= REQUIRED_POST_COUNT;
    const commentComplete = commentCount >= REQUIRED_COMMENT_COUNT;

    return {
        profileComplete,
        quizParticipated,
        postCount,
        postComplete,
        commentCount,
        commentComplete,
        requiredPostCount: REQUIRED_POST_COUNT,
        requiredCommentCount: REQUIRED_COMMENT_COUNT,
        allComplete: profileComplete && quizParticipated && postComplete && commentComplete,
    };
};
