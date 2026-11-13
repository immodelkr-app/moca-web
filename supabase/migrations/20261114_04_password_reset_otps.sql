-- 비밀번호 재설정 SMS 인증번호 저장소. RLS만 켜고 정책을 만들지 않아 anon/authenticated는 접근 불가, 엣지함수(service role)만 사용.
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  code_hash   text NOT NULL,
  attempts    int  NOT NULL DEFAULT 0,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_reset_otps_user_idx ON password_reset_otps (user_id, created_at DESC);
ALTER TABLE password_reset_otps ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON password_reset_otps FROM anon, authenticated;
