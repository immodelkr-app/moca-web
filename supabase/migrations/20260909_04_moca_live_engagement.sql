-- 20260909_04_moca_live_engagement.sql
-- 모카TV 라이브 소통 기능: 실시간 채팅, 하트(좋아요), 실시간 퀴즈.
-- 모델뷰티 라이브(모카 앱 밖, 딥링크만 연결)와 달리 모카TV 라이브는 앱 안에서 직접 시청하므로
-- 소통 기능도 모카 자체 테이블로 구현한다.

-- 1) 하트 누적 카운트 (개별 탭마다 행을 쌓지 않고 원자적으로 증가만 시킨다)
ALTER TABLE public.moca_live_streams
  ADD COLUMN IF NOT EXISTS heart_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_moca_live_heart(p_live_id UUID)
RETURNS INTEGER
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.moca_live_streams
  SET heart_count = heart_count + 1
  WHERE id = p_live_id
  RETURNING heart_count;
$$;

GRANT EXECUTE ON FUNCTION public.increment_moca_live_heart(UUID) TO anon, authenticated, public;

-- 2) 실시간 채팅
CREATE TABLE IF NOT EXISTS public.moca_live_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_id UUID NOT NULL REFERENCES public.moca_live_streams(id) ON DELETE CASCADE,
    user_nickname TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_moca_live_chat_messages_live_id ON public.moca_live_chat_messages(live_id, created_at);

ALTER TABLE public.moca_live_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on moca_live_chat_messages" ON public.moca_live_chat_messages
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on moca_live_chat_messages" ON public.moca_live_chat_messages
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public delete on moca_live_chat_messages" ON public.moca_live_chat_messages
  FOR DELETE TO public USING (true);

-- 3) 실시간 퀴즈 (방송 중 김대표가 문제를 올리고, 시청자가 실시간으로 답을 고르는 방식)
CREATE TABLE IF NOT EXISTS public.moca_live_quiz (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_id UUID NOT NULL REFERENCES public.moca_live_streams(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- ["보기1", "보기2", ...]
    correct_option_index INTEGER, -- 마감 전에는 NULL (시청자에게 노출되지 않도록)
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    opened_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_moca_live_quiz_live_id ON public.moca_live_quiz(live_id, status);

ALTER TABLE public.moca_live_quiz ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on moca_live_quiz" ON public.moca_live_quiz
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on moca_live_quiz" ON public.moca_live_quiz
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on moca_live_quiz" ON public.moca_live_quiz
  FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on moca_live_quiz" ON public.moca_live_quiz
  FOR DELETE TO public USING (true);

-- 4) 퀴즈 응답 (한 사람당 한 문제에 한 번만 답)
CREATE TABLE IF NOT EXISTS public.moca_live_quiz_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.moca_live_quiz(id) ON DELETE CASCADE,
    live_id UUID NOT NULL,
    user_nickname TEXT NOT NULL,
    selected_option_index INTEGER NOT NULL,
    is_correct BOOLEAN,
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (quiz_id, user_nickname)
);

CREATE INDEX IF NOT EXISTS idx_moca_live_quiz_answers_quiz_id ON public.moca_live_quiz_answers(quiz_id);

ALTER TABLE public.moca_live_quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on moca_live_quiz_answers" ON public.moca_live_quiz_answers
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on moca_live_quiz_answers" ON public.moca_live_quiz_answers
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on moca_live_quiz_answers" ON public.moca_live_quiz_answers
  FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 5) Realtime: 채팅/퀴즈는 postgres_changes 구독이 필요하므로 publication에 추가
-- (하트는 DB insert 없이 Broadcast만 쓰므로 publication 등록 불필요)
ALTER PUBLICATION supabase_realtime ADD TABLE public.moca_live_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.moca_live_quiz;
