-- qna_posts select policy fix (allow all to read, frontend masks content)
DROP POLICY IF EXISTS "qna_select_policy" ON qna_posts;

CREATE POLICY "qna_select_policy" ON qna_posts
  FOR SELECT USING (true);
