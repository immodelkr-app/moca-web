-- 20260804_01_model_casting.sql
-- 모델캐스팅: 업체가 모델을 구인하는 게시판 기능
-- users에 계정 유형(모델/업체) 구분 추가 + 업체 부가정보/게시글/역할/지원 테이블 신설

-- 1. users: 계정 유형 구분 (기본값 model, 기존 유저 전부 model로 처리됨)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS user_type TEXT NOT NULL DEFAULT 'model';
-- 'model' | 'company'

-- 2. companies (업체 부가 정보, users 1:1)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    company_name TEXT NOT NULL,
    company_address TEXT NOT NULL,
    company_address_detail TEXT,
    company_phone TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    business_number TEXT, -- 사업자등록번호 (방송작가 등 프리랜서는 없을 수 있어 nullable)
    verification_type TEXT NOT NULL DEFAULT 'business', -- 'business'(사업자등록증) | 'affiliation'(소속확인서류 - 방송작가 등)
    business_cert_url TEXT NOT NULL, -- 인증서류 첨부 (사업자등록증 또는 재직증명서/소속확인서 등)
    verification_status TEXT NOT NULL DEFAULT 'pending', -- pending | verified | rejected
    verified_at TIMESTAMP WITH TIME ZONE,
    rejected_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. model_castings (구인 게시글 = "모델캐스팅")
CREATE TABLE IF NOT EXISTS public.model_castings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- TV광고/화보촬영/SNS광고/뮤직비디오/홈쇼핑/기타 ...
    title TEXT NOT NULL,
    project_name TEXT,
    shoot_period TEXT,
    shoot_location TEXT,
    description TEXT,
    attachment_url TEXT, -- 상세 소개 PPT 등 첨부파일 (에이전시 전달용과 동일 방식)
    contract_type TEXT, -- 표준계약서 작성 여부 등
    deadline DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- open | closed | cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. model_casting_roles (게시글 내 모집 역할 카드, 게시글당 N개)
CREATE TABLE IF NOT EXISTS public.model_casting_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    casting_id UUID NOT NULL REFERENCES public.model_castings(id) ON DELETE CASCADE,
    role_name TEXT,
    gender TEXT NOT NULL DEFAULT 'any', -- male | female | any
    age_min INTEGER,
    age_max INTEGER,
    headcount INTEGER DEFAULT 1,
    pay TEXT,
    schedule TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. model_casting_applications (모델의 지원)
CREATE TABLE IF NOT EXISTS public.model_casting_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES public.model_casting_roles(id) ON DELETE CASCADE,
    casting_id UUID NOT NULL REFERENCES public.model_castings(id) ON DELETE CASCADE,
    model_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'applied', -- applied | reviewing | accepted | rejected
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (role_id, model_user_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_model_castings_company ON public.model_castings(company_id);
CREATE INDEX IF NOT EXISTS idx_model_castings_status_deadline ON public.model_castings(status, deadline);
CREATE INDEX IF NOT EXISTS idx_model_casting_roles_casting ON public.model_casting_roles(casting_id);
CREATE INDEX IF NOT EXISTS idx_model_casting_applications_role ON public.model_casting_applications(role_id);
CREATE INDEX IF NOT EXISTS idx_model_casting_applications_model ON public.model_casting_applications(model_user_id);
CREATE INDEX IF NOT EXISTS idx_model_casting_applications_casting ON public.model_casting_applications(casting_id);

-- 6. RLS
-- 주의: 이 앱은 Supabase Auth 세션이 아니라 자체 닉네임/비밀번호 인증을 사용하므로
-- auth.uid()가 항상 NULL입니다 (20260523_01_fix_class_rls.sql에서 동일한 이유로
-- auth.uid() 기반 정책을 전부 공개 정책으로 되돌린 전례 있음). 프론트엔드가 anon key로
-- 직접 쿼리하고, 소유권 검증은 서비스 레이어(JS)에서 처리하는 이 앱의 기존 컨벤션을 따릅니다.
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_castings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_casting_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_casting_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on companies" ON public.companies
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on companies" ON public.companies
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on companies" ON public.companies
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public select on model_castings" ON public.model_castings
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on model_castings" ON public.model_castings
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on model_castings" ON public.model_castings
  FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on model_castings" ON public.model_castings
  FOR DELETE TO public USING (true);

CREATE POLICY "Allow public select on model_casting_roles" ON public.model_casting_roles
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on model_casting_roles" ON public.model_casting_roles
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on model_casting_roles" ON public.model_casting_roles
  FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on model_casting_roles" ON public.model_casting_roles
  FOR DELETE TO public USING (true);

CREATE POLICY "Allow public select on model_casting_applications" ON public.model_casting_applications
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on model_casting_applications" ON public.model_casting_applications
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on model_casting_applications" ON public.model_casting_applications
  FOR UPDATE TO public USING (true) WITH CHECK (true);

-- 7. 모델 프로필 주소 필수화는 애플리케이션(가입/수정 폼) 레벨에서 검증
--    (address 컬럼은 이미 존재 -> NOT NULL 제약은 기존 데이터 이슈로 인해 걸지 않음)
