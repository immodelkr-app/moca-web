/**
 * companyService.js
 * 업체(구인자) 계정 관련 - 가입, 사업자등록증 첨부, 인증 상태 조회
 */
import { supabase } from './supabaseClient';

/**
 * 사업자등록증 파일을 Storage에 업로드하고 공개 URL 반환
 * @param {File} file
 * @param {string} userId
 * @returns {Promise<{url: string|null, error: Error|null}>}
 */
export const uploadBusinessCert = async (file, userId) => {
    if (!supabase) return { url: null, error: new Error('Supabase not configured') };
    try {
        const ext = file.name.split('.').pop();
        const filePath = `business-certs/${userId}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('moca_assets')
            .upload(filePath, file);

        if (uploadError) return { url: null, error: uploadError };

        const { data } = supabase.storage.from('moca_assets').getPublicUrl(filePath);
        return { url: data.publicUrl, error: null };
    } catch (err) {
        return { url: null, error: err };
    }
};

/**
 * 게시글에 첨부하는 소개자료(PPT 등)를 Storage에 업로드
 * @param {File} file
 * @param {string} companyId
 * @returns {Promise<{url: string|null, error: Error|null}>}
 */
export const uploadCastingAttachment = async (file, companyId) => {
    if (!supabase) return { url: null, error: new Error('Supabase not configured') };
    try {
        const ext = file.name.split('.').pop();
        const filePath = `casting-attachments/${companyId}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('moca_assets')
            .upload(filePath, file);

        if (uploadError) return { url: null, error: uploadError };

        const { data } = supabase.storage.from('moca_assets').getPublicUrl(filePath);
        return { url: data.publicUrl, error: null };
    } catch (err) {
        return { url: null, error: err };
    }
};

/**
 * 업체 회원가입 - users.user_type='company' 로 세팅 후 companies 부가정보 등록
 * @param {Object} params
 * @param {string} params.userId - public.users.id (auth 가입 완료 후)
 * @param {string} params.companyName
 * @param {string} [params.businessNumber] - 사업자등록번호. 소속확인형(verificationType='affiliation')은 없을 수 있음
 * @param {string} params.companyAddress
 * @param {string} [params.companyAddressDetail]
 * @param {string} params.companyPhone
 * @param {string} params.contactName
 * @param {string} params.contactPhone
 * @param {'business'|'affiliation'} [params.verificationType] - 'business'(사업자등록증) | 'affiliation'(방송작가 등 소속확인서류)
 * @param {string} params.businessCertUrl - uploadBusinessCert() 결과 url (사업자등록증 또는 소속확인서류)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const registerCompany = async ({
    userId,
    companyName,
    businessNumber,
    companyAddress,
    companyAddressDetail,
    companyPhone,
    contactName,
    contactPhone,
    verificationType = 'business',
    businessCertUrl,
}) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };

    const { error: userTypeError } = await supabase
        .from('users')
        .update({ user_type: 'company' })
        .eq('id', userId);

    if (userTypeError) return { data: null, error: userTypeError };

    const { data, error } = await supabase
        .from('companies')
        .insert([{
            user_id: userId,
            company_name: companyName,
            business_number: businessNumber || null,
            verification_type: verificationType,
            company_address: companyAddress,
            company_address_detail: companyAddressDetail || null,
            company_phone: companyPhone,
            contact_name: contactName,
            contact_phone: contactPhone,
            business_cert_url: businessCertUrl,
            verification_status: 'pending',
        }])
        .select()
        .single();

    return { data, error };
};

/**
 * 로그인한 업체 계정의 companies 행 조회
 * @param {string} userId
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getCompanyByUserId = async (userId) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    return { data, error };
};
