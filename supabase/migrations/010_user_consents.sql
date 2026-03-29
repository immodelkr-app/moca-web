-- users 테이블에 마케팅 동의 및 서비스 이용약관 동의 컬럼 추가
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS terms_consent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terms_consent_at TIMESTAMPTZ;

-- 인덱스 추가 (조회 필요 시 대비)
CREATE INDEX IF NOT EXISTS idx_users_marketing_consent ON users (marketing_consent);
CREATE INDEX IF NOT EXISTS idx_users_terms_consent ON users (terms_consent);
