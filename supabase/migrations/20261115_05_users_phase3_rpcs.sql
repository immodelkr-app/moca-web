-- users 잠금 3단계 준비(1단계): phone/address/address_detail/email/reply_email 을 anon이 직접 읽거나 쓰지 못하게 하기 전에, 앱이 쓸 RPC를 먼저 만든다.
-- 이 파일만 적용하면 기존 동작에는 영향 없음(새 함수만 추가). 잠금은 별도 파일(20261115_06)에서, 앱 코드 배포 후에.
-- 본인 확인: 닉네임+비밀번호 해시(로그인과 동일 신뢰 수준) 또는 Supabase Auth 로그인(auth.uid()).
-- 관리자 확인: 서버 관리자 로그인 토큰(_qna_assert_admin).
-- 모든 반환 행에서 password_hash 는 제외한다.
-- 주의: Supabase는 새 함수에 anon/authenticated 실행 권한을 자동 부여하므로 아래에서 명시적으로 회수 후 필요한 것만 부여한다.

-- 내부용: 본인으로 확인되는 users.id 목록
CREATE OR REPLACE FUNCTION _my_user_ids(p_nickname text, p_hash text) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM users
  WHERE (coalesce(p_hash, '') <> '' AND nickname = p_nickname AND password_hash = p_hash)
     OR (auth.uid() IS NOT NULL AND id = auth.uid());
$$;

-- 본인 행 조회 (연락처 포함)
CREATE OR REPLACE FUNCTION get_my_users(p_nickname text, p_hash text) RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(u) - 'password_hash' FROM users u
  WHERE u.id IN (SELECT _my_user_ids(p_nickname, p_hash))
  ORDER BY u.created_at DESC;
$$;

-- 소셜 로그인: 내 로그인 이메일(JWT)과 같은 이메일의 기존 계정들 (계정 병합용)
-- shortcut: users.email 은 사용자 입력값이라 3단계 잠금(UPDATE 회수) 전에는 남의 행 이메일을 바꿔 정보를 가져오는 우회가 가능 -> 잠금 적용 후 해소.
CREATE OR REPLACE FUNCTION get_my_email_users() RETURNS SETOF jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT to_jsonb(u) - 'password_hash' FROM users u
  WHERE auth.uid() IS NOT NULL AND coalesce(auth.jwt() ->> 'email', '') <> ''
    AND lower(u.email) = lower(auth.jwt() ->> 'email')
  ORDER BY u.created_at DESC;
$$;

-- 본인 연락처 수정 (phone/email/address/address_detail/reply_email 만 허용). 패치에 있는 키만 바꾼다.
CREATE OR REPLACE FUNCTION update_my_contact(p_nickname text, p_hash text, p_id uuid, p_patch jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r users;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _my_user_ids(p_nickname, p_hash) i WHERE i = p_id) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  UPDATE users SET
    phone         = CASE WHEN p_patch ? 'phone'         THEN p_patch ->> 'phone'         ELSE phone END,
    email         = CASE WHEN p_patch ? 'email'         THEN p_patch ->> 'email'         ELSE email END,
    address       = CASE WHEN p_patch ? 'address'       THEN p_patch ->> 'address'       ELSE address END,
    address_detail= CASE WHEN p_patch ? 'address_detail' THEN p_patch ->> 'address_detail' ELSE address_detail END,
    reply_email   = CASE WHEN p_patch ? 'reply_email'   THEN p_patch ->> 'reply_email'   ELSE reply_email END
  WHERE id = p_id RETURNING * INTO r;
  RETURN to_jsonb(r) - 'password_hash';
END $$;

-- 관리자: 전체 회원 (연락처 포함)
CREATE OR REPLACE FUNCTION admin_list_users(p_admin_key text) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  RETURN QUERY SELECT to_jsonb(u) - 'password_hash' FROM users u ORDER BY u.created_at DESC;
END $$;

-- 관리자: 지정한 회원들의 연락처 (수강신청/업체 목록 등 조인 화면용)
CREATE OR REPLACE FUNCTION admin_user_contacts(p_admin_key text, p_ids uuid[])
RETURNS TABLE(r_id uuid, r_phone text, r_email text, r_address text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  RETURN QUERY SELECT u.id, u.phone, u.email, u.address FROM users u WHERE u.id = ANY(p_ids);
END $$;

-- 업체: 내 공고에 들어온 지원자 (연락처 포함). 호출자가 공고를 올린 업체 계정인지 서버가 확인.
CREATE OR REPLACE FUNCTION casting_applicants(p_casting_id uuid, p_nickname text, p_hash text) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM model_castings mc JOIN companies c ON c.id = mc.company_id
    WHERE mc.id = p_casting_id AND c.user_id IN (SELECT _my_user_ids(p_nickname, p_hash))
  ) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT to_jsonb(a) || jsonb_build_object('users', jsonb_build_object(
             'name', u.name, 'nickname', u.nickname, 'phone', u.phone,
             'height', u.height, 'weight', u.weight, 'portfolio_link', u.portfolio_link))
    FROM model_casting_applications a LEFT JOIN users u ON u.id = a.model_user_id
    WHERE a.casting_id = p_casting_id
    ORDER BY a.applied_at DESC;
END $$;

-- 공고 상세: 해당 공고 업체의 연락 이메일 (공고 단위로만 노출, 전체 이메일 조회 불가)
CREATE OR REPLACE FUNCTION casting_contact_email(p_casting_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.email FROM model_castings mc
  JOIN companies c ON c.id = mc.company_id JOIN users u ON u.id = c.user_id
  WHERE mc.id = p_casting_id;
$$;

-- 가입 중복 확인: 같은 전화번호+같은 유형(model/company) 계정이 있는지 (true/false만 반환)
CREATE OR REPLACE FUNCTION phone_in_use(p_phone text, p_user_type text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 10 AND EXISTS (
    SELECT 1 FROM users
    WHERE regexp_replace(phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
      AND user_type = coalesce(p_user_type, 'model'));
$$;

-- 아이디 찾기: 이름+연락처가 모두 일치할 때만 닉네임 반환
-- shortcut: 횟수 제한 없음(이름+전화번호를 모두 알아야 하므로 열거 난이도는 높음), 필요 시 시도 제한 추가.
CREATE OR REPLACE FUNCTION find_nickname(p_name text, p_phone text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT nickname FROM users
  WHERE coalesce(p_name, '') <> '' AND length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 10
    AND name = p_name AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
  ORDER BY created_at DESC LIMIT 1;
$$;

REVOKE ALL ON FUNCTION _my_user_ids(text, text), get_my_users(text, text), get_my_email_users(),
  update_my_contact(text, text, uuid, jsonb), admin_list_users(text), admin_user_contacts(text, uuid[]),
  casting_applicants(uuid, text, text), casting_contact_email(uuid), phone_in_use(text, text), find_nickname(text, text)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_my_users(text, text), get_my_email_users(),
  update_my_contact(text, text, uuid, jsonb), admin_list_users(text), admin_user_contacts(text, uuid[]),
  casting_applicants(uuid, text, text), casting_contact_email(uuid), phone_in_use(text, text), find_nickname(text, text)
  TO anon, authenticated;
