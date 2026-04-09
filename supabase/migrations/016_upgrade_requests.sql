-- 1. 멤버십 등업 신청 기록 테이블부터 먼저 생성합니다
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_nickname TEXT NOT NULL,
    member_name TEXT NOT NULL,
    member_phone TEXT NOT NULL,
    plan_months INTEGER NOT NULL,
    price INTEGER NOT NULL,
    signature_image TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- 2. 혹시 기존에 잘못 들어간 규칙이 있다면 깔끔하게 비웁니다
DROP POLICY IF EXISTS "Anyone can insert upgrade requests" ON public.upgrade_requests;
DROP POLICY IF EXISTS "Users can view own upgrade requests" ON public.upgrade_requests;
DROP POLICY IF EXISTS "Admins have full access to upgrade requests" ON public.upgrade_requests;

-- 3. RLS (행 수준 보안) 설정
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

-- 4. 누구나 신청서를 작성할 수 있게 허용

CREATE POLICY "Anyone can insert upgrade requests" ON public.upgrade_requests FOR INSERT
TO public
WITH CHECK (true);

-- 5. 누구나 조회 및 수정 가능토록 허용 (관리자 페이지는 프론트엔드 비밀번호로 보호됨)

DROP POLICY IF EXISTS "Enable read access for all users" ON public.upgrade_requests;
CREATE POLICY "Enable read access for all users" ON public.upgrade_requests FOR SELECT
TO public
USING (true);


DROP POLICY IF EXISTS "Enable update for all users" ON public.upgrade_requests;
CREATE POLICY "Enable update for all users" ON public.upgrade_requests FOR UPDATE
TO public
USING (true)
WITH CHECK (true);


DROP POLICY IF EXISTS "Enable delete for all users" ON public.upgrade_requests;
CREATE POLICY "Enable delete for all users" ON public.upgrade_requests FOR DELETE
TO public
USING (true);
