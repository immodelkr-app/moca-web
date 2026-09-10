-- 20260910_01_moca_live_chat_host_role.sql
-- 라이브 채팅에서 운영자(진행자)가 보낸 메시지를 구분하기 위한 플래그.
-- 어드민에서 로그인 전환 없이 바로 채팅을 보낼 수 있게 하고, 프론트에서 다른 색/배지로 표시한다.

ALTER TABLE public.moca_live_chat_messages
  ADD COLUMN IF NOT EXISTS is_host BOOLEAN NOT NULL DEFAULT false;
