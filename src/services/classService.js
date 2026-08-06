/**
 * classService.js
 * MOCA 클래스 관리 및 신청 관련 서비스
 */
import { supabase, isSupabaseEnabled } from './supabaseClient';

// 클래스 목록 가져오기
export const fetchClasses = async () => {
    if (!isSupabaseEnabled()) return { data: [], error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('classes')
        .select(`
            *,
            class_pricing (*)
        `)
        .order('created_at', { ascending: false });
    return { data, error };
};

// 클래스 생성
export const createClass = async (classData, pricingArray) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };

    // 1. 클래스 마스터 정보 저장
    const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert([{
            title: classData.title,
            description: classData.description,
            location: classData.location,
            capacity: parseInt(classData.capacity, 10) || 20,
            coupon_capacity: parseInt(classData.coupon_capacity, 10) || 0,
            image_url: classData.image_url || null,
            schedule_type: classData.schedule_type || 'one_time',
            class_date: classData.class_date, // 텍스트 형태 (4월 2일 1:30 등)
            event_datetime: classData.event_datetime || null, // 구조화된 날짜/시간 (TIMESTAMPTZ)
            start_date: classData.start_date || null,
            end_date: classData.end_date || null,
            day_of_week: classData.day_of_week || null, // [1, 3, 5] 등 배열
            start_time: classData.start_time || null,
            target_grade: classData.target_grade || 'ALL',
            price_info: classData.price_info || null,
            review_message: classData.review_message || null
        }])
        .select()
        .single();

    if (classError) return { error: classError };

    // 2. 등급별 가격 정보 저장
    // pricingArray: [{ grade_label: 'SILVER', price: 50000 }, ...]
    let pricingError = null;
    if (pricingArray && pricingArray.length > 0) {
        const pricingToInsert = pricingArray.map(p => ({
            class_id: newClass.id,
            grade_label: p.grade_label,
            price: parseInt(p.price, 10) || 0
        }));

        const { error } = await supabase
            .from('class_pricing')
            .insert(pricingToInsert);
        pricingError = error;
    }

    return { data: newClass, error: pricingError };
};

// 클래스 수정
export const updateClass = async (classId, classData, pricingArray) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };

    // 1. 클래스 마스터 정보 수정
    const { data: updatedClass, error: classError } = await supabase
        .from('classes')
        .update({
            title: classData.title,
            description: classData.description,
            location: classData.location,
            capacity: parseInt(classData.capacity, 10) || 20,
            coupon_capacity: parseInt(classData.coupon_capacity, 10) || 0,
            image_url: classData.image_url || null,
            schedule_type: classData.schedule_type || 'one_time',
            class_date: classData.class_date,
            event_datetime: classData.event_datetime || null,
            start_date: classData.start_date || null,
            end_date: classData.end_date || null,
            day_of_week: classData.day_of_week || null,
            start_time: classData.start_time || null,
            target_grade: classData.target_grade || 'ALL',
            price_info: classData.price_info || null,
            review_message: classData.review_message || null
        })
        .eq('id', classId)
        .select()
        .single();

    if (classError) return { error: classError };

    // 2. 기존 클래스 가격 삭제 후 다시 등록
    const { error: deletePricingError } = await supabase
        .from('class_pricing')
        .delete()
        .eq('class_id', classId);

    if (!deletePricingError && pricingArray && pricingArray.length > 0) {
        const pricingToInsert = pricingArray.map(p => ({
            class_id: classId,
            grade_label: p.grade_label,
            price: parseInt(p.price, 10) || 0
        }));

        const { error: insertPricingError } = await supabase
            .from('class_pricing')
            .insert(pricingToInsert);
        
        return { data: updatedClass, error: insertPricingError };
    }

    return { data: updatedClass, error: deletePricingError };
};

// 클래스 삭제
export const deleteClass = async (classId) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', classId);
    return { error };
};

// 클래스별 활성 신청자 수 (취소 제외) - 목록 페이지 정원마감 뱃지용
export const fetchActiveApplicationCounts = async () => {
    if (!isSupabaseEnabled()) return { data: {}, error: null };
    const { data, error } = await supabase
        .from('class_applications')
        .select('class_id')
        .neq('approval_status', 'cancelled');
    if (error) return { data: {}, error };

    const counts = {};
    (data || []).forEach(a => { counts[a.class_id] = (counts[a.class_id] || 0) + 1; });
    return { data: counts, error: null };
};

// 특정 클래스의 활성 신청자 수 (취소 제외) - 상세 페이지 정원마감 체크용
export const fetchActiveApplicationCount = async (classId) => {
    if (!isSupabaseEnabled()) return { count: 0, error: null };
    const { count, error } = await supabase
        .from('class_applications')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', classId)
        .neq('approval_status', 'cancelled');
    return { count: count || 0, error };
};

// 신청자 목록 가져오기 (특정 클래스)
export const fetchApplications = async (classId) => {
    if (!isSupabaseEnabled()) return { data: [], error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('class_applications')
        .select(`
            *,
            users (nickname, name, phone, grade)
        `)
        .eq('class_id', classId)
        .order('created_at', { ascending: false });
    return { data, error };
};

// 모든 신청자 목록 가져오기 (어드민용 종합)
export const fetchAllApplications = async () => {
    if (!isSupabaseEnabled()) return { data: [], error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('class_applications')
        .select(`
            *,
            classes (title),
            users (nickname, name, phone, grade)
        `)
        .order('created_at', { ascending: false });
    return { data, error };
};

// ──────────────────────────────────────────────
// 📅 클래스 캘린더 이벤트 (모카앱 캘린더 연동)
// ──────────────────────────────────────────────

/**
 * 클래스 신청 완료 시 모카 캘린더에 이벤트 저장
 * class_date 예시: "2026-04-15" or "4월 15일(토) 14:00"
 */
export const saveClassCalendarEvent = async ({ userId, classId, title, classDate, location, description }) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };

    // class_date에서 YYYY-MM-DD 파싱 시도
    let parsedDate = classDate;
    // 이미 YYYY-MM-DD 형식이면 그대로, 아니면 텍스트로 저장
    const isoMatch = classDate?.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) parsedDate = isoMatch[0];

    const { data, error } = await supabase
        .from('class_calendar_events')
        .upsert([{
            user_id: userId,
            class_id: classId,
            title,
            class_date: parsedDate,
            location,
            description,
        }], { onConflict: 'user_id,class_id' })
        .select()
        .single();

    return { data, error };
};

/**
 * 현재 로그인 유저의 클래스 캘린더 이벤트 전체 조회
 */
export const fetchClassCalendarEvents = async (userId) => {
    if (!isSupabaseEnabled()) return { data: [], error: null };
    const { data, error } = await supabase
        .from('class_calendar_events')
        .select('*')
        .eq('user_id', userId)
        .order('class_date', { ascending: true });
    return { data: data || [], error };
};

/**
 * 특정 클래스 캘린더 이벤트 삭제
 */
export const deleteClassCalendarEvent = async (userId, classId) => {
    if (!isSupabaseEnabled()) return { error: null };
    const { error } = await supabase
        .from('class_calendar_events')
        .delete()
        .eq('user_id', userId)
        .eq('class_id', classId);
    return { error };
};




// ──────────────────────────────────────────────
// ✅ 클래스 완료 관리
// ──────────────────────────────────────────────

export const completeClass = async (classId) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('classes')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', classId)
        .select()
        .single();
    return { data, error };
};

export const reopenClass = async (classId) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('classes')
        .update({ status: 'active', completed_at: null })
        .eq('id', classId)
        .select()
        .single();
    return { data, error };
};

export const fetchPaidApplicants = async (classId) => {
    if (!isSupabaseEnabled()) return { data: [], error: null };
    const { data, error } = await supabase
        .from('class_applications')
        .select('*, users(id, name, nickname, phone, grade)')
        .eq('class_id', classId)
        .eq('approval_status', 'paid')
        .order('paid_at', { ascending: false });
    return { data: data || [], error };
};

export const recordThankYouSent = async (classId) => {
    if (!isSupabaseEnabled()) return { error: null };
    const { error } = await supabase
        .from('classes')
        .update({ thank_you_sent_at: new Date().toISOString() })
        .eq('id', classId);
    return { error };
};


// ──────────────────────────────────────────────
// 💬 클래스 피드백
// ──────────────────────────────────────────────

export const fetchClassFeedback = async (classId) => {
    if (!isSupabaseEnabled()) return { data: [], error: null };
    const { data, error } = await supabase
        .from('class_feedback')
        .select('*, users(name, nickname, grade)')
        .eq('class_id', classId)
        .order('created_at', { ascending: false });
    return { data: data || [], error };
};

export const fetchPublicFeedback = async (classId) => {
    if (!isSupabaseEnabled()) return { data: [], error: null };
    const { data, error } = await supabase
        .from('class_feedback')
        .select('*, users(name, nickname, grade)')
        .eq('class_id', classId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });
    return { data: data || [], error };
};

export const fetchUserFeedback = async (classId, userId) => {
    if (!isSupabaseEnabled()) return { data: null, error: null };
    const { data, error } = await supabase
        .from('class_feedback')
        .select('*')
        .eq('class_id', classId)
        .eq('user_id', userId)
        .maybeSingle();
    return { data, error };
};

export const submitFeedback = async ({ classId, userId, rating, comment, imageUrl }) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('class_feedback')
        .upsert([{
            class_id: classId,
            user_id: userId,
            rating,
            comment: comment || null,
            image_url: imageUrl || null,
            updated_at: new Date().toISOString(),
        }], { onConflict: 'class_id,user_id' })
        .select()
        .single();
    return { data, error };
};

export const uploadFeedbackImage = async (file) => {
    if (!isSupabaseEnabled()) return { url: null, error: 'Supabase not connected' };
    const ext = file.name.split('.').pop();
    const fileName = `feedback_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
        .from('class-images')
        .upload(fileName, file, { upsert: true, contentType: file.type });
    if (uploadErr) return { url: null, error: uploadErr };
    const { data } = supabase.storage.from('class-images').getPublicUrl(fileName);
    return { url: data.publicUrl, error: null };
};

export const updateFeedbackVisibility = async (feedbackId, isVisible) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { error } = await supabase
        .from('class_feedback')
        .update({ is_visible: isVisible, updated_at: new Date().toISOString() })
        .eq('id', feedbackId);
    return { error };
};

export const replyToFeedback = async (feedbackId, reply) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { error } = await supabase
        .from('class_feedback')
        .update({
            admin_reply: reply,
            admin_replied_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', feedbackId);
    return { error };
};

export const deleteFeedback = async (feedbackId) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { error } = await supabase
        .from('class_feedback')
        .delete()
        .eq('id', feedbackId);
    return { error };
};


// ──────────────────────────────────────────────
// 📩 후기 미작성자 조회 및 재알림 발송
// ──────────────────────────────────────────────

/**
 * 수강확정(paid) 참석자 중 후기 미작성자 조회
 * @param {string} classId
 * @returns {{ data: Array, error: any }}
 */
export const getClassNonReviewers = async (classId) => {
    if (!isSupabaseEnabled()) return { data: [], error: null };

    // 1. 수강확정(paid) 참석자
    const { data: attendees, error: attErr } = await supabase
        .from('class_applications')
        .select('user_id, user_phone, users(id, name, nickname, phone, grade)')
        .eq('class_id', classId)
        .eq('approval_status', 'paid');
    if (attErr) return { data: [], error: attErr };

    // 2. 이미 후기 작성한 사용자
    const { data: reviewers, error: revErr } = await supabase
        .from('class_feedback')
        .select('user_id')
        .eq('class_id', classId);
    if (revErr) return { data: [], error: revErr };

    const reviewerIds = new Set((reviewers || []).map(r => r.user_id));

    // 3. 미작성자 필터링
    const nonReviewers = (attendees || []).filter(a => !reviewerIds.has(a.user_id));
    return { data: nonReviewers, error: null };
};


// ──────────────────────────────────────────────
// 📊 클래스 통계
// ──────────────────────────────────────────────

export const fetchClassStats = async (classId) => {
    if (!isSupabaseEnabled()) return { data: null, error: null };

    const [appsResult, feedbackResult] = await Promise.all([
        supabase
            .from('class_applications')
            .select('approval_status, applied_price, grade_label, users(grade)')
            .eq('class_id', classId),
        supabase
            .from('class_feedback')
            .select('rating')
            .eq('class_id', classId),
    ]);

    const apps = appsResult.data || [];
    const feedbacks = feedbackResult.data || [];

    const totalApplicants = apps.length;
    const confirmedCount = apps.filter(a => a.approval_status === 'paid').length;
    const cancelledCount = apps.filter(a => a.approval_status === 'cancelled').length;
    const pendingCount = apps.filter(a => a.approval_status === 'pending').length;
    const approvedCount = apps.filter(a => a.approval_status === 'approved').length;
    const totalRevenue = apps
        .filter(a => a.approval_status === 'paid')
        .reduce((sum, a) => sum + (a.applied_price || 0), 0);

    const feedbackCount = feedbacks.length;
    const avgRating = feedbackCount > 0
        ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbackCount).toFixed(1)
        : null;

    const gradeBreakdown = {};
    apps.forEach(a => {
        let g = '🥈 SILVER';
        const currentGrade = a.users?.grade;
        if (currentGrade) {
            if (currentGrade === 'SILVER') g = '🥈 SILVER';
            else if (currentGrade === 'GOLD') g = '🌟 GOLD';
            else if (currentGrade === 'IMODEL') g = '🌸 아임모델';
            else if (currentGrade === 'VIP') g = '👑 전속모델';
        } else {
            g = a.grade_label || '🥈 SILVER';
        }
        gradeBreakdown[g] = (gradeBreakdown[g] || 0) + 1;
    });

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach(f => { ratingDistribution[f.rating] = (ratingDistribution[f.rating] || 0) + 1; });

    return {
        data: {
            totalApplicants,
            confirmedCount,
            cancelledCount,
            pendingCount,
            approvedCount,
            totalRevenue,
            feedbackCount,
            avgRating,
            gradeBreakdown,
            ratingDistribution,
        },
        error: appsResult.error || feedbackResult.error,
    };
};
