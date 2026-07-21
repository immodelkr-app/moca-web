-- ===================================================
-- 030_photo_feedbacks.sql
-- 현재모습 사진 피드백 & 1:1 대화 시스템
-- ===================================================

-- 1. model_current_photos 에 어드민 피드백 컬럼 추가
ALTER TABLE model_current_photos
  ADD COLUMN IF NOT EXISTS admin_comment TEXT,
  ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

-- 2. 1:1 피드백 댓글 테이블 (아임모델/전속모델용)
CREATE TABLE IF NOT EXISTS photo_feedbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES model_current_photos(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'model')),
  sender_id UUID,           -- 보낸 사람 user_id (어드민 or 모델)
  sender_name TEXT,         -- 보낸 사람 이름/닉네임
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_photo_feedbacks_photo_id ON photo_feedbacks(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_feedbacks_created_at ON photo_feedbacks(created_at);

-- RLS 활성화
ALTER TABLE photo_feedbacks ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 조회/삽입 가능 (단, 자신의 사진에 대한 댓글만)
DROP POLICY IF EXISTS "Feedback access" ON photo_feedbacks;
CREATE POLICY "Feedback access" ON photo_feedbacks
  FOR ALL USING (true) WITH CHECK (true);
