-- ── 015_fix_rls_email_select.sql ──
-- 소셜 로그인 유저가 이메일로 기존 계정을 조회할 수 있도록 RLS 정책 강화
-- 문제: SELECT 정책이 auth.uid() 기반으로만 작동해서
--       소셜 로그인 신규 UUID가 기존 VIP 계정(다른 UUID)을 이메일로 조회 불가

-- 기존 정책 삭제
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_social" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_select_by_email" ON users;

-- ✅ SELECT: 본인 ID OR 이메일이 일치하는 모든 레코드 조회 허용
--    → 소셜 로그인 신규 유저가 기존 VIP 계정을 이메일로 찾을 수 있게 됨
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated, anon
  USING (
    (id::text = auth.uid()::text)
    OR (email = auth.jwt()->>'email')
    OR (email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid() LIMIT 1))
  );

-- ✅ INSERT: 신규 소셜 유저 레코드 생성 허용
CREATE POLICY "users_insert_social"
  ON users FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    (id::text = auth.uid()::text)
    OR (email = auth.jwt()->>'email')
  );

-- ✅ UPDATE: 본인 ID 또는 이메일 기준으로 수정 허용
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated, anon
  USING (
    (id::text = auth.uid()::text)
    OR (email = auth.jwt()->>'email')
    OR (email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid() LIMIT 1))
  )
  WITH CHECK (
    (id::text = auth.uid()::text)
    OR (email = auth.jwt()->>'email')
  );

COMMENT ON TABLE users IS 'MOCA 사용자 정보 테이블 (RLS v2 - 이메일 조회 허용)';
