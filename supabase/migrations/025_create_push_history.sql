-- push_history 테이블 생성
CREATE TABLE IF NOT EXISTS public.push_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    route TEXT DEFAULT '/',
    sender TEXT DEFAULT 'system',
    success_count INT DEFAULT 0,
    fail_count INT DEFAULT 0
);

-- RLS 활성화
ALTER TABLE public.push_history ENABLE ROW LEVEL SECURITY;

-- 관리자 서비스 롤에서만 삽입/조회 허용
CREATE POLICY "Service role can manage push_history"
ON public.push_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 인증된 사용자는 조회만 가능 (관리자 페이지 용)
CREATE POLICY "Authenticated users can view push_history"
ON public.push_history
FOR SELECT
TO authenticated
USING (true);
