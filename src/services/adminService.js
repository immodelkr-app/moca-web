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
