-- 20260909_03_moca_live_target_grade.sql
-- 모카TV 라이브를 전체등급에게 노출할지, GOLD 등급 이상에게만 노출할지 방송 단위로 선택.
-- moca_classes.target_grade와 동일한 컨벤션(ALL/GOLD). 실제 접근 제한은 RLS가 아니라
-- 프론트엔드(등급 비교) 레벨에서 처리하며, 이는 기존 클래스 신청 가능 등급 기능과 동일한 방식이다.

ALTER TABLE public.moca_live_streams
  ADD COLUMN IF NOT EXISTS target_grade TEXT NOT NULL DEFAULT 'ALL';

ALTER TABLE public.moca_live_streams
  DROP CONSTRAINT IF EXISTS moca_live_streams_target_grade_check;
ALTER TABLE public.moca_live_streams
  ADD CONSTRAINT moca_live_streams_target_grade_check CHECK (target_grade IN ('ALL', 'GOLD'));
