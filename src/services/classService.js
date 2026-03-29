/**
 * classService.js
 * MOCA 클래스 관리 및 신청 관련 서비스
 */
import { supabase, isSupabaseEnabled } from './supabaseClient';
import { sendAlimtalk } from './aligoService';

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
 * @param {number} params.paidPrice  최종 결제 금액
 */
export const sendClassApplicationNotification = async ({ userName, phone, classTitle, classDate, location, paidPrice }) => {
    if (!phone) return;

    // ⚠️ 솔라피에 심사 신청한 템플릿 코드로 교체 필요
    const TEMPLATE_CODE = 'KA01TP_CLASS_CONFIRM'; // TODO: 실제 발급 코드로 교체

    const message =
`안녕하세요 ${userName}님,
모두의 캐스팅 매니저, 아임모카(IM MOCA)입니다.

신청하신 모카 클래스 참가가 아래와 같이 확정되었습니다. 🎉

■ 클래스명: ${classTitle}
■ 일시: ${classDate}
■ 장소: ${location}
■ 결제 금액: ${paidPrice.toLocaleString()}원

당일 10분 전까지 입실 부탁드립니다.

아임모카와 함께하는 뜻깊은 시간이 되길 바랍니다. ✨`;

    return sendAlimtalk(TEMPLATE_CODE, [{
        phone: phone.replace(/-/g, ''),
        name: userName,
        message,
        variables: {
            '이름':     userName,
            '클래스명': classTitle,
            '일시':     classDate,
            '장소':     location,
            '결제금액': `${paidPrice.toLocaleString()}원`,
        },
        button: {
            button: [
                {
                    name: '클래스 확인하기',
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
            start_time: classData.start_time || null
        }])
        .select()
        .single();

    if (classError) return { error: classError };

    // 2. 등급별 가격 정보 저장
    // pricingArray: [{ grade_label: 'SILVER', price: 50000 }, ...]
    const pricingToInsert = pricingArray.map(p => ({
        class_id: newClass.id,
        grade_label: p.grade_label,
        price: parseInt(p.price, 10) || 0
    }));

    const { error: pricingError } = await supabase
        .from('class_pricing')
        .insert(pricingToInsert);

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
            start_time: classData.start_time || null
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

// 결제 상태 업데이트 (어드민 수동 입금 확인용)
export const updatePaymentStatus = async (applicationId, status) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { error } = await supabase
        .from('class_applications')
        .update({ payment_status: status })
        .eq('id', applicationId);
    return { error };
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

/**
 * 클래스 결제 승인 확인 (토스페이먼츠)
 * Supabase Edge Function 'toss-confirm'을 호출하여 결제 검증 및 상태 업데이트
 */
export const confirmClassPayment = async ({ paymentKey, orderId, amount, applicationId }) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };

    // 1. 토스 결제 승인 호출
    const { data: confirmData, error: confirmError } = await supabase.functions.invoke('toss-confirm', {
        body: { paymentKey, orderId, amount }
    });

    if (confirmError || confirmData?.error) {
        return { error: confirmError || confirmData?.error };
    }

    // 2. 클래스 신청 상태 업데이트
    const { error: updateError } = await supabase
        .from('class_applications')
        .update({ payment_status: 'paid' })
        .eq('id', applicationId);

    return { data: confirmData, error: updateError };
};
