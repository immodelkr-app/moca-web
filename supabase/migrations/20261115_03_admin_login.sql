-- 서버 관리자 로그인: 비밀번호를 서버가 검증하고 무작위 세션 토큰을 발급한다.
-- 기존 관리자 RPC/엣지함수는 p_admin_key 자리에 이 토큰을 받는다(_qna_assert_admin이 검증).
-- 전환 기간(이 파일 적용~20261115_04 적용 전)에는 번들에 들어 있던 기존 비밀번호도 계속 통과한다 -> 04에서 차단.
-- 비밀번호 변경: 사용자가 `select admin_set_password('새비밀번호')` 를 직접 실행(앱/anon에는 권한 없음).
-- shortcut: 로그인 실패 잠금이 전역(관리자 1명 전제) -> 15분 내 10회 실패 시 모두 잠김, 관리자가 여러 명이 되면 계정별로 분리.

CREATE TABLE IF NOT EXISTS admin_sessions (token_hash text PRIMARY KEY, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS admin_login_fails (id bigserial PRIMARY KEY, at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS admin_config (key text PRIMARY KEY, value text NOT NULL);
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_login_fails ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_sessions, admin_login_fails, admin_config FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION _admin_token_ok(p_token text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(length(p_token), 0) >= 32 AND EXISTS (
    SELECT 1 FROM admin_sessions
    WHERE token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') AND expires_at > now());
$$;

-- 기존 RPC들이 호출하는 검증 함수: 세션 토큰 OR (전환 기간에 한해) 기존 비밀번호
CREATE OR REPLACE FUNCTION _qna_assert_admin(p_admin_key text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _admin_token_ok(p_admin_key) THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM admin_config WHERE key = 'legacy_disabled')
     AND encode(sha256(convert_to(coalesce(p_admin_key, ''), 'UTF8')), 'hex')
         = '676944ce4309a957ac1464d36f5489b03a96bfce5230ebfa43b86c6892a1734f' THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
END $$;
REVOKE ALL ON FUNCTION _qna_assert_admin(text) FROM public, anon, authenticated;

-- 로그인: 성공 시 12시간짜리 토큰 반환
CREATE OR REPLACE FUNCTION admin_login(p_password text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE v_hash text; v_ok boolean; v_token text;
BEGIN
  IF (SELECT count(*) FROM admin_login_fails WHERE at > now() - interval '15 minutes') >= 10 THEN
    RAISE EXCEPTION 'locked' USING ERRCODE = 'P0001';
  END IF;
  SELECT value INTO v_hash FROM admin_config WHERE key = 'password_bcrypt';
  IF v_hash IS NOT NULL THEN
    v_ok := coalesce(p_password, '') <> '' AND crypt(p_password, v_hash) = v_hash;
  ELSE
    v_ok := NOT EXISTS (SELECT 1 FROM admin_config WHERE key = 'legacy_disabled')
            AND encode(sha256(convert_to(coalesce(p_password, ''), 'UTF8')), 'hex')
                = '676944ce4309a957ac1464d36f5489b03a96bfce5230ebfa43b86c6892a1734f';
  END IF;
  IF NOT v_ok THEN
    INSERT INTO admin_login_fails DEFAULT VALUES;
    RAISE EXCEPTION 'invalid' USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM admin_login_fails;
  DELETE FROM admin_sessions WHERE expires_at < now();
  v_token := encode(gen_random_bytes(32), 'hex');
  INSERT INTO admin_sessions VALUES (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), now() + interval '12 hours');
  RETURN v_token;
END $$;

CREATE OR REPLACE FUNCTION admin_logout(p_token text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM admin_sessions WHERE token_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

-- Vercel API 함수 등 서버가 토큰 유효 여부만 확인할 때 사용 (세션 토큰만 인정, 기존 비밀번호는 인정 안 함)
CREATE OR REPLACE FUNCTION admin_token_valid(p_token text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT _admin_token_ok(p_token); $$;

-- 비밀번호 설정: 앱에서는 호출 불가(사용자가 SQL로 직접 실행). 기존 비밀번호 통로를 닫고 세션을 모두 끊는다.
CREATE OR REPLACE FUNCTION admin_set_password(p_new text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF coalesce(length(p_new), 0) < 10 THEN RAISE EXCEPTION 'password too short (min 10)'; END IF;
  INSERT INTO admin_config VALUES ('password_bcrypt', crypt(p_new, gen_salt('bf', 10)))
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  INSERT INTO admin_config VALUES ('legacy_disabled', '1') ON CONFLICT (key) DO NOTHING;
  DELETE FROM admin_sessions;
END $$;

REVOKE ALL ON FUNCTION admin_login(text), admin_logout(text), admin_token_valid(text), admin_set_password(text) FROM public;
-- Supabase는 새 함수에 anon/authenticated 실행 권한을 자동 부여하므로 public 회수만으로는 부족 -> 명시적으로 회수
REVOKE ALL ON FUNCTION admin_set_password(text), _admin_token_ok(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_login(text), admin_logout(text), admin_token_valid(text) TO anon, authenticated;
