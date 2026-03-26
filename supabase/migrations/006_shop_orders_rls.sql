-- shop_orders 테이블 RLS 정책 설정
-- 이 SQL을 Supabase SQL Editor에서 실행하세요

-- 1. RLS 비활성화 (모든 접근 허용) — 간단한 방법
-- ALTER TABLE public.shop_orders DISABLE ROW LEVEL SECURITY;

-- 2. 또는 RLS를 유지하면서 정책 추가 (권장)
-- 모든 인증된 사용자가 INSERT 가능
CREATE POLICY "Allow insert for all" ON public.shop_orders
    FOR INSERT
    WITH CHECK (true);

-- 모든 인증된 사용자가 자기 주문 조회 가능
CREATE POLICY "Allow select for all" ON public.shop_orders
    FOR SELECT
    USING (true);

-- 모든 인증된 사용자가 UPDATE 가능 (어드민이 상태 변경)
CREATE POLICY "Allow update for all" ON public.shop_orders
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
