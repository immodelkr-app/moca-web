-- 20261011_02_casting_events.sql
-- 모카캐스팅 공고 상세 조회(view) / 원문 공고 바로가기 클릭(source_click) 기록
-- 개인 행동 데이터라 테이블 직접 조회는 막고(INSERT만 허용), 관리자 RPC로만 조회한다.
-- 관리자 검증은 Q&A와 동일한 _qna_assert_admin() 재사용 (관리자 비밀번호를 바꾸면 이 함수의 해시도 같이 변경 필요).

CREATE TABLE IF NOT EXISTS public.model_casting_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    casting_id UUID NOT NULL REFERENCES public.model_castings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'source_click')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_casting_events_casting ON public.model_casting_events(casting_id, event_type);
CREATE INDEX IF NOT EXISTS idx_casting_events_created ON public.model_casting_events(created_at DESC);

ALTER TABLE public.model_casting_events ENABLE ROW LEVEL SECURITY;

-- 기록은 누구나 추가만 가능, SELECT/UPDATE/DELETE 정책 없음 → anon 키로는 읽을 수 없음
CREATE POLICY "Allow public insert on model_casting_events" ON public.model_casting_events
  FOR INSERT TO public WITH CHECK (true);

-- 공고별 집계 (조회수/조회 유저수/클릭수/클릭 유저수/마지막 클릭)
CREATE OR REPLACE FUNCTION casting_events_admin_stats(p_admin_key text)
RETURNS TABLE (casting_id uuid, views bigint, view_users bigint, clicks bigint, click_users bigint, last_click_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  RETURN QUERY
    SELECT e.casting_id,
           count(*) FILTER (WHERE e.event_type = 'view'),
           count(DISTINCT e.user_id) FILTER (WHERE e.event_type = 'view'),
           count(*) FILTER (WHERE e.event_type = 'source_click'),
           count(DISTINCT e.user_id) FILTER (WHERE e.event_type = 'source_click'),
           max(e.created_at) FILTER (WHERE e.event_type = 'source_click')
    FROM model_casting_events e
    GROUP BY e.casting_id;
END;
$$;

-- 특정 공고의 원문 버튼 클릭 상세 (누가 / 언제) — 연락처는 내려주지 않음
CREATE OR REPLACE FUNCTION casting_events_admin_clicks(p_admin_key text, p_casting_id uuid)
RETURNS TABLE (user_id uuid, user_name text, user_nickname text, user_grade text, clicked_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  RETURN QUERY
    SELECT e.user_id, u.name, u.nickname, u.grade, e.created_at
    FROM model_casting_events e
    LEFT JOIN users u ON u.id = e.user_id
    WHERE e.casting_id = p_casting_id AND e.event_type = 'source_click'
    ORDER BY e.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION casting_events_admin_stats(text) FROM public;
REVOKE ALL ON FUNCTION casting_events_admin_clicks(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION casting_events_admin_stats(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION casting_events_admin_clicks(text, uuid) TO anon, authenticated;
