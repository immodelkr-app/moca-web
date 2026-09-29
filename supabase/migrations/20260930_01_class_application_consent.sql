-- 모카클래스 신청 시 초상권·저작권·촬영물 활용 동의(필수) / 마케팅 정보 수신 동의(선택)
-- 기존 클래스는 제외(false), 이후 새로 개설되는 클래스부터 기본 적용(true)
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS consent_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.classes ALTER COLUMN consent_required SET DEFAULT true;

ALTER TABLE public.class_applications
    ADD COLUMN IF NOT EXISTS portrait_consent BOOLEAN,
    ADD COLUMN IF NOT EXISTS portrait_consent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN,
    ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;
