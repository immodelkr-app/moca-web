/**
 * currentPhotosService.js
 * 모델 현재모습 사진 업로드/조회/관리
 * Supabase Storage(moca_assets 버킷) + model_current_photos 테이블 사용
 */
import { supabase, isSupabaseEnabled } from './supabaseClient';

const BUCKET = 'moca_assets';
const FOLDER = 'current-photos';

/**
 * 현재모습 사진 업로드
 * @param {File} file
 * @param {Object} user - { id, nickname, name }
 * @returns {Promise<{url: string|null, error: string|null}>}
 */
export const uploadCurrentPhoto = async (file, user) => {
    if (!isSupabaseEnabled()) return { url: null, error: 'Supabase 미설정' };

    const ext = file.name.split('.').pop();
    const path = `${FOLDER}/${user.id || user.nickname}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });

    if (uploadError) return { url: null, error: uploadError.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = data.publicUrl;

    // DB에 메타데이터 저장
    const { error: dbError } = await supabase
        .from('model_current_photos')
        .insert([{
            user_id: user.id || null,
            user_nickname: user.nickname || '',
            user_name: user.name || user.nickname || '',
            photo_url: publicUrl,
            storage_path: path,
            status: 'pending',
        }]);

    if (dbError) {
        console.warn('[uploadCurrentPhoto] DB 저장 실패:', dbError.message);
    }

    return { url: publicUrl, error: null };
};

/**
 * 특정 유저의 현재모습 사진 목록 조회
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export const fetchUserCurrentPhotos = async (userId, nickname) => {
    if (!isSupabaseEnabled()) return [];

    let query = supabase
        .from('model_current_photos')
        .select('*')
        .order('created_at', { ascending: false });

    if (userId) {
        query = query.eq('user_id', userId);
    } else if (nickname) {
        query = query.eq('user_nickname', nickname);
    } else {
        return [];
    }

    const { data, error } = await query;

    if (error) {
        console.warn('[fetchUserCurrentPhotos] 조회 실패:', error.message);
        return [];
    }
    return data || [];
};

/**
 * 사진 삭제 (스토리지 + DB)
 * @param {string} photoId - DB row id
 * @param {string} storagePath - 스토리지 경로
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export const deleteCurrentPhoto = async (photoId, storagePath) => {
    if (!isSupabaseEnabled()) return { success: false, error: 'Supabase 미설정' };

    // 스토리지 삭제
    if (storagePath) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
    }

    // DB 삭제
    const { error } = await supabase
        .from('model_current_photos')
        .delete()
        .eq('id', photoId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
};

/**
 * 관리자: 전체 모델 사진 목록 조회
 * @returns {Promise<Array>}
 */
export const fetchAllCurrentPhotos = async () => {
    if (!isSupabaseEnabled()) return [];

    const { data, error } = await supabase
        .from('model_current_photos')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('[fetchAllCurrentPhotos] 조회 실패:', error.message);
        return [];
    }
    return data || [];
};

/**
 * 관리자: 사진 상태 변경
 * @param {string} photoId
 * @param {'pending'|'approved'|'needs_more'} status
 * @returns {Promise<{success: boolean}>}
 */
export const updatePhotoStatus = async (photoId, status) => {
    if (!isSupabaseEnabled()) return { success: false };

    const { error } = await supabase
        .from('model_current_photos')
        .update({ status })
        .eq('id', photoId);

    return { success: !error };
};
