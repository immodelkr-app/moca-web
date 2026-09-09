-- 20260909_05_moca_live_number_game.sql
-- 모카TV 라이브: 퀴즈보다 더 간단한 "숫자 맞추기" 게임.
-- 모델뷰티 라이브의 숫자맞추기(min~max 범위 안에서 정답 숫자 맞히기, 선착순 N명 당첨)를 참고해
-- 모카TV 전용으로 새로 구현. 정답은 안전을 위해 클라이언트에 절대 select하지 않는다
-- (SECURITY NOTE: quiz_posts.correct_answers와 동일한 한계 - 이 앱은 auth.uid() 세션이
-- 없어 RLS로 관리자/일반 구분이 불가능하므로, 정답 비공개는 RLS가 아니라 "일반 시청자
-- 조회 코드는 answer 컬럼을 아예 select하지 않는다"는 규칙 + 정답 비교 자체를 클라이언트가
-- 아니라 Postgres 함수(submit_moca_live_number_guess) 안에서만 수행하는 방식으로 지킨다.
-- 채점을 클라이언트 JS에서 하면 "제출" 한 번만으로 정답이 그 시청자 브라우저에 내려가
-- 즉시 새어나가므로, 이 부분만큼은 RPC로 서버(DB) 안에서 끝내는 게 필수적이다).

CREATE TABLE IF NOT EXISTS public.moca_live_number_game (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_id UUID NOT NULL REFERENCES public.moca_live_streams(id) ON DELETE CASCADE,
    min_value INTEGER NOT NULL,
    max_value INTEGER NOT NULL,
    answer INTEGER NOT NULL,
    prize_label TEXT,
    winner_count INTEGER NOT NULL DEFAULT 1,
    current_winner_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_moca_live_number_game_live_id ON public.moca_live_number_game(live_id, status);

ALTER TABLE public.moca_live_number_game ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on moca_live_number_game" ON public.moca_live_number_game
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on moca_live_number_game" ON public.moca_live_number_game
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on moca_live_number_game" ON public.moca_live_number_game
  FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on moca_live_number_game" ON public.moca_live_number_game
  FOR DELETE TO public USING (true);

CREATE TABLE IF NOT EXISTS public.moca_live_number_game_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID NOT NULL REFERENCES public.moca_live_number_game(id) ON DELETE CASCADE,
    live_id UUID NOT NULL,
    user_nickname TEXT NOT NULL,
    guess INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT false,
    is_winner BOOLEAN NOT NULL DEFAULT false,
    winner_rank INTEGER,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (game_id, user_nickname)
);

CREATE INDEX IF NOT EXISTS idx_moca_live_number_game_entries_game_id ON public.moca_live_number_game_entries(game_id);

ALTER TABLE public.moca_live_number_game_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on moca_live_number_game_entries" ON public.moca_live_number_game_entries
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on moca_live_number_game_entries" ON public.moca_live_number_game_entries
  FOR INSERT TO public WITH CHECK (true);

-- 정답 판정 + 당첨 처리를 DB 함수 안에서 원자적으로 수행 (동시 제출 레이스 컨디션 방지를 위해
-- 게임 행에 FOR UPDATE 락을 걸고, answer는 함수 밖으로 절대 반환하지 않는다).
CREATE OR REPLACE FUNCTION public.submit_moca_live_number_guess(
    p_game_id UUID,
    p_live_id UUID,
    p_nickname TEXT,
    p_guess INTEGER
)
RETURNS TABLE(is_correct BOOLEAN, is_winner BOOLEAN, winner_rank INTEGER, game_closed BOOLEAN)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_answer INTEGER;
    v_status TEXT;
    v_winner_count INTEGER;
    v_current_winner_count INTEGER;
    v_is_correct BOOLEAN;
    v_is_winner BOOLEAN := false;
    v_rank INTEGER := NULL;
    v_closed BOOLEAN := false;
BEGIN
    SELECT answer, status, winner_count, current_winner_count
    INTO v_answer, v_status, v_winner_count, v_current_winner_count
    FROM public.moca_live_number_game
    WHERE id = p_game_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION '존재하지 않는 게임입니다.';
    END IF;
    IF v_status <> 'open' THEN
        RAISE EXCEPTION '이미 종료된 게임입니다.';
    END IF;

    v_is_correct := (p_guess = v_answer);

    IF v_is_correct AND v_current_winner_count < v_winner_count THEN
        v_is_winner := true;
        v_rank := v_current_winner_count + 1;
    END IF;

    INSERT INTO public.moca_live_number_game_entries
        (game_id, live_id, user_nickname, guess, is_correct, is_winner, winner_rank)
    VALUES
        (p_game_id, p_live_id, p_nickname, p_guess, v_is_correct, v_is_winner, v_rank);

    IF v_is_winner THEN
        v_current_winner_count := v_current_winner_count + 1;
        v_closed := v_current_winner_count >= v_winner_count;

        UPDATE public.moca_live_number_game
        SET current_winner_count = v_current_winner_count,
            status = CASE WHEN v_closed THEN 'closed' ELSE status END,
            closed_at = CASE WHEN v_closed THEN timezone('utc'::text, now()) ELSE closed_at END
        WHERE id = p_game_id;
    END IF;

    RETURN QUERY SELECT v_is_correct, v_is_winner, v_rank, v_closed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_moca_live_number_guess(UUID, UUID, TEXT, INTEGER) TO anon, authenticated, public;

-- Realtime: 게임 상태(진행 인원/마감 여부) 변화를 시청자 화면에 즉시 반영
ALTER PUBLICATION supabase_realtime ADD TABLE public.moca_live_number_game;
