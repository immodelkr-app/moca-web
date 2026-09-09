-- 20260909_05_grade_change_history.sql
-- 등급 변경 이력 로그. 등업 신청 승인(upgrade_requests)과 회원관리 수동 등급 조절(AdminPage)
-- 두 경로가 서로 기록을 남기지 않아, 나중에 등급이 왜 바뀌었는지 추적이 안 되는 문제를 해결하기 위함.
-- 등급이 바뀌는 모든 경로에서 이 테이블에 한 줄씩 남긴다.

CREATE TABLE IF NOT EXISTS public.grade_change_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_nickname TEXT,
    member_name TEXT,
    from_grade TEXT,
    to_grade TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'admin_manual', -- 'upgrade_request' | 'admin_manual'
    months INTEGER,
    request_id UUID,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_grade_change_history_user_id ON public.grade_change_history(user_id);
CREATE INDEX IF NOT EXISTS idx_grade_change_history_created_at ON public.grade_change_history(created_at DESC);

-- RLS
-- 주의: 이 앱은 Supabase Auth 세션이 아니라 자체 닉네임/비밀번호 인증을 사용하므로
-- auth.uid()가 항상 NULL입니다. 프론트엔드가 anon key로 직접 쿼리하고, 관리자 화면 노출 여부는
-- 애플리케이션(라우트) 레벨에서 처리하는 이 앱의 기존 컨벤션을 따른다.
ALTER TABLE public.grade_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on grade_change_history" ON public.grade_change_history
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on grade_change_history" ON public.grade_change_history
  FOR INSERT TO public WITH CHECK (true);
