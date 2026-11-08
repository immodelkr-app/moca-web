import { supabase } from './supabaseClient';

export const fetchPublicProfiles = async ({ gender = '', sort = 'recent' } = {}) => {
    const { data, error } = await supabase.rpc('list_public_profiles', { p_gender: gender || null, p_sort: sort });
    if (error) { console.warn('[fetchPublicProfiles]', error.message); return []; }
    return data || [];
};

export const fetchPublicProfileDetail = async (id) => {
    const { data, error } = await supabase.rpc('get_public_profile_detail', { p_id: id });
    if (error) { console.warn('[fetchPublicProfileDetail]', error.message); return null; }
    return data;
};

export const fetchMyPublicProfile = async (userId) => {
    const { data, error } = await supabase.rpc('get_my_public_profile', { p_user_id: userId });
    if (error) { console.warn('[fetchMyPublicProfile]', error.message); return null; }
    return data?.[0] || null;
};

export const saveMyPublicProfile = async (userId, fields) => {
    const { error } = await supabase.from('model_public_profiles')
        .upsert({ user_id: userId, ...fields, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    return error ? error.message : null;
};
