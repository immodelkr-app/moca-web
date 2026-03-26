-- shop_orders 테이블 RLS 정책 설정
-- 이 SQL을 Supabase SQL Editor에서 실행하세요

-- 0. anon 및 authenticated 역할에 테이블 GRANT 부여 (필수!)
GRANT SELECT, INSERT, UPDATE ON public.shop_orders TO anon;
GRANT SELECT, INSERT, UPDATE ON public.shop_orders TO authenticated;

-- 1. RLS 활성화
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

-- 2. 모든 역할이 INSERT 가능
CREATE POLICY "Allow insert for all" ON public.shop_orders
    FOR INSERT
    WITH CHECK (true);

-- 3. 모든 역할이 SELECT 가능
CREATE POLICY "Allow select for all" ON public.shop_orders
    FOR SELECT
    USING (true);

-- 4. 모든 역할이 UPDATE 가능 (어드민 상태 변경)
CREATE POLICY "Allow update for all" ON public.shop_orders
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
