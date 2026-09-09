-- 20260909_02_moca_live_rtmp.sql
-- 모카TV 라이브에 RTMP(AWS IVS 등) 송출 방식을 추가.
-- 채널은 관리자가 AWS 콘솔 등에서 수동으로 1회 발급해 재사용하며, 앱에는 재생 가능한
-- HLS 재생 URL(playback_url)만 저장한다. Ingest 주소/스트림키는 공개 SELECT 정책이 걸린
-- 이 테이블에 저장하지 않는다 (RLS가 anon 포함 전체 공개이므로 유출 위험).

ALTER TABLE public.moca_live_streams
  ALTER COLUMN youtube_video_id DROP NOT NULL;

ALTER TABLE public.moca_live_streams
  ADD COLUMN IF NOT EXISTS stream_type TEXT NOT NULL DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS playback_url TEXT;

ALTER TABLE public.moca_live_streams
  DROP CONSTRAINT IF EXISTS moca_live_streams_stream_type_check;
ALTER TABLE public.moca_live_streams
  ADD CONSTRAINT moca_live_streams_stream_type_check CHECK (stream_type IN ('youtube', 'rtmp'));

ALTER TABLE public.moca_live_streams
  DROP CONSTRAINT IF EXISTS moca_live_streams_source_check;
ALTER TABLE public.moca_live_streams
  ADD CONSTRAINT moca_live_streams_source_check CHECK (
    (stream_type = 'youtube' AND youtube_video_id IS NOT NULL)
    OR (stream_type = 'rtmp' AND playback_url IS NOT NULL)
  );
