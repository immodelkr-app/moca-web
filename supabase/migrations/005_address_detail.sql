-- users 테이블에 address_detail 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_detail TEXT;
