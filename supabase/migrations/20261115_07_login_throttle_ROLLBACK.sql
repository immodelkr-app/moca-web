-- 시도 제한 이전(20261114_02 / 20260929_01 / 20261115_05) 정의로 되돌린다. login_fails 테이블과 _auth_check 는 남겨도 무해.
CREATE OR REPLACE FUNCTION login_user(p_nickname text, p_hash text) RETURNS SETOF users
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM users
  WHERE nickname = p_nickname AND password_hash = p_hash AND coalesce(p_hash, '') <> ''
  ORDER BY created_at DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION _my_user_ids(p_nickname text, p_hash text) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM users
  WHERE (coalesce(p_hash, '') <> '' AND nickname = p_nickname AND password_hash = p_hash)
     OR (auth.uid() IS NOT NULL AND id = auth.uid());
$$;
ALTER FUNCTION get_my_users(text, text) STABLE;
ALTER FUNCTION casting_applicants(uuid, text, text) STABLE;

CREATE OR REPLACE FUNCTION _qna_is_owner(p_post_user_id text, p_nickname text, p_password_hash text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(p_nickname, '') <> '' AND coalesce(p_password_hash, '') <> '' AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.nickname = p_nickname AND u.password_hash = p_password_hash
      AND (u.id::text = p_post_user_id OR u.nickname = p_post_user_id));
$$;
ALTER FUNCTION qna_list(text, text, text) STABLE;
ALTER FUNCTION qna_get(uuid, text, text) STABLE;

CREATE OR REPLACE FUNCTION set_password(p_nickname text, p_current_hash text, p_new_hash text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF coalesce(p_new_hash, '') = '' OR coalesce(p_current_hash, '') = '' THEN RETURN false; END IF;
  SELECT id INTO v_id FROM users WHERE nickname = p_nickname AND password_hash = p_current_hash ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE users SET password_hash = p_new_hash WHERE id = v_id;
  RETURN true;
END $$;
