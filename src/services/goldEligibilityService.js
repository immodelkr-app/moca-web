import { supabase, isSupabaseEnabled } from './supabaseClient';
import { saveUser } from './userService';
import { logGradeChange } from './adminService';

/**
 * GOLD 등급 자동 승급 조건
 * - 모카그램 댓글 3개 이상 (실제 승급 게이트)
 * 프로필 필수항목/게시글 업로드는 게이트에서는 빠졌지만,
 * 이미 완료한 기록을 보여주기 위해 참고용으로 계속 조회한다.
 */
const REQUIRED_PROFILE_FIELDS = ['name', 'gender', 'age', 'height', 'weight', 'shoe_size'];
const REQUIRED_COMMENT_COUNT = 3;
const REQUIRED_POST_COUNT = 1;
const AUTO_UPGRADE_MONTHS = 6;
const GOLD_TIER_GRADES = ['GOLD', 'IMODEL', 'VIP'];

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

/** GOLD 등급 조건 충족 여부 + 항목별 상태 조회 (DB 변경 없는 순수 조회) */
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

/** 조건을 이미 충족한 실버 회원을 GOLD로 자동 승급시킨다 (신청서/승인 절차 없음) */
const autoUpgradeToGold = async (user) => {
    if (!isSupabaseEnabled() || !user) return false;
    const currentGrade = user.grade === 'BASIC' ? 'SILVER' : (user.grade || 'SILVER');
    if (GOLD_TIER_GRADES.includes(currentGrade)) return false;

    const userNickname = user.nickname || user.name;
    if (!userNickname) return false;

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + AUTO_UPGRADE_MONTHS);

    const { error } = await supabase
        .from('users')
        .update({ grade: 'GOLD', grade_expires_at: expiresAt.toISOString() })
        .eq('nickname', userNickname);

    if (error) {
        console.error('[goldEligibilityService] autoUpgradeToGold error:', error);
        return false;
    }

    logGradeChange({
        userId: user.id,
        userNickname,
        memberName: user.name,
        fromGrade: currentGrade,
        toGrade: 'GOLD',
        source: 'auto_comment_mission',
        months: AUTO_UPGRADE_MONTHS,
    }).catch((err) => console.error('[goldEligibilityService] logGradeChange 실패:', err));

    saveUser({ ...user, grade: 'GOLD', grade_expires_at: expiresAt.toISOString() });

    return true;
};

/**
 * GOLD 조건을 조회하고, 충족 상태면 즉시 자동 승급까지 처리한다.
 * 승급이 발생하면 upgraded: true를 반환하므로 호출부에서 새로고침 등으로
 * 최신 등급을 반영해주면 된다 (승급 축하 모달은 GradeCelebrationModal이 자동 노출).
 */
export const checkGoldEligibilityWithAutoUpgrade = async (user) => {
    const eligibility = await getGoldEligibility(user);
    let upgraded = false;
    if (eligibility.allComplete) {
        upgraded = await autoUpgradeToGold(user);
    }
    return { eligibility, upgraded };
};
