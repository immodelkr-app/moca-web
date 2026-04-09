-- 모델 현재모습 사진 테이블
CREATE TABLE IF NOT EXISTS model_current_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_nickname TEXT,
  user_name TEXT,
  photo_url TEXT NOT NULL,
  storage_path TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'needs_more')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_model_current_photos_user_id ON model_current_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_model_current_photos_status ON model_current_photos(status);
CREATE INDEX IF NOT EXISTS idx_model_current_photos_created_at ON model_current_photos(created_at DESC);

-- RLS 정책
ALTER TABLE model_current_photos ENABLE ROW LEVEL SECURITY;

-- 모든 인증된 사용자가 자신의 사진 조회/삽입/삭제 가능
DROP POLICY IF EXISTS "Users can manage own photos" ON model_current_photos;
CREATE POLICY "Users can manage own photos" ON model_current_photos
  FOR ALL USING (true) WITH CHECK (true);
