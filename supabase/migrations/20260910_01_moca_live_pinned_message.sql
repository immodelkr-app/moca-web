-- 20260910_01_moca_live_pinned_message.sql
-- 모카TV 라이브: 고정 댓글(공지) 기능.
-- 관리자가 직접 문구를 입력하거나, 시청자가 이미 보낸 채팅 메시지 중 하나를 골라
-- 채팅창 상단에 항상 보이도록 고정할 수 있다. 라이브당 1건만 고정 가능.

ALTER TABLE public.moca_live_streams
  ADD COLUMN IF NOT EXISTS pinned_message TEXT,
  ADD COLUMN IF NOT EXISTS pinned_message_author TEXT,
  ADD COLUMN IF NOT EXISTS pinned_message_at TIMESTAMP WITH TIME ZONE;

-- Realtime: 고정/해제가 시청자 화면에 즉시 반영되도록 등록
ALTER PUBLICATION supabase_realtime ADD TABLE public.moca_live_streams;
