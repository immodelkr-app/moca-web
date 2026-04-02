-- ── 014_fix_users_rls.sql ──
-- 소셜 로그인 연동을 위해 users 테이블에 RLS 정책 추가
-- (CREATE POLICY IF NOT EXISTS 문법 오류 해결을 위해 DROP 후 CREATE 방식 사용)

-- 1. RLS 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (중복 에러 방지)
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_social" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- 2. 정책: 본인 데이터 조회 허용
CREATE POLICY "users_select_own" 
  ON users FOR SELECT 
  TO authenticated, anon
  USING (
    (id::text = auth.uid()::text) OR 
    (email = auth.jwt()->>'email')
  );

-- 3. 정책: 소셜 로그인 시 신규 유저 레코드 삽입 허용
CREATE POLICY "users_insert_social" 
  ON users FOR INSERT 
  TO authenticated, anon
  WITH CHECK (
    (id::text = auth.uid()::text) OR
    (email = auth.jwt()->>'email')
  );

-- 4. 정책: 본인 데이터 수정 허용
CREATE POLICY "users_update_own" 
  ON users FOR UPDATE 
  TO authenticated, anon
  USING (id::text = auth.uid()::text)
  WITH CHECK (id::text = auth.uid()::text);

-- 확인용 코멘트
COMMENT ON TABLE users IS 'MOCA 사용자 정보 테이블 (RLS 적용 완료)';
