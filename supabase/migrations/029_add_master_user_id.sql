-- ============================================================
-- im-core-auth 통합 전자지갑 연동
-- master_user_id: im-core-auth에서 발급한 통합 사용자 ID
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS master_user_id TEXT;

-- 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_users_master_user_id
  ON users(master_user_id);

-- 확인 쿼리
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'master_user_id';
