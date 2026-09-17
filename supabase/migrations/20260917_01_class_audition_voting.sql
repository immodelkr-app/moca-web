-- 20260917_01_class_audition_voting.sql
-- 모카클래스 오디션 심사/투표 기능.
-- 콘티 수업 후 참가자들이 실제 오디션처럼 연기하고, 그 자리에서 수강생+운영진이
-- "잘한 2명"에게 투표해 메인/서브를 가상으로 뽑는다. 영상은 올리지 않고 참가자 번호+사진만 등록한다.
-- moca_live_quiz/moca_live_quiz_answers(20260909_04_moca_live_engagement.sql)의
-- draft→open→closed 상태 + UNIQUE 제약 + TO public RLS 패턴을 그대로 재활용한다.

-- 1) classes 테이블에 오디션 상태 컬럼 추가 (022_class_feedback_system.sql이 status/completed_at을
--    추가한 것과 동일한 확장 패턴 — 회차당 오디션은 최대 1회이므로 별도 세션 테이블 없이 컬럼으로 관리)
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS audition_status TEXT NOT NULL DEFAULT 'none'
    CHECK (audition_status IN ('none', 'draft', 'open', 'closed')),
  ADD COLUMN IF NOT EXISTS audition_opened_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS audition_closed_at TIMESTAMP WITH TIME ZONE;

-- 2) 운영진 판정단 플래그 (등급 체계 대신 전역 플래그 하나로 단순화 — 회차마다 재지정할 필요 없음)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_staff_judge BOOLEAN NOT NULL DEFAULT false;

-- 3) 참가자 항목 (운영자가 번호+사진으로 등록)
CREATE TABLE IF NOT EXISTS public.class_audition_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    entry_number INTEGER NOT NULL,
    photo_url TEXT,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (class_id, entry_number)
);

CREATE INDEX IF NOT EXISTS idx_class_audition_entries_class_id ON public.class_audition_entries(class_id);

ALTER TABLE public.class_audition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on class_audition_entries" ON public.class_audition_entries
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on class_audition_entries" ON public.class_audition_entries
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on class_audition_entries" ON public.class_audition_entries
  FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on class_audition_entries" ON public.class_audition_entries
  FOR DELETE TO public USING (true);

-- 4) 투표 (수강생+운영진 공통 풀, 회차당 한 사람이 최대 2명까지 선택 — 정확히 2건 제한은 앱 레벨에서 검증)
CREATE TABLE IF NOT EXISTS public.class_audition_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    entry_id UUID NOT NULL REFERENCES public.class_audition_entries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (class_id, user_id, entry_id)
);

CREATE INDEX IF NOT EXISTS idx_class_audition_votes_class_id ON public.class_audition_votes(class_id);

ALTER TABLE public.class_audition_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on class_audition_votes" ON public.class_audition_votes
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on class_audition_votes" ON public.class_audition_votes
  FOR INSERT TO public WITH CHECK (true);

-- 5) Realtime: 프레젠테이션 화면에서 득표수 실시간 집계용
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_audition_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.class_audition_votes;
