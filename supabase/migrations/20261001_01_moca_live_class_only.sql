-- 모카TV 라이브를 특정 모카클래스의 참석 확정자(approval_status='paid') 전용으로 제한하기 위한 연결 컬럼.
-- NULL이면 기존처럼 전체/등급 기준으로 노출된다.
ALTER TABLE public.moca_live_streams
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;
