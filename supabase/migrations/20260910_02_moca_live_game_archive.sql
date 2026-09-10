-- 20260910_02_moca_live_game_archive.sql
-- 같은 방송(live_id)을 껐다 켜도 지난 퀴즈/숫자맞추기/정답맞추기 결과가 시청자 화면에
-- 계속 노출되는 문제를 해결하기 위해 'archived' 상태를 추가한다.
--
-- 시청자용 조회(fetchVisibleQuiz 등)는 status in ('open','closed')만 보므로 archived는
-- 자동으로 화면에서 빠진다. 응답/당첨 기록(answers/entries 테이블)은 그대로 남아있어
-- 어드민에서 계속 조회·포인트 지급 이력 확인이 가능하다 (데이터 삭제가 아니라 "숨김" 처리).

ALTER TABLE public.moca_live_quiz DROP CONSTRAINT IF EXISTS moca_live_quiz_status_check;
ALTER TABLE public.moca_live_quiz ADD CONSTRAINT moca_live_quiz_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'open'::text, 'closed'::text, 'archived'::text]));

ALTER TABLE public.moca_live_number_game DROP CONSTRAINT IF EXISTS moca_live_number_game_status_check;
ALTER TABLE public.moca_live_number_game ADD CONSTRAINT moca_live_number_game_status_check
  CHECK (status = ANY (ARRAY['open'::text, 'closed'::text, 'cancelled'::text, 'archived'::text]));

ALTER TABLE public.moca_live_keyword_event DROP CONSTRAINT IF EXISTS moca_live_keyword_event_status_check;
ALTER TABLE public.moca_live_keyword_event ADD CONSTRAINT moca_live_keyword_event_status_check
  CHECK (status = ANY (ARRAY['open'::text, 'closed'::text, 'cancelled'::text, 'archived'::text]));
