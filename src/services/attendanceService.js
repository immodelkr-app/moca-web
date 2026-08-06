/**
 * attendanceService.js
 * 출석체크 + 모카그램 업로드 기반 "참석쿠폰" 서비스
 *
 * 규칙: 하루 출석체크 + 모카그램 업로드를 모두 한 날 = "유효 출석일"
 *       유효 출석일 누적 30일 도달 시 어드민이 확인 후 쿠폰 수동 발급
 */
import { supabase, isSupabaseEnabled } from './supabaseClient';

export const COUPON_GOAL_DAYS = 30;

// ─────────────────────────────────────────────
//  날짜 유틸 (한국 시간 기준 YYYY-MM-DD)
// ─────────────────────────────────────────────
const KST_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

export const getKSTDateStr = (date = new Date()) => KST_FORMATTER.format(date);

// ─────────────────────────────────────────────
//  출석체크
// ─────────────────────────────────────────────

/**
 * 오늘 이미 출석체크를 했는지 확인
 */
export const hasCheckedToday = async (userId) => {
    if (!isSupabaseEnabled() || !userId) return false;
    const today = getKSTDateStr();
    const { data, error } = await supabase
        .from('attendance_checks')
        .select('id')
        .eq('user_id', userId)
        .eq('check_date', today)
        .maybeSingle();
    if (error) {
        console.error('[hasCheckedToday] error:', error);
        return false;
    }
    return !!data;
};

/**
 * 출석체크 기록 (하루 1회, 중복 시 무시)
 */
export const submitAttendanceCheck = async (userId, userNickname) => {
    if (!isSupabaseEnabled() || !userId) return { error: new Error('로그인이 필요합니다') };
    const today = getKSTDateStr();
    const { error } = await supabase
        .from('attendance_checks')
        .upsert(
            [{ user_id: userId, user_nickname: userNickname, check_date: today }],
            { onConflict: 'user_id,check_date', ignoreDuplicates: true }
        );
    if (error) console.error('[submitAttendanceCheck] error:', error);
    return { error };
};

// ─────────────────────────────────────────────
//  진행률 (유효 출석일 / 30)
// ─────────────────────────────────────────────

/**
 * 특정 유저의 출석체크 날짜 Set 조회
 */
const fetchCheckDates = async (userId) => {
    const { data, error } = await supabase
        .from('attendance_checks')
        .select('check_date')
        .eq('user_id', userId);
    if (error) {
        console.error('[fetchCheckDates] error:', error);
        return new Set();
    }
    return new Set((data || []).map(r => r.check_date));
};

/**
 * 특정 유저(닉네임)의 모카그램 업로드 날짜 Set 조회
 */
const fetchCertDates = async (userNickname) => {
    const { data, error } = await supabase
        .from('certification_posts')
        .select('created_at')
        .eq('user_nickname', userNickname);
    if (error) {
        console.error('[fetchCertDates] error:', error);
        return new Set();
    }
    return new Set((data || []).map(r => getKSTDateStr(new Date(r.created_at))));
};

/**
 * 유저의 출석 진행 상황 계산
 * validDays: 누적 유효 출석일(전체 기간)
 * progress: 현재 사이클(마지막 쿠폰 발급 이후) 누적 유효 출석일
 * remaining: 다음 쿠폰까지 남은 일수
 */
export const fetchAttendanceProgress = async (userId, userNickname) => {
    if (!isSupabaseEnabled() || !userId || !userNickname) {
        return { validDays: 0, issuedCount: 0, progress: 0, remaining: COUPON_GOAL_DAYS, eligible: false, checkedToday: false, uploadedToday: false };
    }

    const [checkDates, certDates, couponsRes] = await Promise.all([
        fetchCheckDates(userId),
        fetchCertDates(userNickname),
        supabase.from('attendance_coupons').select('id').eq('user_id', userId),
    ]);

    let validDays = 0;
    checkDates.forEach(d => { if (certDates.has(d)) validDays += 1; });

    const issuedCount = couponsRes.data?.length || 0;
    const consumed = issuedCount * COUPON_GOAL_DAYS;
    const progress = Math.max(0, validDays - consumed);
    const remaining = Math.max(0, COUPON_GOAL_DAYS - progress);

    const today = getKSTDateStr();

    return {
        validDays,
        issuedCount,
        progress,
        remaining,
        eligible: progress >= COUPON_GOAL_DAYS,
        checkedToday: checkDates.has(today),
        uploadedToday: certDates.has(today),
    };
};

// ─────────────────────────────────────────────
//  내 쿠폰
// ─────────────────────────────────────────────

export const fetchMyCoupons = async (userId) => {
    if (!isSupabaseEnabled() || !userId) return [];
    const { data, error } = await supabase
        .from('attendance_coupons')
        .select('*')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });
    if (error) {
        console.error('[fetchMyCoupons] error:', error);
        return [];
    }
    return data || [];
};

export const fetchMyUnusedCoupons = async (userId) => {
    const coupons = await fetchMyCoupons(userId);
    return coupons.filter(c => c.status === 'unused');
};

// ─────────────────────────────────────────────
//  클래스 신청 시 쿠폰 사용
// ─────────────────────────────────────────────

/**
 * 특정 클래스의 쿠폰 신청 인원(취소 제외) 조회 - 쿠폰 T/O 마감 체크용
 */
export const fetchClassCouponUsageCount = async (classId) => {
    if (!isSupabaseEnabled()) return 0;
    const { count, error } = await supabase
        .from('class_applications')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('is_coupon_applied', true)
        .neq('approval_status', 'cancelled');
    if (error) {
        console.error('[fetchClassCouponUsageCount] error:', error);
        return 0;
    }
    return count || 0;
};

/**
 * 쿠폰 사용 처리 (클래스 신청과 함께 호출)
 */
export const markCouponUsed = async (couponId, classId) => {
    if (!isSupabaseEnabled() || !couponId) return { error: new Error('쿠폰 정보가 없습니다') };
    const { error } = await supabase
        .from('attendance_coupons')
        .update({ status: 'used', used_at: new Date().toISOString(), used_class_id: classId })
        .eq('id', couponId)
        .eq('status', 'unused'); // 이미 사용된 쿠폰 재사용 방지
    if (error) console.error('[markCouponUsed] error:', error);
    return { error };
};

// ─────────────────────────────────────────────
//  어드민: 30일 도달자 조회 및 쿠폰 발급
// ─────────────────────────────────────────────

/**
 * 전체 모델 유저의 출석 진행률을 계산해 30일 도달자(발급 대상)를 반환
 */
export const fetchAttendanceCandidates = async () => {
    if (!isSupabaseEnabled()) return { data: [], error: null };

    const [usersRes, checksRes, couponsRes] = await Promise.all([
        supabase.from('users').select('id, nickname, name, phone, grade, user_type').eq('user_type', 'model'),
        supabase.from('attendance_checks').select('user_id, check_date'),
        supabase.from('attendance_coupons').select('user_id'),
    ]);

    if (usersRes.error) return { data: [], error: usersRes.error };

    const users = usersRes.data || [];
    const nicknames = users.map(u => u.nickname).filter(Boolean);

    const { data: certPosts, error: certErr } = nicknames.length > 0
        ? await supabase.from('certification_posts').select('user_nickname, created_at').in('user_nickname', nicknames)
        : { data: [], error: null };
    if (certErr) return { data: [], error: certErr };

    // 유저별 출석일 Set
    const checksByUser = {};
    (checksRes.data || []).forEach(r => {
        if (!checksByUser[r.user_id]) checksByUser[r.user_id] = new Set();
        checksByUser[r.user_id].add(r.check_date);
    });

    // 유저(닉네임)별 업로드일 Set
    const certsByNickname = {};
    (certPosts || []).forEach(r => {
        if (!certsByNickname[r.user_nickname]) certsByNickname[r.user_nickname] = new Set();
        certsByNickname[r.user_nickname].add(getKSTDateStr(new Date(r.created_at)));
    });

    // 유저별 발급된 쿠폰 수
    const issuedCountByUser = {};
    (couponsRes.data || []).forEach(r => {
        issuedCountByUser[r.user_id] = (issuedCountByUser[r.user_id] || 0) + 1;
    });

    const candidates = users.map(u => {
        const checkDates = checksByUser[u.id] || new Set();
        const certDates = certsByNickname[u.nickname] || new Set();
        let validDays = 0;
        checkDates.forEach(d => { if (certDates.has(d)) validDays += 1; });
        const issuedCount = issuedCountByUser[u.id] || 0;
        const progress = Math.max(0, validDays - issuedCount * COUPON_GOAL_DAYS);
        return { ...u, validDays, issuedCount, progress };
    }).filter(c => c.progress >= COUPON_GOAL_DAYS)
      .sort((a, b) => b.progress - a.progress);

    return { data: candidates, error: null };
};

/**
 * 쿠폰 발급 (어드민)
 */
export const issueCoupon = async (userId, userNickname, issuedBy = '') => {
    if (!isSupabaseEnabled() || !userId) return { error: new Error('유저 정보가 없습니다') };
    const { data, error } = await supabase
        .from('attendance_coupons')
        .insert([{ user_id: userId, user_nickname: userNickname, status: 'unused', issued_by: issuedBy }])
        .select()
        .single();
    if (error) console.error('[issueCoupon] error:', error);
    return { data, error };
};

/**
 * 전체 쿠폰 발급/사용 이력 (어드민)
 */
export const fetchAllCoupons = async () => {
    if (!isSupabaseEnabled()) return { data: [], error: null };
    const { data, error } = await supabase
        .from('attendance_coupons')
        .select('*, classes:used_class_id (title)')
        .order('issued_at', { ascending: false });
    if (error) console.error('[fetchAllCoupons] error:', error);
    return { data: data || [], error };
};
