-- Q&A 테이블 직접 접근 잠금 (20260929_01 RPC를 쓰는 프론트 배포 후 적용)
-- 테이블 직접 조회는 공개글만, 수정/삭제는 RPC(qna_delete_own / qna_admin_*)로만 가능

DROP POLICY IF EXISTS "qna_select_policy" ON qna_posts;
CREATE POLICY "qna_select_policy" ON qna_posts
  FOR SELECT TO public USING (is_locked = false);

DROP POLICY IF EXISTS "qna_update_policy" ON qna_posts;
DROP POLICY IF EXISTS "qna_delete_policy" ON qna_posts;

REVOKE UPDATE, DELETE, TRUNCATE ON qna_posts FROM anon, authenticated;
-- INSERT는 사용자 입력 컬럼만 (admin_reply 등 임의 입력 차단)
REVOKE INSERT ON qna_posts FROM anon, authenticated;
GRANT INSERT (user_id, user_name, category, title, content, is_locked) ON qna_posts TO anon, authenticated;
