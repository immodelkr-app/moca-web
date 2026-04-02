-- ── 013_add_missing_profile_columns.sql ──
-- 아임모카 스마트 프로필 누락 컬럼 추가
-- Supabase SQL Editor 에서 실행하세요.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS shoe_size    TEXT,
  ADD COLUMN IF NOT EXISTS career_ad    TEXT,
  ADD COLUMN IF NOT EXISTS career_other TEXT;

-- 기존 레코드 확인용
COMMENT ON COLUMN users.shoe_size IS '신발 사이즈 (mm)';
COMMENT ON COLUMN users.career_ad IS '광고모델 경력사항';
COMMENT ON COLUMN users.career_other IS '그외 경력사항 (방송, 연극 등)';
