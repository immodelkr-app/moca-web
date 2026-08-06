-- 20260806_01_attendance_coupon.sql
-- 출석체크 + 모카그램 업로드 기반 "참석쿠폰" (원데이클래스 확정 참석권) 시스템
--
-- 규칙: 하루 출석체크 + 모카그램 업로드를 모두 한 날 = "유효 출석일"
--       유효 출석일이 누적 30일이 되면(연속일 필요 없음) 어드민이 확인 후 쿠폰 수동 발급
--       쿠폰은 클래스 신청 시 "쿠폰으로 신청하기" 버튼으로 사용, 클래스별 쿠폰 전용 좌석(T/O) 내에서 소진

-- 1. attendance_checks: 하루 1회 출석체크 기록
CREATE TABLE IF NOT EXISTS public.attendance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_nickname TEXT NOT NULL,
    check_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, check_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_checks_user ON public.attendance_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_checks_nickname ON public.attendance_checks(user_nickname);

-- 2. attendance_coupons: 원데이클래스 확정 참석 쿠폰
CREATE TABLE IF NOT EXISTS public.attendance_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    user_nickname TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unused', -- 'unused' | 'used'
    issued_by TEXT, -- 발급한 어드민 아이디/메모
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    used_at TIMESTAMP WITH TIME ZONE,
    used_class_id UUID REFERENCES public.classes(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_attendance_coupons_user ON public.attendance_coupons(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_coupons_status ON public.attendance_coupons(status);

-- 3. classes: 쿠폰 전용 좌석(T/O) 설정
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS coupon_capacity INTEGER NOT NULL DEFAULT 0;

-- 4. class_applications: 쿠폰 신청 여부 및 사용 쿠폰 참조
ALTER TABLE public.class_applications ADD COLUMN IF NOT EXISTS is_coupon_applied BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.class_applications ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.attendance_coupons(id);

-- 5. RLS
-- 주의: 이 앱은 Supabase Auth 세션이 아니라 자체 닉네임/비밀번호 인증을 사용하므로
-- auth.uid()가 항상 NULL입니다. 프론트엔드가 anon key로 직접 쿼리하고 소유권 검증은
-- 서비스 레이어(JS)에서 처리하는 기존 컨벤션(model_casting, class_applications 등)을 따릅니다.
ALTER TABLE public.attendance_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on attendance_checks" ON public.attendance_checks
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on attendance_checks" ON public.attendance_checks
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public select on attendance_coupons" ON public.attendance_coupons
  FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on attendance_coupons" ON public.attendance_coupons
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on attendance_coupons" ON public.attendance_coupons
  FOR UPDATE TO public USING (true) WITH CHECK (true);
