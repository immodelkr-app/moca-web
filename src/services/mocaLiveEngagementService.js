import { supabase, isSupabaseEnabled } from './supabaseClient';

/**
 * 모카TV 라이브 소통 기능 (실시간 채팅 / 하트 / 실시간 퀴즈).
 * chatService.js의 실시간 패턴(Supabase Realtime postgres_changes)을 라이브 방송 단위로 응용한다.
 */

// --- 채팅 ---

export const fetchLiveChatMessages = async (liveId, limit = 50) => {
    if (!isSupabaseEnabled() || !liveId) return [];

    const { data, error } = await supabase
        .from('moca_live_chat_messages')
        .select('*')
        .eq('live_id', liveId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('[mocaLiveEngagementService] 채팅 조회 실패:', error);
        return [];
    }
    return data.reverse();
};

export const sendLiveChatMessage = async (liveId, userNickname, message) => {
    if (!isSupabaseEnabled() || !liveId || !message?.trim()) return { error: new Error('전송 불가') };

    const { error } = await supabase
        .from('moca_live_chat_messages')
        .insert([{ live_id: liveId, user_nickname: userNickname, message: message.trim() }]);

    if (error) console.error('[mocaLiveEngagementService] 채팅 전송 실패:', error);
    return { error };
};

export const subscribeToLiveChat = (liveId, onNewMessage) => {
    if (!isSupabaseEnabled() || !liveId) return () => {};

    const channel = supabase
        .channel(`moca_live_chat_${liveId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'moca_live_chat_messages', filter: `live_id=eq.${liveId}` },
            (payload) => onNewMessage(payload.new)
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

// --- 하트 ---

// 누적 카운트는 RPC로 원자적으로 증가시키고, 다른 시청자 화면의 하트 애니메이션은
// DB 왕복 없이 Realtime Broadcast로 즉시 알린다.
export const sendLiveHeart = async (liveId) => {
    if (!isSupabaseEnabled() || !liveId) return { count: null, error: new Error('전송 불가') };

    const channel = supabase.channel(`moca_live_hearts_${liveId}`);
    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            channel.send({ type: 'broadcast', event: 'heart', payload: {} });
            setTimeout(() => supabase.removeChannel(channel), 500);
        }
    });

    const { data, error } = await supabase.rpc('increment_moca_live_heart', { p_live_id: liveId });
    if (error) console.error('[mocaLiveEngagementService] 하트 전송 실패:', error);
    return { count: data, error };
};

export const subscribeToLiveHearts = (liveId, onHeart) => {
    if (!isSupabaseEnabled() || !liveId) return () => {};

    const channel = supabase
        .channel(`moca_live_hearts_${liveId}`)
        .on('broadcast', { event: 'heart' }, () => onHeart())
        .subscribe();

    return () => supabase.removeChannel(channel);
};

// --- 실시간 퀴즈 ---

// 시청자 화면에 노출할 수 있는 퀴즈(open 또는 최근 closed 1건)
export const fetchVisibleQuiz = async (liveId) => {
    if (!isSupabaseEnabled() || !liveId) return null;

    const { data, error } = await supabase
        .from('moca_live_quiz')
        .select('id, live_id, question, options, status, correct_option_index, opened_at, closed_at')
        .eq('live_id', liveId)
        .in('status', ['open', 'closed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[mocaLiveEngagementService] 퀴즈 조회 실패:', error);
        return null;
    }
    return data;
};

export const subscribeToLiveQuiz = (liveId, onChange) => {
    if (!isSupabaseEnabled() || !liveId) return () => {};

    const channel = supabase
        .channel(`moca_live_quiz_${liveId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'moca_live_quiz', filter: `live_id=eq.${liveId}` },
            (payload) => onChange(payload.new)
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

export const fetchMyQuizAnswer = async (quizId, userNickname) => {
    if (!isSupabaseEnabled() || !quizId || !userNickname) return null;

    const { data } = await supabase
        .from('moca_live_quiz_answers')
        .select('selected_option_index, is_correct')
        .eq('quiz_id', quizId)
        .eq('user_nickname', userNickname)
        .maybeSingle();

    return data || null;
};

export const submitQuizAnswer = async (quizId, liveId, userNickname, selectedOptionIndex) => {
    if (!isSupabaseEnabled() || !quizId || !userNickname) return { error: new Error('제출 불가') };

    const { error } = await supabase
        .from('moca_live_quiz_answers')
        .insert([{ quiz_id: quizId, live_id: liveId, user_nickname: userNickname, selected_option_index: selectedOptionIndex }]);

    if (error) console.error('[mocaLiveEngagementService] 퀴즈 응답 실패:', error);
    return { error };
};

// --- 관리자 ---

export const fetchQuizzesForLive = async (liveId) => {
    if (!isSupabaseEnabled() || !liveId) return [];

    const { data, error } = await supabase
        .from('moca_live_quiz')
        .select('*')
        .eq('live_id', liveId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[mocaLiveEngagementService] 관리자 퀴즈 목록 조회 실패:', error);
        return [];
    }
    return data || [];
};

export const createLiveQuiz = async (liveId, question, options) => {
    if (!isSupabaseEnabled() || !liveId) return { error: new Error('생성 불가') };

    const { data, error } = await supabase
        .from('moca_live_quiz')
        .insert([{ live_id: liveId, question, options }])
        .select()
        .single();

    return { data, error };
};

// 퀴즈 오픈 - 같은 방송에서 열려있던 다른 퀴즈는 자동으로 닫는다 (동시에 하나만 진행)
export const openLiveQuiz = async (quizId, liveId) => {
    if (!isSupabaseEnabled()) return { error: new Error('진행 불가') };

    await supabase
        .from('moca_live_quiz')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('live_id', liveId)
        .eq('status', 'open');

    const { data, error } = await supabase
        .from('moca_live_quiz')
        .update({ status: 'open', opened_at: new Date().toISOString() })
        .eq('id', quizId)
        .select()
        .single();

    return { data, error };
};

// 퀴즈 마감 - 정답을 확정하고, 이미 제출된 응답들의 정오답을 일괄 채점
export const closeLiveQuiz = async (quizId, correctOptionIndex) => {
    if (!isSupabaseEnabled()) return { error: new Error('마감 불가') };

    const { data, error } = await supabase
        .from('moca_live_quiz')
        .update({ status: 'closed', correct_option_index: correctOptionIndex, closed_at: new Date().toISOString() })
        .eq('id', quizId)
        .select()
        .single();

    if (error) return { error };

    const { error: gradeError } = await supabase
        .from('moca_live_quiz_answers')
        .update({ is_correct: true })
        .eq('quiz_id', quizId)
        .eq('selected_option_index', correctOptionIndex);

    if (gradeError) console.error('[mocaLiveEngagementService] 채점 실패:', gradeError);

    await supabase
        .from('moca_live_quiz_answers')
        .update({ is_correct: false })
        .eq('quiz_id', quizId)
        .neq('selected_option_index', correctOptionIndex);

    return { data, error: null };
};

// 정답을 맞춘 시청자 닉네임 목록 (빨리 답한 순)
export const fetchCorrectAnswererNicknames = async (quizId) => {
    if (!isSupabaseEnabled() || !quizId) return [];

    const { data, error } = await supabase
        .from('moca_live_quiz_answers')
        .select('user_nickname')
        .eq('quiz_id', quizId)
        .eq('is_correct', true)
        .order('answered_at', { ascending: true });

    if (error) {
        console.error('[mocaLiveEngagementService] 정답자 조회 실패:', error);
        return [];
    }
    return (data || []).map((r) => r.user_nickname);
};

export const fetchQuizAnswerStats = async (quizId) => {
    if (!isSupabaseEnabled() || !quizId) return { total: 0, byOption: {} };

    const { data, error } = await supabase
        .from('moca_live_quiz_answers')
        .select('selected_option_index')
        .eq('quiz_id', quizId);

    if (error || !data) return { total: 0, byOption: {} };

    const byOption = {};
    data.forEach((row) => {
        byOption[row.selected_option_index] = (byOption[row.selected_option_index] || 0) + 1;
    });
    return { total: data.length, byOption };
};
