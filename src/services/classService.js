/**
 * classService.js
 * MOCA 클래스 관리 및 신청 관련 서비스
 */
import { supabase, isSupabaseEnabled } from './supabaseClient';
import { sendAlimtalk } from './solapiService';

// ────────────────────────────────────────────────────────
// 📣 클래스 신청 완료 알림톡 발송 템플릿
// 솔라피 심사 버전: 하단 templateCode 를 실제 발급된 코드로 교체하세요
// ────────────────────────────────────────────────────────

/**
 * 관리자가 입금 확인(승인) 시 해당 신청자에게 클래스 확정 알림톡 발송
 * @param {Object} params
 * @param {string} params.userName   수신자 이름 (name || nickname)
 * @param {string} params.phone      수신자 전화번호 (하이픈 제거)
 * @param {string} params.classTitle 클래스 제목
 * @param {string} params.classDate  클래스 날짜/시간 문자열
 * @param {string} params.location   장소
 */
export const sendClassApplicationNotification = async ({ userName, phone, classTitle, classDate, location }) => {
    if (!phone) return;

    // ✅ 카카오 알림톡 실제 발급 정보
    const TEMPLATE_ID  = 'KA01TP260329111909235Roqjyd7DMUl';
    const CHANNEL_ID   = 'KA01PF260309085923456gdN56tP4xVG';

    const message =
`안녕하세요 ${userName}님,
모두의 캐스팅 매니저, 아임모카(IM MOCA)입니다.
신청하신 모카 클래스 참가가 아래와 같이 확정되었습니다. 🎉
■ 클래스명: ${classTitle}
■ 일시: ${classDate}
■ 장소: ${location}
당일 10분 전까지 입실 부탁드립니다.
`;

    return sendAlimtalk(TEMPLATE_ID, [{
        phone: phone.replace(/-/g, ''),
        name: userName,
        message,
        templateId: TEMPLATE_ID,
        pfId: CHANNEL_ID,
        variables: {
            '이름':     userName,
            '클래스명': classTitle,
            '일시':     classDate,
            '장소':     location,
        },
        button: {
            button: [
                {
                    name: '클래스일정 확인하기',
                    linkType: 'WL',
                    linkTypeName: '웹링크',
                    linkM: 'https://immoca.kr/home/calendar',
                    linkP: 'https://immoca.kr/home/calendar',
                }
            ]
        }
    }]);
};


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
            image_url: classData.image_url || null,
            schedule_type: classData.schedule_type || 'one_time',
            class_date: classData.class_date, // 텍스트 형태 (4월 2일 1:30 등)
            start_date: classData.start_date || null,
            end_date: classData.end_date || null,
            day_of_week: classData.day_of_week || null, // [1, 3, 5] 등 배열
            start_time: classData.start_time || null,
            target_grade: classData.target_grade || 'ALL',
            price_info: classData.price_info || null
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
            image_url: classData.image_url || null,
            schedule_type: classData.schedule_type || 'one_time',
            class_date: classData.class_date,
            start_date: classData.start_date || null,
            end_date: classData.end_date || null,
            day_of_week: classData.day_of_week || null,
            start_time: classData.start_time || null,
            target_grade: classData.target_grade || 'ALL',
            price_info: classData.price_info || null
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



// 클래스 신청 (멤버용)
export const applyForClass = async (applicationData) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('class_applications')
        .insert([{
            class_id: applicationData.classId,
            user_id: applicationData.userId,
            grade_label: applicationData.userGrade, // record grade label at time of entry
            applied_price: applicationData.appliedPrice,
            payment_type: applicationData.paymentType || 'transfer', // 'transfer' | 'card'
            payment_status: applicationData.paymentType === 'card' ? 'pending_card' : 'pending'
        }])
        .select()
        .single();
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
