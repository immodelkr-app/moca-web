-- 20260911_01_moca_live_vod.sql
-- 모카TV 라이브 "다시보기(VOD)" 기능.
-- 유튜브 라이브는 방송 종료 후 같은 videoId가 자동으로 다시보기 영상이 되므로 별도 컬럼이
-- 필요 없다. RTMP(AWS IVS) 라이브는 자동 다시보기가 없어 관리자가 IVS 녹화 설정으로 별도
-- 확보한 재생 URL(HLS)을 수동으로 붙여넣는 방식으로 지원한다.

ALTER TABLE public.moca_live_streams
  ADD COLUMN IF NOT EXISTS vod_url TEXT;
