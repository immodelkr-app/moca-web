-- 모카클래스 준비물 (선택 입력) — 참석확정/확정자 안내 문자에 기재된 경우에만 포함
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS supplies TEXT;
