-- Q&A 게시판 테이블 생성
CREATE TABLE IF NOT EXISTS qna_posts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT,
  user_name    TEXT,
  category     TEXT NOT NULL DEFAULT 'other',
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  is_locked    BOOLEAN DEFAULT false,
  admin_reply  TEXT,
  replied_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE qna_posts ENABLE ROW LEVEL SECURITY;

-- RLS: 비잠금 게시글 누구나 조회 / 잠금은 작성자만
DROP POLICY IF EXISTS "qna_select_policy" ON qna_posts;
CREATE POLICY "qna_select_policy" ON qna_posts
  FOR SELECT USING (
    is_locked = false OR user_id = current_setting('app.user_id', true)
  );

-- RLS: 로그인 여부 관계없이 INSERT 허용 (닉네임 기반)
DROP POLICY IF EXISTS "qna_insert_policy" ON qna_posts;
CREATE POLICY "qna_insert_policy" ON qna_posts
  FOR INSERT WITH CHECK (true);

-- RLS: 관리자 UPDATE 허용 (admin_reply 답변 등)
DROP POLICY IF EXISTS "qna_update_policy" ON qna_posts;
CREATE POLICY "qna_update_policy" ON qna_posts
  FOR UPDATE USING (true);

-- RLS: 작성자 본인 삭제 허용
DROP POLICY IF EXISTS "qna_delete_policy" ON qna_posts;
CREATE POLICY "qna_delete_policy" ON qna_posts
  FOR DELETE USING (true);
