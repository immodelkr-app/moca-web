-- 20261011_08_casting_last_push_at.sql
-- 어드민이 공고별로 수동 푸시 알림을 보낸 마지막 시각 (실수로 같은 공고를 전체 회원에게 중복 발송하지 않도록 표시용)
ALTER TABLE public.model_castings ADD COLUMN IF NOT EXISTS last_push_at TIMESTAMP WITH TIME ZONE;
