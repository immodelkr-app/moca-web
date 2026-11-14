-- 회원 로그인/본인확인 시도 횟수 제한.
-- 닉네임+비밀번호 해시를 받는 모든 서버 확인(login_user, 본인 연락처 RPC, Q&A 본인확인, set_password)이 _auth_check 한 곳을 거친다.
-- 규칙: 같은 닉네임에 대해 15분 안에 "서로 다른" 틀린 값이 10개 쌓이면 15분간 'locked' 오류(맞는 값도 거부).
--       같은 틀린 값의 반복은 1번만 센다(다른 기기에서 비밀번호를 바꿔 옛 세션이 같은 값을 계속 보내는 경우 스스로 잠기지 않도록).
-- shortcut: 닉네임 기준이라 남이 내 닉네임으로 10번 틀리면 15분간 내 로그인이 막힌다(DoS). 계정 탈취보다 낫다고 보고 수용, IP 기준 제한은 Vercel/엣지 단에서 추가 가능.
-- 롤백: 20261115_07_login_throttle_ROLLBACK.sql
-- 주의: Supabase는 새 함수에 anon 실행 권한을 자동 부여하므로 내부 함수는 명시적으로 회수한다. 조건 없는 DELETE는 API 경로에서 거부되므로 항상 WHERE를 붙인다.

CREATE TABLE IF NOT EXISTS login_fails (
  id bigserial PRIMARY KEY,
  nickname text NOT NULL,
  fp text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_fails_nick_at ON login_fails (nickname, at);
ALTER TABLE login_fails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON login_fails FROM public, anon, authenticated;

-- 닉네임+해시 확인(시도 제한 포함). 맞으면 users 행을 돌려주고, 틀리면 아무것도 안 돌려주며 실패를 기록한다.
CREATE OR REPLACE FUNCTION _auth_check(p_nickname text, p_cred text) RETURNS SETOF users
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE v users; v_fp text;
BEGIN
  IF coalesce(p_nickname, '') = '' OR coalesce(p_cred, '') = '' THEN RETURN; END IF;
  IF (SELECT count(*) FROM login_fails WHERE nickname = p_nickname AND at > now() - interval '15 minutes') >= 10 THEN
    RAISE EXCEPTION 'locked' USING ERRCODE = 'P0001';
  END IF;
  SELECT * INTO v FROM users WHERE nickname = p_nickname AND password_hash = p_cred ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    DELETE FROM login_fails WHERE nickname = p_nickname;
    RETURN NEXT v;
    RETURN;
  END IF;
  v_fp := left(encode(sha256(convert_to(p_cred, 'UTF8')), 'hex'), 16);
  INSERT INTO login_fails (nickname, fp)
    SELECT p_nickname, v_fp
    WHERE NOT EXISTS (SELECT 1 FROM login_fails WHERE nickname = p_nickname AND fp = v_fp AND at > now() - interval '15 minutes');
  DELETE FROM login_fails WHERE at < now() - interval '1 day';
  RETURN;
END $$;
REVOKE ALL ON FUNCTION _auth_check(text, text) FROM public, anon, authenticated;

-- 로그인 (기존과 같은 시그니처/반환, 시도 제한만 추가)
CREATE OR REPLACE FUNCTION login_user(p_nickname text, p_hash text) RETURNS SETOF users
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT * FROM _auth_check(p_nickname, p_hash);
END $$;

-- 본인 확인 id 목록 (get_my_users, update_my_contact, casting_applicants 가 사용)
CREATE OR REPLACE FUNCTION _my_user_ids(p_nickname text, p_hash text) RETURNS SETOF uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY SELECT u.id FROM _auth_check(p_nickname, p_hash) u;
  IF auth.uid() IS NOT NULL THEN
    RETURN QUERY SELECT x.id FROM users x WHERE x.id = auth.uid();
  END IF;
END $$;
REVOKE ALL ON FUNCTION _my_user_ids(text, text) FROM public, anon, authenticated;

-- _auth_check가 쓰기를 하므로 이를 부르는 함수들은 STABLE일 수 없다
ALTER FUNCTION get_my_users(text, text) VOLATILE;
ALTER FUNCTION casting_applicants(uuid, text, text) VOLATILE;

-- Q&A 작성자 본인 확인
CREATE OR REPLACE FUNCTION _qna_is_owner(p_post_user_id text, p_nickname text, p_password_hash text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(p_nickname, '') = '' OR coalesce(p_password_hash, '') = '' THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM _auth_check(p_nickname, p_password_hash) u
    WHERE u.id::text = p_post_user_id OR u.nickname = p_post_user_id);
END $$;
REVOKE ALL ON FUNCTION _qna_is_owner(text, text, text) FROM public, anon, authenticated;
ALTER FUNCTION qna_list(text, text, text) VOLATILE;
ALTER FUNCTION qna_get(uuid, text, text) VOLATILE;

-- 로그인 중 비밀번호 변경
CREATE OR REPLACE FUNCTION set_password(p_nickname text, p_current_hash text, p_new_hash text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF coalesce(p_new_hash, '') = '' OR coalesce(p_current_hash, '') = '' THEN RETURN false; END IF;
  SELECT u.id INTO v_id FROM _auth_check(p_nickname, p_current_hash) u;
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE users SET password_hash = p_new_hash WHERE id = v_id;
  RETURN true;
END $$;
