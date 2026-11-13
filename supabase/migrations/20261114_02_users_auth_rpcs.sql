-- users 잠금 1단계 준비: password_hash를 anon이 직접 읽/쓰지 못하게 하기 전에, 앱이 쓸 RPC를 먼저 만든다.
-- (이 파일만 적용하면 기존 동작에는 영향 없음. 잠금은 20261114_03에서.)

-- 로그인: 닉네임+해시 일치 시 본인 행(세션용으로 password_hash 포함)을 돌려준다. 빈 해시(소셜 계정)는 거부.
CREATE OR REPLACE FUNCTION login_user(p_nickname text, p_hash text)
RETURNS SETOF users
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM users
  WHERE nickname = p_nickname AND password_hash = p_hash AND coalesce(p_hash, '') <> ''
  ORDER BY created_at DESC LIMIT 1;
$$;

-- 비밀번호 찾기: 닉네임+연락처 일치 시 새 해시로 교체. 성공 여부 반환.
-- shortcut: 연락처가 아직 anon에게 읽혀서(3단계 예정) 이 방식은 연락처를 아는 사람이 재설정 가능, 3단계에서 SMS 인증 등으로 교체.
CREATE OR REPLACE FUNCTION reset_password(p_nickname text, p_phone text, p_new_hash text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF coalesce(p_new_hash, '') = '' THEN RETURN false; END IF;
  SELECT id INTO v_id FROM users WHERE nickname = p_nickname AND phone = p_phone ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE users SET password_hash = p_new_hash WHERE id = v_id;
  RETURN true;
END $$;

-- 로그인 중 비밀번호 변경: 현재 세션의 닉네임+해시로 본인 확인
CREATE OR REPLACE FUNCTION set_password(p_nickname text, p_current_hash text, p_new_hash text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF coalesce(p_new_hash, '') = '' OR coalesce(p_current_hash, '') = '' THEN RETURN false; END IF;
  SELECT id INTO v_id FROM users WHERE nickname = p_nickname AND password_hash = p_current_hash ORDER BY created_at DESC LIMIT 1;
  IF v_id IS NULL THEN RETURN false; END IF;
  UPDATE users SET password_hash = p_new_hash WHERE id = v_id;
  RETURN true;
END $$;

-- 관리자 회원 삭제(강퇴): 직접 DELETE를 막는 대신 관리자 키 확인 후 삭제
CREATE OR REPLACE FUNCTION admin_delete_user(p_admin_key text, p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  DELETE FROM users WHERE id = p_id;
END $$;
