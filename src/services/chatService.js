import { supabase, isSupabaseEnabled } from './supabaseClient';

const LOCAL_CHAT_KEY = 'moca_local_chat_demo';
const LOCAL_ANNOUNCEMENT_KEY = 'moca_local_announcement_demo';

// --- Announcements ---
export const fetchLatestAnnouncement = async () => {
    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('moca_announcements')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error('Error fetching announcement:', error);
            return null;
        }
        return data;
    } else {
        // Fallback for local storage if Supabase is not connected
        const raw = localStorage.getItem(LOCAL_ANNOUNCEMENT_KEY);
        if (raw) return JSON.parse(raw);
        return {
            title: '[공지] 이번 주 김대표의 고급 오디션 합격 팁 🎉',
            content: '디테일에 집중하세요. 의상 피팅부터 연습까지 철저하게.',
            created_at: new Date().toISOString()
        };
    }
};

export const updateAnnouncement = async (title, content) => {
    if (isSupabaseEnabled()) {
        const { error } = await supabase
            .from('moca_announcements')
            .insert([{ title, content }]);

        if (error) console.error('Error inserting announcement:', error);
    } else {
        localStorage.setItem(LOCAL_ANNOUNCEMENT_KEY, JSON.stringify({
            title, content, created_at: new Date().toISOString()
        }));
    }
};

// --- Chat Messages ---
export const fetchMessages = async (limit = 50) => {
    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('moca_chat_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
        return data.reverse(); // oldest first for chat UI
    } else {
        const raw = localStorage.getItem(LOCAL_CHAT_KEY);
        if (raw) return JSON.parse(raw);
        return [
            { id: 1, user_nickname: '김대표', message: 'MOCA 라운지에 오신 것을 환영합니다! 자유롭게 소통해주세요.', created_at: new Date(Date.now() - 3600000).toISOString() }
        ];
    }
};

export const sendMessage = async (user_nickname, message) => {
    const newMessage = {
        user_nickname,
        message,
        created_at: new Date().toISOString()
    };

    if (isSupabaseEnabled()) {
        const { error } = await supabase
            .from('moca_chat_messages')
            .insert([newMessage]);

        if (error) console.error('Error sending message:', error);
    } else {
        const existing = await fetchMessages();
        const updated = [...existing, { ...newMessage, id: Date.now() }];
        localStorage.setItem(LOCAL_CHAT_KEY, JSON.stringify(updated));
    }
};

// Setup realtime listener for messages (Only works with Supabase)
export const subscribeToMessages = (onNewMessage) => {
    if (!isSupabaseEnabled()) return () => { };

    const channel = supabase
        .channel('moca_chat_messages_changes')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'moca_chat_messages' },
            (payload) => {
                onNewMessage(payload.new);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};
