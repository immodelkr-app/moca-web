-- 20261011_06_drop_casting_clicks_rpc.sql
-- "원문/이메일 버튼을 누른 사람 목록" 조회 기능을 제거 (개인 행동 데이터 최소화 — 집계 숫자만 사용)
DROP FUNCTION IF EXISTS casting_events_admin_clicks(text, uuid);
