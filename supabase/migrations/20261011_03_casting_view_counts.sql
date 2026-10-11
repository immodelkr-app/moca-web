-- 20261011_03_casting_view_counts.sql
-- 사용자 화면(목록/상세)에 노출할 "조회 인원" — 공고별 서로 다른 조회자 수 하나만 공개
-- (클릭 수·클릭한 사람 등 나머지 기록은 계속 어드민 RPC로만 조회 가능)

CREATE OR REPLACE FUNCTION casting_view_counts()
RETURNS TABLE (casting_id uuid, view_users bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.casting_id, count(DISTINCT e.user_id)
  FROM model_casting_events e
  WHERE e.event_type = 'view' AND e.user_id IS NOT NULL
  GROUP BY e.casting_id;
$$;

REVOKE ALL ON FUNCTION casting_view_counts() FROM public;
GRANT EXECUTE ON FUNCTION casting_view_counts() TO anon, authenticated;
