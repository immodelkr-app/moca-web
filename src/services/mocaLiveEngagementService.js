import { supabase, isSupabaseEnabled } from './supabaseClient';

/**
 * 모카TV 라이브 소통 기능 (실시간 채팅 / 하트 / 실시간 퀴즈 / 숫자 맞추기).
 * chatService.js의 실시간 패턴(Supabase Realtime postgres_changes)을 라이브 방송 단위로 응용한다.
 *
 * SECURITY NOTE (숫자 맞추기): moca_live_number_game.answer(정답)는 quiz_posts.correct_answers와
 * 같은 이유로 RLS로는 숨길 수 없다 (auth.uid() 세션이 없어 관리자/일반 구분 불가).
 * 그래서 (1) 시청자용 조회 함수는 answer 컬럼을 절대 select하지 않고, (2) 정답 비교 자체를
 * 클라이언트가 아니라 Postgres 함수(submit_moca_live_number_guess) 안에서 수행해 정답이
 * 제출자 브라우저로도 새지 않게 한다. fetchVisibleNumberGame·fetchMyNumberGameEntry는
 * 반드시 이 규칙을 유지할 것.
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

export const sendLiveChatMessage = async (liveId, userNickname, message, { isHost = false } = {}) => {
    if (!isSupabaseEnabled() || !liveId || !message?.trim()) return { error: new Error('전송 불가') };

    const { error } = await supabase
        .from('moca_live_chat_messages')
        .insert([{ live_id: liveId, user_nickname: userNickname, message: message.trim(), is_host: isHost }]);

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

// --- 고정 댓글(공지) ---
// 라이브당 1건만 고정 가능. 관리자가 직접 문구를 입력하거나, 기존 채팅 메시지 중 하나를
// 골라 그대로 고정할 수 있다.

export const fetchPinnedMessage = async (liveId) => {
    if (!isSupabaseEnabled() || !liveId) return null;

    const { data, error } = await supabase
        .from('moca_live_streams')
        .select('pinned_message, pinned_message_author, pinned_message_at')
        .eq('id', liveId)
        .maybeSingle();

    if (error) {
        console.error('[mocaLiveEngagementService] 고정 댓글 조회 실패:', error);
        return null;
    }
    return data?.pinned_message ? data : null;
};

export const subscribeToPinnedMessage = (liveId, onChange) => {
    if (!isSupabaseEnabled() || !liveId) return () => {};

    const channel = supabase
        .channel(`moca_live_pinned_${liveId}`)
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'moca_live_streams', filter: `id=eq.${liveId}` },
            (payload) => onChange(payload.new)
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

export const setPinnedMessage = async (liveId, message, author) => {
    if (!isSupabaseEnabled() || !liveId || !message?.trim()) return { error: new Error('고정 불가') };

    const { error } = await supabase
        .from('moca_live_streams')
        .update({
            pinned_message: message.trim(),
            pinned_message_author: author || null,
            pinned_message_at: new Date().toISOString(),
        })
        .eq('id', liveId);

    if (error) console.error('[mocaLiveEngagementService] 고정 댓글 설정 실패:', error);
    return { error };
};

export const clearPinnedMessage = async (liveId) => {
    if (!isSupabaseEnabled() || !liveId) return { error: new Error('해제 불가') };

    const { error } = await supabase
        .from('moca_live_streams')
        .update({ pinned_message: null, pinned_message_author: null, pinned_message_at: null })
        .eq('id', liveId);

    if (error) console.error('[mocaLiveEngagementService] 고정 댓글 해제 실패:', error);
    return { error };
};

// --- 하트 ---

// 누적 카운트는 RPC로 원자적으로 증가시키고, 다른 시청자 화면의 하트 애니메이션은
// DB 왕복 없이 Realtime Broadcast로 즉시 알린다.
//
// 주의: 같은 topic(`moca_live_hearts_{liveId}`)으로 채널을 두 번 만들면 안 된다 - 리스너용
// 채널이 이미 구독 중인 상태에서 전송할 때마다 새 채널을 또 join하면 같은 소켓이 같은 topic을
// 중복 join하게 되어 기존 구독이 끊기거나 브로드캐스트가 유실될 수 있다. 그래서 리스닝용
// 채널 인스턴스를 그대로 넘겨받아 전송에도 재사용한다 (openLiveHeartChannel 참고).
export const openLiveHeartChannel = (liveId, onHeart) => {
    if (!isSupabaseEnabled() || !liveId) return null;

    return supabase
        .channel(`moca_live_hearts_${liveId}`)
        .on('broadcast', { event: 'heart' }, () => onHeart())
        .subscribe();
};

export const closeLiveHeartChannel = (channel) => {
    if (channel) supabase.removeChannel(channel);
};

export const broadcastLiveHeart = (channel) => {
    if (!channel) return;
    channel.send({ type: 'broadcast', event: 'heart', payload: {} });
};

// --- 실시간 시청자 수 ---
// DB에 남기지 않고 Realtime Presence로만 집계한다. asViewer=true로 열면 실제로 플레이어를
// 연 사람으로 자신을 등록(track)하고, 관리자 모니터링 화면은 asViewer=false로 열어 상태만
// 구독해서 관리자 본인은 시청자 수에 포함되지 않게 한다.
export const openLiveViewerPresence = (liveId, onCountChange, asViewer = false) => {
    if (!isSupabaseEnabled() || !liveId) return null;

    const channel = supabase.channel(`moca_live_viewers_${liveId}`, {
        config: { presence: { key: `${Date.now()}_${Math.random().toString(36).slice(2)}` } },
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            onCountChange(Object.keys(channel.presenceState()).length);
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED' && asViewer) {
                channel.track({ online_at: new Date().toISOString() });
            }
        });

    return channel;
};

export const closeLiveViewerPresence = (channel) => {
    if (channel) supabase.removeChannel(channel);
};

export const incrementLiveHeart = async (liveId) => {
    if (!isSupabaseEnabled() || !liveId) return { count: null, error: new Error('전송 불가') };

    const { data, error } = await supabase.rpc('increment_moca_live_heart', { p_live_id: liveId });
    if (error) console.error('[mocaLiveEngagementService] 하트 카운트 증가 실패:', error);
    return { count: data, error };
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

// 시청자 화면에서 내리기(보관) - 응답 기록은 남기고 fetchVisibleQuiz 대상에서만 제외시켜
// 다음 방송(재시작)에서 지난 결과가 다시 노출되지 않게 한다.
export const archiveLiveQuiz = async (quizId) => {
    if (!isSupabaseEnabled()) return { error: new Error('보관 불가') };

    const { error } = await supabase
        .from('moca_live_quiz')
        .update({ status: 'archived' })
        .eq('id', quizId);

    return { error };
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

// --- 숫자 맞추기 (퀴즈보다 간단한 게임) ---

// answer 컬럼은 절대 포함하지 않는다 (SECURITY NOTE 참고)
const SAFE_NUMBER_GAME_COLUMNS =
    'id, live_id, min_value, max_value, prize_label, winner_count, current_winner_count, status, created_at, opened_at, closed_at';

export const fetchVisibleNumberGame = async (liveId) => {
    if (!isSupabaseEnabled() || !liveId) return null;

    const { data, error } = await supabase
        .from('moca_live_number_game')
        .select(SAFE_NUMBER_GAME_COLUMNS)
        .eq('live_id', liveId)
        .in('status', ['open', 'closed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[mocaLiveEngagementService] 숫자맞추기 조회 실패:', error);
        return null;
    }
    return data;
};

export const subscribeToNumberGame = (liveId, onChange) => {
    if (!isSupabaseEnabled() || !liveId) return () => {};

    const channel = supabase
        .channel(`moca_live_number_game_${liveId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'moca_live_number_game', filter: `live_id=eq.${liveId}` },
            (payload) => onChange(payload.new)
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

export const fetchMyNumberGameEntry = async (gameId, userNickname) => {
    if (!isSupabaseEnabled() || !gameId || !userNickname) return null;

    const { data } = await supabase
        .from('moca_live_number_game_entries')
        .select('guess, is_correct, is_winner, winner_rank')
        .eq('game_id', gameId)
        .eq('user_nickname', userNickname)
        .maybeSingle();

    return data || null;
};

// 정답 판정은 반드시 DB 함수 안에서만 수행 (클라이언트에서 채점 금지)
export const submitNumberGuess = async (gameId, liveId, userNickname, guess) => {
    if (!isSupabaseEnabled() || !gameId || !userNickname) return { result: null, error: new Error('제출 불가') };

    const { data, error } = await supabase.rpc('submit_moca_live_number_guess', {
        p_game_id: gameId,
        p_live_id: liveId,
        p_nickname: userNickname,
        p_guess: guess,
    });

    if (error) {
        console.error('[mocaLiveEngagementService] 숫자맞추기 제출 실패:', error);
        return { result: null, error };
    }
    return { result: data?.[0] || null, error: null };
};

// --- 관리자 (숫자 맞추기) ---

export const fetchNumberGamesForLive = async (liveId) => {
    if (!isSupabaseEnabled() || !liveId) return [];

    const { data, error } = await supabase
        .from('moca_live_number_game')
        .select('*')
        .eq('live_id', liveId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[mocaLiveEngagementService] 관리자 숫자맞추기 목록 조회 실패:', error);
        return [];
    }
    return data || [];
};

// 등록과 동시에 바로 시작 (모델뷰티 방식과 동일하게 별도 draft 단계 없음)
export const createNumberGame = async (liveId, { minValue, maxValue, answer, prizeLabel, winnerCount }) => {
    if (!isSupabaseEnabled() || !liveId) return { error: new Error('생성 불가') };

    const { data, error } = await supabase
        .from('moca_live_number_game')
        .insert([{
            live_id: liveId,
            min_value: minValue,
            max_value: maxValue,
            answer,
            prize_label: prizeLabel || null,
            winner_count: winnerCount || 1,
        }])
        .select()
        .single();

    return { data, error };
};

export const cancelNumberGame = async (gameId) => {
    if (!isSupabaseEnabled()) return { error: new Error('취소 불가') };

    const { error } = await supabase
        .from('moca_live_number_game')
        .update({ status: 'cancelled', closed_at: new Date().toISOString() })
        .eq('id', gameId)
        .eq('status', 'open');

    return { error };
};

// 당첨 인원이 다 안 찼어도 진행자가 수동으로 조기 마감
export const endNumberGameNow = async (gameId) => {
    if (!isSupabaseEnabled()) return { error: new Error('마감 불가') };

    const { error } = await supabase
        .from('moca_live_number_game')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', gameId)
        .eq('status', 'open');

    return { error };
};

// 시청자 화면에서 내리기(보관) - 당첨 기록은 남기고 fetchVisibleNumberGame 대상에서만 제외
export const archiveNumberGame = async (gameId) => {
    if (!isSupabaseEnabled()) return { error: new Error('보관 불가') };

    const { error } = await supabase
        .from('moca_live_number_game')
        .update({ status: 'archived' })
        .eq('id', gameId);

    return { error };
};

export const fetchNumberGameWinnerNicknames = async (gameId) => {
    if (!isSupabaseEnabled() || !gameId) return [];

    const { data, error } = await supabase
        .from('moca_live_number_game_entries')
        .select('user_nickname')
        .eq('game_id', gameId)
        .eq('is_winner', true)
        .order('winner_rank', { ascending: true });

    if (error) {
        console.error('[mocaLiveEngagementService] 숫자맞추기 당첨자 조회 실패:', error);
        return [];
    }
    return (data || []).map((r) => r.user_nickname);
};

// --- 키워드 정답 맞추기 (말로 질문 → 채팅에 정답 단어 포함되면 자동 당첨) ---

// keyword 컬럼은 절대 포함하지 않는다 (호스트가 방송에서 말로 알려주는 방식이라 완전 기밀은
// 아니지만, 미리 읽고 유리하게 시도하는 걸 막기 위해 동일한 안전 컬럼 규칙 적용)
const SAFE_KEYWORD_EVENT_COLUMNS =
    'id, live_id, prize_label, winner_count, current_winner_count, status, created_at, opened_at, closed_at';

export const fetchVisibleKeywordEvent = async (liveId) => {
    if (!isSupabaseEnabled() || !liveId) return null;

    const { data, error } = await supabase
        .from('moca_live_keyword_event')
        .select(SAFE_KEYWORD_EVENT_COLUMNS)
        .eq('live_id', liveId)
        .in('status', ['open', 'closed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[mocaLiveEngagementService] 키워드 이벤트 조회 실패:', error);
        return null;
    }
    return data;
};

export const subscribeToKeywordEvent = (liveId, onChange) => {
    if (!isSupabaseEnabled() || !liveId) return () => {};

    const channel = supabase
        .channel(`moca_live_keyword_event_${liveId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'moca_live_keyword_event', filter: `live_id=eq.${liveId}` },
            (payload) => onChange(payload.new)
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

// 채팅에 정답을 쳤을 때 내가 당첨됐는지는 채팅 전송 결과가 아니라 entries 테이블로 확인한다
// (판정이 채팅 INSERT 트리거 안에서 비동기적으로 처리되기 때문)
export const fetchMyKeywordEntry = async (eventId, userNickname) => {
    if (!isSupabaseEnabled() || !eventId || !userNickname) return null;

    const { data } = await supabase
        .from('moca_live_keyword_entries')
        .select('winner_rank, created_at')
        .eq('event_id', eventId)
        .eq('user_nickname', userNickname)
        .maybeSingle();

    return data || null;
};

export const subscribeToKeywordEntries = (liveId, onNewEntry) => {
    if (!isSupabaseEnabled() || !liveId) return () => {};

    const channel = supabase
        .channel(`moca_live_keyword_entries_${liveId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'moca_live_keyword_entries', filter: `live_id=eq.${liveId}` },
            (payload) => onNewEntry(payload.new)
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};

// --- 관리자 (키워드 이벤트) ---

export const fetchKeywordEventsForLive = async (liveId) => {
    if (!isSupabaseEnabled() || !liveId) return [];

    const { data, error } = await supabase
        .from('moca_live_keyword_event')
        .select('*')
        .eq('live_id', liveId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[mocaLiveEngagementService] 관리자 키워드 이벤트 목록 조회 실패:', error);
        return [];
    }
    return data || [];
};

// 등록과 동시에 바로 시작 (숫자맞추기와 동일하게 별도 draft 단계 없음)
export const createKeywordEvent = async (liveId, { keyword, prizeLabel, winnerCount }) => {
    if (!isSupabaseEnabled() || !liveId) return { error: new Error('생성 불가') };

    const { data, error } = await supabase
        .from('moca_live_keyword_event')
        .insert([{
            live_id: liveId,
            keyword: keyword.trim(),
            prize_label: prizeLabel || null,
            winner_count: winnerCount || 1,
        }])
        .select()
        .single();

    return { data, error };
};

export const cancelKeywordEvent = async (eventId) => {
    if (!isSupabaseEnabled()) return { error: new Error('취소 불가') };

    const { error } = await supabase
        .from('moca_live_keyword_event')
        .update({ status: 'cancelled', closed_at: new Date().toISOString() })
        .eq('id', eventId)
        .eq('status', 'open');

    return { error };
};

export const endKeywordEventNow = async (eventId) => {
    if (!isSupabaseEnabled()) return { error: new Error('마감 불가') };

    const { error } = await supabase
        .from('moca_live_keyword_event')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', eventId)
        .eq('status', 'open');

    return { error };
};

// 시청자 화면에서 내리기(보관) - 당첨 기록은 남기고 fetchVisibleKeywordEvent 대상에서만 제외
export const archiveKeywordEvent = async (eventId) => {
    if (!isSupabaseEnabled()) return { error: new Error('보관 불가') };

    const { error } = await supabase
        .from('moca_live_keyword_event')
        .update({ status: 'archived' })
        .eq('id', eventId);

    return { error };
};

export const fetchKeywordEventWinnerNicknames = async (eventId) => {
    if (!isSupabaseEnabled() || !eventId) return [];

    const { data, error } = await supabase
        .from('moca_live_keyword_entries')
        .select('user_nickname')
        .eq('event_id', eventId)
        .order('winner_rank', { ascending: true });

    if (error) {
        console.error('[mocaLiveEngagementService] 키워드 이벤트 당첨자 조회 실패:', error);
        return [];
    }
    return (data || []).map((r) => r.user_nickname);
};
