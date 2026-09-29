-- Q&A 비공개 게시글 서버측 보호
-- 기존: SELECT USING(true) + 프론트에서만 가림 → 네트워크 응답에 비공개 글 제목/내용/답변이 그대로 노출됨
-- 변경: 테이블 직접 조회는 공개글만, 비공개글은 작성자(닉네임+password_hash 확인) 또는 관리자 키로만 RPC 조회
--       UPDATE/DELETE는 RPC로만 허용 (기존엔 누구나 남의 글 수정/삭제 가능했음)
-- 이 앱은 Supabase Auth를 쓰지 않아 auth.uid()가 항상 NULL → 본인 확인은 users 테이블 대조 방식

-- 이 파일은 RPC만 추가(무중단). 테이블 직접 접근 잠금은 프론트 배포 후 20260929_02에서 적용

-- ── 1. 내부 헬퍼 ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION _qna_is_owner(p_post_user_id text, p_nickname text, p_password_hash text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(p_nickname, '') <> '' AND coalesce(p_password_hash, '') <> '' AND EXISTS (
    SELECT 1 FROM users u
    WHERE u.nickname = p_nickname
      AND u.password_hash = p_password_hash
      AND (u.id::text = p_post_user_id OR u.nickname = p_post_user_id)
  );
$$;

CREATE OR REPLACE FUNCTION _qna_assert_admin(p_admin_key text)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF encode(sha256(convert_to(coalesce(p_admin_key, ''), 'UTF8')), 'hex')
     <> '676944ce4309a957ac1464d36f5489b03a96bfce5230ebfa43b86c6892a1734f' THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION _qna_is_owner(text, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION _qna_assert_admin(text) FROM public, anon, authenticated;

-- ── 2. 사용자용 RPC ────────────────────────────────────────────
-- 목록: 비공개글은 작성자가 아니면 제목/작성자명 마스킹, 내용·답변 본문은 목록에서 제외
CREATE OR REPLACE FUNCTION qna_list(p_category text DEFAULT NULL, p_nickname text DEFAULT NULL, p_password_hash text DEFAULT NULL)
RETURNS TABLE (id uuid, user_name text, category text, title text, is_locked boolean,
               is_owner boolean, is_hidden boolean, has_reply boolean, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id,
         CASE WHEN q.is_locked AND NOT o.owner THEN NULL ELSE q.user_name END,
         q.category,
         CASE WHEN q.is_locked AND NOT o.owner THEN NULL ELSE q.title END,
         q.is_locked,
         o.owner,
         q.is_locked AND NOT o.owner,
         q.admin_reply IS NOT NULL AND q.admin_reply <> '',
         q.created_at
  FROM qna_posts q
  CROSS JOIN LATERAL (SELECT _qna_is_owner(q.user_id, p_nickname, p_password_hash) AS owner) o
  WHERE p_category IS NULL OR q.category = p_category
  ORDER BY q.created_at DESC;
$$;

-- 상세: 비공개글은 작성자만 본문/답변 수신
CREATE OR REPLACE FUNCTION qna_get(p_id uuid, p_nickname text DEFAULT NULL, p_password_hash text DEFAULT NULL)
RETURNS TABLE (id uuid, user_name text, category text, title text, content text, is_locked boolean,
               admin_reply text, replied_at timestamptz, created_at timestamptz,
               is_owner boolean, is_hidden boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id,
         CASE WHEN h.hidden THEN NULL ELSE q.user_name END,
         q.category,
         CASE WHEN h.hidden THEN NULL ELSE q.title END,
         CASE WHEN h.hidden THEN NULL ELSE q.content END,
         q.is_locked,
         CASE WHEN h.hidden THEN NULL ELSE q.admin_reply END,
         q.replied_at,
         q.created_at,
         o.owner,
         h.hidden
  FROM qna_posts q
  CROSS JOIN LATERAL (SELECT _qna_is_owner(q.user_id, p_nickname, p_password_hash) AS owner) o
  CROSS JOIN LATERAL (SELECT q.is_locked AND NOT o.owner AS hidden) h
  WHERE q.id = p_id;
$$;

-- 본인 글 삭제
CREATE OR REPLACE FUNCTION qna_delete_own(p_id uuid, p_nickname text, p_password_hash text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM qna_posts q
  WHERE q.id = p_id AND _qna_is_owner(q.user_id, p_nickname, p_password_hash);
  RETURN FOUND;
END;
$$;

-- ── 3. 관리자용 RPC ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION qna_admin_list(p_admin_key text)
RETURNS SETOF qna_posts
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  RETURN QUERY SELECT * FROM qna_posts ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION qna_admin_reply(p_admin_key text, p_id uuid, p_reply text)
RETURNS SETOF qna_posts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  RETURN QUERY
    UPDATE qna_posts
    SET admin_reply = nullif(p_reply, ''),
        replied_at  = CASE WHEN nullif(p_reply, '') IS NULL THEN NULL ELSE now() END
    WHERE id = p_id
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION qna_admin_delete(p_admin_key text, p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM _qna_assert_admin(p_admin_key);
  DELETE FROM qna_posts WHERE id = p_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION qna_list(text, text, text) FROM public;
REVOKE ALL ON FUNCTION qna_get(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION qna_delete_own(uuid, text, text) FROM public;
REVOKE ALL ON FUNCTION qna_admin_list(text) FROM public;
REVOKE ALL ON FUNCTION qna_admin_reply(text, uuid, text) FROM public;
REVOKE ALL ON FUNCTION qna_admin_delete(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION qna_list(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION qna_get(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION qna_delete_own(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION qna_admin_list(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION qna_admin_reply(text, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION qna_admin_delete(text, uuid) TO anon, authenticated;
