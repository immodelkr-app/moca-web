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
export const createClass = async (classData, pricingData) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };

    // 1. 클래스 마스터 정보 저장
    const { data: newClass, error: classError } = await supabase
        .from('classes')
        .insert([{
            title: classData.title,
            description: classData.description,
            class_date: classData.class_date,
            location: classData.location,
            capacity: classData.capacity,
            image_url: classData.image_url || null
        }])
        .select()
        .single();

    if (classError) return { error: classError };

    // 2. 등급별 가격 정보 저장
    const pricingToInsert = Object.entries(pricingData).map(([grade, price]) => ({
        class_id: newClass.id,
        grade: grade,
        price: parseInt(price, 10) || 0
    }));

    const { error: pricingError } = await supabase
        .from('class_pricing')
        .insert(pricingToInsert);

    return { data: newClass, error: pricingError };
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
            user_grade: applicationData.userGrade,
            applied_price: applicationData.appliedPrice,
            payment_type: applicationData.paymentType || 'transfer', // 'transfer' | 'card'
            payment_status: applicationData.paymentType === 'card' ? 'pending_card' : 'pending'
        }])
        .select()
        .single();
    return { data, error };
};
