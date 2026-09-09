-- 20260909_06_moca_live_keyword_event.sql
-- 모카TV 라이브: "말로 질문하고 채팅으로 답 맞추기" 방식의 키워드 이벤트.
-- 모델뷰티 라이브의 선착순 댓글(키워드) 이벤트를 참고. 관리자는 문제/보기를 미리 쓸 필요 없이
-- 정답 키워드 한 단어만 등록하면 되고, 시청자는 평소처럼 채팅에 그 단어가 들어간 메시지를
-- 치면 자동으로 정답 판정된다 (선착순 N명).
--
-- 채점은 채팅 INSERT 트리거 안에서 수행 - 시청자는 별도 "제출" 버튼 없이 기존 채팅 입력만
-- 사용하고, 매칭 여부는 트리거가 즉시 처리한다. keyword 컬럼은 방송 중 시청자 조회 코드에서는
-- select하지 않는다 (호스트가 방송에서 말로 알려주는 방식이라 완전 기밀은 아니지만, 미리 읽고
-- 유리하게 시도하는 걸 막기 위해 동일한 안전 컬럼 규칙을 적용).

CREATE TABLE IF NOT EXISTS public.moca_live_keyword_event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_id UUID NOT NULL REFERENCES public.moca_live_streams(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    prize_label TEXT,
    winner_count INTEGER NOT NULL DEFAULT 1,
    current_winner_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_moca_live_keyword_event_live_id ON public.moca_live_keyword_event(live_id, status);

ALTER TABLE public.moca_live_keyword_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on moca_live_keyword_event" ON public.moca_live_keyword_event
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on moca_live_keyword_event" ON public.moca_live_keyword_event
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on moca_live_keyword_event" ON public.moca_live_keyword_event
  FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on moca_live_keyword_event" ON public.moca_live_keyword_event
  FOR DELETE TO public USING (true);

CREATE TABLE IF NOT EXISTS public.moca_live_keyword_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.moca_live_keyword_event(id) ON DELETE CASCADE,
    live_id UUID NOT NULL,
    user_nickname TEXT NOT NULL,
    chat_message_id UUID REFERENCES public.moca_live_chat_messages(id) ON DELETE SET NULL,
    winner_rank INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (event_id, user_nickname)
);

CREATE INDEX IF NOT EXISTS idx_moca_live_keyword_entries_event_id ON public.moca_live_keyword_entries(event_id);

ALTER TABLE public.moca_live_keyword_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on moca_live_keyword_entries" ON public.moca_live_keyword_entries
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on moca_live_keyword_entries" ON public.moca_live_keyword_entries
  FOR INSERT TO public WITH CHECK (true);

-- 채팅 메시지가 등록될 때마다 실행: 해당 라이브에 진행 중인 키워드 이벤트가 있고
-- 메시지에 키워드가 포함되어 있으면 자동으로 당첨 처리 (선착순 N명, 1인 1회).
CREATE OR REPLACE FUNCTION public.moca_live_keyword_match_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_event RECORD;
    v_inserted INTEGER;
BEGIN
    SELECT * INTO v_event
    FROM public.moca_live_keyword_event
    WHERE live_id = NEW.live_id AND status = 'open'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF v_event.id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.message ILIKE '%' || v_event.keyword || '%' AND v_event.current_winner_count < v_event.winner_count THEN
        INSERT INTO public.moca_live_keyword_entries (event_id, live_id, user_nickname, chat_message_id, winner_rank)
        VALUES (v_event.id, NEW.live_id, NEW.user_nickname, NEW.id, v_event.current_winner_count + 1)
        ON CONFLICT (event_id, user_nickname) DO NOTHING;

        GET DIAGNOSTICS v_inserted = ROW_COUNT;

        IF v_inserted > 0 THEN
            UPDATE public.moca_live_keyword_event
            SET current_winner_count = current_winner_count + 1,
                status = CASE WHEN current_winner_count + 1 >= winner_count THEN 'closed' ELSE status END,
                closed_at = CASE WHEN current_winner_count + 1 >= winner_count THEN timezone('utc'::text, now()) ELSE closed_at END
            WHERE id = v_event.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_moca_live_keyword_match ON public.moca_live_chat_messages;
CREATE TRIGGER trg_moca_live_keyword_match
    AFTER INSERT ON public.moca_live_chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.moca_live_keyword_match_trigger();

-- Realtime: 진행 상황(당첨 인원/마감)과 내 당첨 여부를 시청자 화면에 즉시 반영
ALTER PUBLICATION supabase_realtime ADD TABLE public.moca_live_keyword_event;
ALTER PUBLICATION supabase_realtime ADD TABLE public.moca_live_keyword_entries;
