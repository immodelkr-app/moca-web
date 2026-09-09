-- 20260909_01_moca_live_streams.sql
-- 모카TV 라이브: 모델뷰티 판매방송과 별개로, 모카 자체(김대표 소통/교육) 라이브방송을 위한 테이블.
-- 송출은 유튜브 라이브(비공개/미등록)로 하고, 모카는 관리자가 수동으로 videoId를 등록/토글해 앱에 노출한다.

CREATE TABLE IF NOT EXISTS public.moca_live_streams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    youtube_video_id TEXT NOT NULL,
    streamer_name TEXT NOT NULL DEFAULT '김대표',
    cover_image_url TEXT,
    is_live BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_moca_live_streams_is_live ON public.moca_live_streams(is_live);

-- RLS
-- 주의: 이 앱은 Supabase Auth 세션이 아니라 자체 닉네임/비밀번호 인증을 사용하므로
-- auth.uid()가 항상 NULL입니다 (20260523_01_fix_class_rls.sql, 20260804_01_model_casting.sql과 동일한
-- 이유로 공개 정책을 사용). 프론트엔드가 anon key로 직접 쿼리하고, 관리자 화면 노출 여부는
-- 애플리케이션(라우트) 레벨에서 처리하는 이 앱의 기존 컨벤션을 따른다.
ALTER TABLE public.moca_live_streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on moca_live_streams" ON public.moca_live_streams
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on moca_live_streams" ON public.moca_live_streams
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on moca_live_streams" ON public.moca_live_streams
  FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on moca_live_streams" ON public.moca_live_streams
  FOR DELETE TO public USING (true);
