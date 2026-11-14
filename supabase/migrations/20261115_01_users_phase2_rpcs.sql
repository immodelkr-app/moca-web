-- users 잠금 2단계 준비: 등급/운영진/user_type/master_user_id를 anon이 직접 바꾸지 못하게 하기 전에 앱이 쓸 RPC를 먼저 만든다.
-- 이 파일만 적용하면 기존 동작에 영향 없음(가입 시 등급 강제 SILVER 트리거만 즉시 적용). 잠금은 20261115_02에서.
-- 관리자 검증은 _qna_assert_admin 재사용(관리자 비밀번호 변경 시 해시도 같이 변경).
-- shortcut: 관리자 키가 VITE_ADMIN_PASSWORD(번들 포함)라 비밀 아님 -> 서버 관리자 로그인(남은과제 4번)에서 해결.

-- 가입(INSERT) 시 anon/authenticated는 등급·운영진·SSO 값을 못 정한다 (서버 기본값으로 강제)
CREATE OR REPLACE FUNCTION users_force_safe_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.grade := 'SILVER';
    NEW.grade_expires_at := NULL;
    NEW.is_staff_judge := false;
    NEW.master_user_id := NULL;
    IF NEW.user_type IS NULL OR NEW.user_type NOT IN ('model', 'company') THEN NEW.user_type := 'model'; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS users_force_safe_insert_trg ON users;
CREATE TRIGGER users_force_safe_insert_trg BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION users_force_safe_insert();

-- 관리자: 등급 변경 (id 기준)
CREATE OR REPLACE FUNCTION admin_set_grade(p_admin_key text, p_id uuid, p_grade text, p_expires timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  IF p_grade NOT IN ('BASIC', 'SILVER', 'GOLD', 'IMODEL', 'VIP') THEN RAISE EXCEPTION 'invalid grade'; END IF;
  UPDATE users SET grade = p_grade, grade_expires_at = p_expires WHERE id = p_id;
END $$;

-- 관리자: 등급 변경 (닉네임 기준, 등업신청 승인용)
CREATE OR REPLACE FUNCTION admin_set_grade_by_nickname(p_admin_key text, p_nickname text, p_grade text, p_expires timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  IF p_grade NOT IN ('BASIC', 'SILVER', 'GOLD', 'IMODEL', 'VIP') THEN RAISE EXCEPTION 'invalid grade'; END IF;
  UPDATE users SET grade = p_grade, grade_expires_at = p_expires WHERE nickname = p_nickname;
END $$;

-- 관리자: 전화번호(여러 표기)로 VIP 승급, 승급된 회원 정보 반환
CREATE OR REPLACE FUNCTION admin_set_vip_by_phones(p_admin_key text, p_phones text[])
RETURNS TABLE(id uuid, master_user_id text, nickname text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  RETURN QUERY WITH up AS (UPDATE users u SET grade = 'VIP' WHERE u.phone = ANY(p_phones)
    RETURNING u.id AS r_id, u.master_user_id AS r_master, u.nickname AS r_nick)
    SELECT r_id, r_master, r_nick FROM up;
END $$;

-- 관리자: 운영진(오디션 판정단) 지정/해제
CREATE OR REPLACE FUNCTION admin_set_staff_judge(p_admin_key text, p_id uuid, p_value boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  UPDATE users SET is_staff_judge = p_value WHERE id = p_id;
END $$;

-- 본인: 만료된 GOLD 강등 (만료일이 지난 경우에만 동작하므로 인증 불필요)
CREATE OR REPLACE FUNCTION expire_user_grade(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  UPDATE users SET grade = 'SILVER', grade_expires_at = NULL
  WHERE id = p_id AND grade = 'GOLD' AND grade_expires_at IS NOT NULL AND grade_expires_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;

-- 본인: GOLD 자동 승급. 서버가 모카그램 댓글 3개 이상을 직접 확인 (기존 앱 조건과 동일). 6개월.
CREATE OR REPLACE FUNCTION auto_upgrade_gold(p_nickname text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF coalesce(p_nickname, '') = '' THEN RETURN false; END IF;
  IF (SELECT count(*) FROM certification_comments WHERE user_nickname = p_nickname) < 3 THEN RETURN false; END IF;
  UPDATE users SET grade = 'GOLD', grade_expires_at = now() + interval '6 months'
  WHERE nickname = p_nickname AND coalesce(grade, 'SILVER') IN ('BASIC', 'SILVER');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;

-- 본인: 소셜 로그인 계정이 같은 이메일의 기존 계정 중 가장 높은 등급을 이어받는다 (Supabase Auth 로그인 필요, 이메일은 JWT 기준)
-- shortcut: 이메일 열은 아직 anon이 수정 가능(3단계에서 보호) -> 그 전까지는 이메일을 바꿔치기해 등급을 가져가는 우회가 이론상 남음.
CREATE OR REPLACE FUNCTION claim_social_grade()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text := lower(auth.jwt() ->> 'email'); v_best text;
BEGIN
  IF auth.uid() IS NULL OR coalesce(v_email, '') = '' THEN RETURN NULL; END IF;
  SELECT grade INTO v_best FROM users
  WHERE lower(email) = v_email OR id = auth.uid()
  ORDER BY CASE grade WHEN 'VIP' THEN 4 WHEN 'IMODEL' THEN 3 WHEN 'GOLD' THEN 2 WHEN 'SILVER' THEN 1 ELSE 0 END DESC LIMIT 1;
  UPDATE users SET grade = v_best
  WHERE id = auth.uid()
    AND CASE grade WHEN 'VIP' THEN 4 WHEN 'IMODEL' THEN 3 WHEN 'GOLD' THEN 2 WHEN 'SILVER' THEN 1 ELSE 0 END
      < CASE v_best WHEN 'VIP' THEN 4 WHEN 'IMODEL' THEN 3 WHEN 'GOLD' THEN 2 WHEN 'SILVER' THEN 1 ELSE 0 END;
  RETURN v_best;
END $$;

-- 본인: im-core-auth 연동 결과(master_user_id) 저장. 비어 있을 때만 한 번 기록.
-- shortcut: 비어 있는 계정의 id를 아는 사람이 다른 값을 먼저 넣을 수 있음(포인트 연동 오염), 3단계에서 서버 검증 방식으로 교체.
CREATE OR REPLACE FUNCTION set_master_user_id(p_id uuid, p_master text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE users SET master_user_id = p_master WHERE id = p_id AND master_user_id IS NULL AND coalesce(p_master, '') <> '';
$$;

-- 업체 가입: 업체 유형으로 전환 (회원가입 후 업체 인증 신청 시)
CREATE OR REPLACE FUNCTION become_company(p_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE users SET user_type = 'company' WHERE id = p_id;
$$;

REVOKE ALL ON FUNCTION admin_set_grade(text, uuid, text, timestamptz), admin_set_grade_by_nickname(text, text, text, timestamptz),
  admin_set_vip_by_phones(text, text[]), admin_set_staff_judge(text, uuid, boolean),
  expire_user_grade(uuid), auto_upgrade_gold(text), claim_social_grade(), set_master_user_id(uuid, text), become_company(uuid)
  FROM public;
GRANT EXECUTE ON FUNCTION admin_set_grade(text, uuid, text, timestamptz), admin_set_grade_by_nickname(text, text, text, timestamptz),
  admin_set_vip_by_phones(text, text[]), admin_set_staff_judge(text, uuid, boolean),
  expire_user_grade(uuid), auto_upgrade_gold(text), claim_social_grade(), set_master_user_id(uuid, text), become_company(uuid)
  TO anon, authenticated;
