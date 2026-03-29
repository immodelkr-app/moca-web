-- 009_class_calendar_events.sql
-- 클래스 신청 완료 시 캘린더 이벤트 저장 테이블
-- NOTE: 외부 테이블(classes, users) 참조 오류를 방지하기 위해 FK 제약을 제거하고 ID만 저장합니다.

CREATE TABLE IF NOT EXISTS public.class_calendar_events (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id     UUID NOT NULL,             -- 사용자 ID (auth.users.id)
    class_id    UUID NOT NULL,             -- 클래스 ID (classes.id)
    title       TEXT NOT NULL,
    class_date  TEXT NOT NULL,             -- 'YYYY-MM-DD' 형식
    class_time  TEXT,                      -- '14:00' 형식 (선택)
    location    TEXT,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, class_id)             -- 동일 클래스 중복 등록 방지
);

-- RLS 정책 설정
ALTER TABLE public.class_calendar_events ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (재실행 시 오류 방지)
DROP POLICY IF EXISTS "Users can view own class events" ON public.class_calendar_events;
DROP POLICY IF EXISTS "Users can insert own class events" ON public.class_calendar_events;
DROP POLICY IF EXISTS "Users can delete own class events" ON public.class_calendar_events;

-- 자신의 데이터만 조회/삽입/삭제 가능 (auth.uid()와 user_id 비교)
CREATE POLICY "Users can view own class events"
    ON public.class_calendar_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own class events"
    ON public.class_calendar_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own class events"
    ON public.class_calendar_events FOR DELETE
    USING (auth.uid() = user_id);

-- 성능 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_class_calendar_user ON public.class_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_class_calendar_date ON public.class_calendar_events(class_date);
