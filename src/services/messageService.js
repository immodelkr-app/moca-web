import { supabase, isSupabaseEnabled } from './supabaseClient';

const LOCAL_ANNOUNCEMENT_KEY = 'moca_local_messages_demo';
const LOCAL_COMMENTS_KEY = 'moca_local_comments_demo';

// --- Messages (Announcements) ---
export const fetchMessagesList = async () => {
    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('moca_announcements')
            .select('id, title, content, created_at, image_url, link_url')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
        return data;
    } else {
        const raw = localStorage.getItem(LOCAL_ANNOUNCEMENT_KEY);
        if (raw) return JSON.parse(raw);
        return [
            { id: 1, title: '[안내] 3월 오프라인 특강 스케줄', created_at: new Date().toISOString() }
        ];
    }
};

export const fetchMessageDetail = async (id) => {
    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('moca_announcements')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching message detail:', error);
            return null;
        }
        return data;
    } else {
        const raw = localStorage.getItem(LOCAL_ANNOUNCEMENT_KEY);
        if (raw) {
            const list = JSON.parse(raw);
            return list.find(m => m.id === Number(id)) || null;
        }
        return { id: 1, title: '[안내] 3월 오프라인 특강 스케줄', content: '특강 내용입니다.', created_at: new Date().toISOString() };
    }
};

// Helper to convert File to Data URL (guarantees image display even if Supabase Storage fails/blocks)
const fileToDataUrl = (file) => {
    return new Promise((resolve) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result || null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
    });
};

export const createAnnouncementMessage = async (title, content, imageFile, linkUrl = null) => {
    let image_url = null;

    if (isSupabaseEnabled()) {
        if (imageFile) {
            try {
                const fileExt = imageFile.name ? imageFile.name.split('.').pop() : 'jpg';
                const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
                const filePath = `messages/${fileName}`;

                const uploadBody = await fileToBlob(imageFile);

                const { error: uploadError } = await supabase.storage
                    .from('moca_assets')
                    .upload(filePath, uploadBody, {
                        contentType: imageFile.type || 'image/jpeg',
                        upsert: true,
                    });

                if (!uploadError) {
                    const { data: publicUrlData } = supabase.storage
                        .from('moca_assets')
                        .getPublicUrl(filePath);
                    image_url = publicUrlData?.publicUrl || null;
                } else {
                    console.warn('Storage upload error, falling back to Data URL:', uploadError);
                }
            } catch (err) {
                console.warn('Storage exception, falling back to Data URL:', err);
            }

            // Storage 업로드에 실패해도 Data URL로 사진 첨부 보장
            if (!image_url) {
                image_url = await fileToDataUrl(imageFile);
            }
        }

        // image_url 컬럼이 없는 경우를 대비해 이미지가 없으면 제외
        const insertData = { title, content };
        if (image_url) insertData.image_url = image_url;
        if (linkUrl) insertData.link_url = linkUrl;

        const { error } = await supabase
            .from('moca_announcements')
            .insert([insertData]);

        if (error) throw error;
    } else {
        // Local storage demo fallback
        const raw = localStorage.getItem(LOCAL_ANNOUNCEMENT_KEY);
        const list = raw ? JSON.parse(raw) : [];
        let localImg = null;
        if (imageFile) localImg = await fileToDataUrl(imageFile);
        list.push({ id: Date.now(), title, content, image_url: localImg, created_at: new Date().toISOString() });
        localStorage.setItem(LOCAL_ANNOUNCEMENT_KEY, JSON.stringify(list));
    }
};

export const updateMessage = async (id, title, content, linkUrl = null, imageFile = null, removeImage = false) => {
    if (isSupabaseEnabled()) {
        const updateData = { title, content, link_url: linkUrl || null };

        if (removeImage) {
            updateData.image_url = null;
        } else if (imageFile) {
            let image_url = null;
            try {
                const fileExt = imageFile.name ? imageFile.name.split('.').pop() : 'jpg';
                const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
                const filePath = `messages/${fileName}`;

                const uploadBody = await fileToBlob(imageFile);

                const { error: uploadError } = await supabase.storage
                    .from('moca_assets')
                    .upload(filePath, uploadBody, {
                        contentType: imageFile.type || 'image/jpeg',
                        upsert: true,
                    });

                if (!uploadError) {
                    const { data: publicUrlData } = supabase.storage
                        .from('moca_assets')
                        .getPublicUrl(filePath);
                    image_url = publicUrlData?.publicUrl || null;
                }
            } catch (err) {
                console.warn('Storage error on update, falling back to Data URL:', err);
            }

            if (!image_url) {
                image_url = await fileToDataUrl(imageFile);
            }

            if (image_url) {
                updateData.image_url = image_url;
            }
        }

        const { error } = await supabase
            .from('moca_announcements')
            .update(updateData)
            .eq('id', id);
        if (error) throw error;
    } else {
        const raw = localStorage.getItem(LOCAL_ANNOUNCEMENT_KEY);
        const list = raw ? JSON.parse(raw) : [];
        let localImg = null;
        if (imageFile) localImg = await fileToDataUrl(imageFile);
        const updated = list.map(m => {
            if (m.id === id) {
                const item = { ...m, title, content, link_url: linkUrl || null };
                if (removeImage) item.image_url = null;
                else if (localImg) item.image_url = localImg;
                return item;
            }
            return m;
        });
        localStorage.setItem(LOCAL_ANNOUNCEMENT_KEY, JSON.stringify(updated));
    }
};

export const deleteMessage = async (id) => {
    if (isSupabaseEnabled()) {
        const { error } = await supabase
            .from('moca_announcements')
            .delete()
            .eq('id', id);
        if (error) throw error;
    } else {
        const raw = localStorage.getItem(LOCAL_ANNOUNCEMENT_KEY);
        const list = raw ? JSON.parse(raw) : [];
        localStorage.setItem(LOCAL_ANNOUNCEMENT_KEY, JSON.stringify(list.filter(m => m.id !== id)));
    }
};

// --- Comments ---
export const fetchComments = async (announcementId) => {
    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('moca_comments')
            .select('*')
            .eq('announcement_id', announcementId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
            return [];
        }
        return data;
    } else {
        const raw = localStorage.getItem(LOCAL_COMMENTS_KEY);
        if (raw) {
            const list = JSON.parse(raw);
            return list.filter(c => c.announcement_id === Number(announcementId));
        }
        return [];
    }
};

export const postComment = async (announcementId, userNickname, commentText) => {
    const newComment = {
        announcement_id: announcementId,
        user_nickname: userNickname,
        comment: commentText,
        created_at: new Date().toISOString()
    };

    if (isSupabaseEnabled()) {
        const { error } = await supabase
            .from('moca_comments')
            .insert([newComment]);

        if (error) throw error;
    } else {
        const raw = localStorage.getItem(LOCAL_COMMENTS_KEY);
        const list = raw ? JSON.parse(raw) : [];
        list.push({ ...newComment, id: Date.now() });
        localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(list));
    }
};
