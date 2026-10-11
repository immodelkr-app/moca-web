-- 20261011_07_casting_role_age_text.sql
-- 외부 공고의 역할 연령은 원문 표기 그대로("20대 후반~40대 초반") 저장/노출하기 위한 텍스트 컬럼
-- (업체가 직접 올린 공고는 기존 age_min/age_max 숫자 방식 유지)
ALTER TABLE public.model_casting_roles ADD COLUMN IF NOT EXISTS age_text TEXT;
