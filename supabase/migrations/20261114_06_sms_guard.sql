-- aligo-send(문자/알림톡 발송) 남용 방지: 관리자 키 검증 함수 + 관리자 알림 발송 횟수 기록.
-- 둘 다 엣지함수(service role)만 사용. 앱(anon)은 접근 불가.

-- 관리자 키 일치 여부(boolean). anon이 호출하면 키 추측 수단이 되므로 service_role 전용.
CREATE OR REPLACE FUNCTION admin_key_ok(p_key text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_key);
  RETURN true;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN false;
END $$;
REVOKE ALL ON FUNCTION admin_key_ok(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_key_ok(text) TO service_role;

CREATE TABLE IF NOT EXISTS sms_notify_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sms_notify_log_created_idx ON sms_notify_log (created_at DESC);
ALTER TABLE sms_notify_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON sms_notify_log FROM anon, authenticated;
GRANT ALL ON sms_notify_log TO service_role;
