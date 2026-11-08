-- 20261108_04_company_tier.sql
-- 업체 등급: 인증 승인 시 어드민이 사업자등급/브랜드등급 중 선택. (모델 등급 users.grade 와 분리)
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tier TEXT;
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_tier_check;
ALTER TABLE public.companies ADD CONSTRAINT companies_tier_check CHECK (tier IS NULL OR tier IN ('business', 'brand'));
-- 이미 인증완료된 업체는 사업자등급으로 시작 (어드민이 필요 시 브랜드등급으로 변경)
UPDATE public.companies SET tier = 'business' WHERE verification_status = 'verified' AND tier IS NULL;
