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

export const postMessage = async (title, content, imageFile, linkUrl = null) => {
    let image_url = null;

    if (isSupabaseEnabled()) {
        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
            const filePath = `messages/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('moca_assets')
                .upload(filePath, imageFile);

            if (uploadError) {
                console.error('Upload Error:', uploadError);
                throw new Error('이미지 업로드에 실패했습니다. (Storage 설정 확인 필요)');
            }

            const { data: publicUrlData } = supabase.storage
                .from('moca_assets')
                .getPublicUrl(filePath);

            image_url = publicUrlData.publicUrl;
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
        list.push({ id: Date.now(), title, content, image_url: null, created_at: new Date().toISOString() });
        localStorage.setItem(LOCAL_ANNOUNCEMENT_KEY, JSON.stringify(list));
    }
};

export const updateMessage = async (id, title, content, linkUrl = null, imageFile = null) => {
    if (isSupabaseEnabled()) {
        const updateData = { title, content, link_url: linkUrl || null };

        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
            const filePath = `messages/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('moca_assets')
                .upload(filePath, imageFile);

            if (uploadError) throw new Error('이미지 업로드에 실패했습니다.');

            const { data: publicUrlData } = supabase.storage
                .from('moca_assets')
                .getPublicUrl(filePath);

            updateData.image_url = publicUrlData.publicUrl;
        }

        const { error } = await supabase
            .from('moca_announcements')
            .update(updateData)
            .eq('id', id);
        if (error) throw error;
    } else {
        const raw = localStorage.getItem(LOCAL_ANNOUNCEMENT_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const updated = list.map(m => m.id === id ? { ...m, title, content } : m);
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
