import { supabase } from './supabaseClient';

// --- Partners ---
export const fetchPartners = async () => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    const { data, error } = await supabase.from('partners').select('*').order('created_at', { ascending: false });
    return { data: data || [], error };
};

export const addPartner = async (partnerData) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase.from('partners').insert([partnerData]).select();
    return { data, error };
};

export const updatePartner = async (id, updates) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase.from('partners').update(updates).eq('id', id).select();
    return { data, error };
};

export const deletePartner = async (id) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.from('partners').delete().eq('id', id);
    return { error };
};

export const uploadPartnerImage = async (file) => {
    if (!supabase) return { url: null, error: new Error('Supabase not configured') };
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_partner_${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `partners/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('moca_assets')
            .upload(filePath, file);

        if (uploadError) return { url: null, error: uploadError };

        const { data: publicUrlData } = supabase.storage
            .from('moca_assets')
            .getPublicUrl(filePath);

        return { url: publicUrlData.publicUrl, error: null };
    } catch (err) {
        return { url: null, error: err };
    }
};

// --- Partner Visits Tracking (멤버카드 전용) ---
export const verifyPartnerPin = async (pinCode) => {
    if (!supabase) return { partner: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('pin_code', pinCode)
        .single();

    if (error || !data) return { partner: null, error: error || new Error('존재하지 않는 제휴사 인증코드입니다.') };

    return { partner: data, error: null };
};

export const recordPartnerVisit = async (userNickname, partnerId) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase.from('partner_visits').insert([{
        user_nickname: userNickname,
        partner_id: partnerId,
        visited_at: new Date().toISOString()
    }]).select();
    return { data, error };
};

export const fetchPartnerVisits = async () => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('partner_visits')
        .select('*')
        .order('visited_at', { ascending: false });
    return { data: data || [], error };
};

// --- Coupons ---
export const fetchCoupons = async () => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    return { data: data || [], error };
};

export const addCoupon = async (couponData) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase.from('coupons').insert([couponData]).select();
    return { data, error };
};

export const updateCoupon = async (id, updates) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase.from('coupons').update(updates).eq('id', id).select();
    return { data, error };
};

export const deleteCoupon = async (id) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    return { error };
};

// --- User Coupons (Usage tracking) ---
export const fetchUserCoupons = async (userNickname) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('user_coupons')
        .select('*')
        .eq('user_nickname', userNickname);
    return { data: data || [], error };
};

export const recordUsedCoupon = async (userNickname, couponId) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase.from('user_coupons').insert([{
        user_nickname: userNickname,
        coupon_id: couponId,
        is_used: true,
        used_at: new Date().toISOString()
    }]).select();
    return { data, error };
};

// --- Coupon PIN Verification (회원 직접 사용) ---
// pin_code로 쿠폰을 찾고, 회원 등급이 사용 가능한지 확인
export const verifyCouponPin = async (pinCode, userGrade) => {
    if (!supabase) return { coupon: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('pin_code', pinCode)
        .single();

    if (error || !data) return { coupon: null, error: error || new Error('존재하지 않는 쿠폰 코드입니다.') };

    // 등급 체크: ALL이면 누구나, 아니면 등급 일치 확인
    const isGradeOk = data.target_grade === 'ALL' || data.target_grade === userGrade;
    if (!isGradeOk) return { coupon: null, error: new Error(`이 쿠폰은 ${data.target_grade} 등급 전용입니다.`) };

    return { coupon: data, error: null };
};

// 쿠폰 사용 내역 기록 (user_coupons 테이블)
export const recordCouponUsage = async (userNickname, couponId) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase.from('user_coupons').insert([{
        user_nickname: userNickname,
        coupon_id: couponId,
        is_used: true,
        used_at: new Date().toISOString()
    }]).select();
    return { data, error };
};

// 회원의 사용 가능한 쿠폰 목록 (등급 기준)
export const fetchCouponsByGrade = async (userGrade) => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .or(`target_grade.eq.ALL,target_grade.eq.${userGrade}`)
        .order('created_at', { ascending: false });
    return { data: data || [], error };
};

// ── 전속모델 계약서 관리 ──────────────────────────────────────────────────────

/**
 * 계약서 서명 데이터를 DB에 저장합니다.
 * Supabase에 'exclusive_contracts' 테이블이 필요합니다.
 * 컬럼: id, member_name, member_id_num, member_address, member_phone,
 *       start_date, end_date, fee, sign_date, signature_image (text/base64),
 *       status ('pending' | 'approved'), created_at
 */
export const saveContract = async (contractData) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const payload = {
        member_name: contractData.memberName,
        member_id_num: contractData.memberIdNum,
        member_address: contractData.memberAddress,
        member_phone: contractData.memberPhone,
        start_date: `${contractData.startYear}-${String(contractData.startMonth).padStart(2, '0')}-${String(contractData.startDay).padStart(2, '0')}`,
        end_date: `${contractData.endYear}-${String(contractData.endMonth).padStart(2, '0')}-${String(contractData.endDay).padStart(2, '0')}`,
        fee: contractData.fee,
        sign_date: `${contractData.signYear}-${String(contractData.signMonth).padStart(2, '0')}-${String(contractData.signDay).padStart(2, '0')}`,
        signature_image: contractData.signature, // base64 data URL
        status: 'pending',
        created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('exclusive_contracts').insert([payload]).select();
    return { data, error };
};

/**
 * 모든 계약서 목록을 조회합니다. (어드민 전용)
 */
export const fetchContracts = async () => {
    if (!supabase) return { data: [], error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('exclusive_contracts')
        .select('*')
        .order('created_at', { ascending: false });
    return { data: data || [], error };
};

/**
 * 계약서를 승인(approved)으로 변경 & 해당 회원의 등급을 VIP로 업그레이드합니다.
 */
export const approveContract = async (contractId, memberPhone) => {
    if (!supabase) return { error: new Error('Supabase not configured') };

    // 1. 계약서 상태를 'approved'로 업데이트
    const { error: contractError } = await supabase
        .from('exclusive_contracts')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', contractId);

    if (contractError) return { error: contractError };

    // 2. 해당 모델의 등급을 VIP로 승급 (전화번호로 회원 식별)
    // 전화번호 포맷 유연화 (하이픈 제거 버전과 원본 모두 시도)
    const cleanedPhone = memberPhone.replace(/-/g, '').trim();
    const formattedPhone = cleanedPhone.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3');

    // Supabase .or() 필터 사용 (전화번호가 01012345678 또는 010-1234-5678 또는 원본과 일치하는 경우)
    const { error: gradeError } = await supabase
        .from('users')
        .update({ grade: 'VIP' })
        .or(`phone.eq.${cleanedPhone},phone.eq.${formattedPhone},phone.eq.${memberPhone}`);

    return { error: gradeError };
};

/**
 * 계약서를 반려(rejected) 처리합니다.
 */
export const rejectContract = async (contractId) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase
        .from('exclusive_contracts')
        .update({ status: 'rejected' })
        .eq('id', contractId);
    return { error };
};

/**
 * 계약서를 리스트에서 삭제합니다.
 */
export const deleteContract = async (contractId) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { error } = await supabase
        .from('exclusive_contracts')
        .delete()
        .eq('id', contractId);
    return { error };
};

// ── 멤버십 등업 신청 관리 ──────────────────────────────────────────────────────

/**
 * 멤버십 등업 신청 데이터를 DB에 저장합니다.
 */
export const saveUpgradeRequest = async (requestData) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    
    // contractData 형식을 참조
    const payload = {
        user_nickname: requestData.userNickname,
        member_name: requestData.memberName,
        member_phone: requestData.memberPhone,
        plan_months: requestData.planMonths,
        price: requestData.price,
        signature_image: requestData.signature, // base64 data URL
        status: 'pending',
        created_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase.from('upgrade_requests').insert([payload]).select();
    return { data, error };
};
