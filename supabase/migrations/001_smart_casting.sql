-- ============================================================
-- 아임모카 스마트 캐스팅 시스템 DB 마이그레이션
-- Supabase 대시보드 > SQL Editor 에서 전체 복사 후 실행하세요.
-- ============================================================


-- ── 1. users 테이블에 스마트 프로필 컬럼 추가 ──────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS height       TEXT,
  ADD COLUMN IF NOT EXISTS weight       TEXT,
  ADD COLUMN IF NOT EXISTS age          TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_link TEXT,
  ADD COLUMN IF NOT EXISTS reply_email  TEXT;

-- photo_base64 는 용량이 크므로 DB 저장 제외 (로컬스토리지 유지)


-- ── 2. casting_sends 테이블 생성 (이력서 발송 기록) ─────────────
CREATE TABLE IF NOT EXISTS casting_sends (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_nickname  TEXT        NOT NULL,
  agency_name    TEXT        NOT NULL,
  sent_at        TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 한 유저 + 에이전시 조합은 하나의 레코드만 유지 (upsert 용)
  UNIQUE (user_nickname, agency_name)
);

-- 인덱스: 닉네임 기준 조회 성능 향상
CREATE INDEX IF NOT EXISTS idx_casting_sends_nickname
  ON casting_sends (user_nickname);

-- 인덱스: 월별 카운트 집계 성능 향상
CREATE INDEX IF NOT EXISTS idx_casting_sends_sent_at
  ON casting_sends (sent_at);


-- ── 3. RLS 정책 설정 ────────────────────────────────────────────
-- (기존 users 테이블과 동일하게 anon key 로 CRUD 허용)
ALTER TABLE casting_sends ENABLE ROW LEVEL SECURITY;

-- 삽입: 누구나 가능
CREATE POLICY IF NOT EXISTS "allow_insert_sends"
  ON casting_sends FOR INSERT
  WITH CHECK (true);

-- 조회: 누구나 가능 (닉네임 기준 본인 데이터만 앱에서 필터링)
CREATE POLICY IF NOT EXISTS "allow_select_sends"
  ON casting_sends FOR SELECT
  USING (true);

-- 수정: upsert 를 위해 허용
CREATE POLICY IF NOT EXISTS "allow_update_sends"
  ON casting_sends FOR UPDATE
  USING (true);


-- ── 4. 확인 쿼리 (실행 후 결과 확인용) ─────────────────────────
-- users 테이블 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('height','weight','age','portfolio_link','reply_email')
ORDER BY column_name;

-- casting_sends 테이블 확인
SELECT table_name FROM information_schema.tables
WHERE table_name = 'casting_sends';
