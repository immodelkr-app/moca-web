-- ============================================================
-- 전체 테이블 anon/authenticated 역할 GRANT 수정
-- 문제: RLS 정책만 있고 GRANT가 없어 anon 역할 INSERT/SELECT 차단됨
-- Supabase 대시보드 > SQL Editor 에서 전체 복사 후 실행하세요.
-- ============================================================

-- ═══ shop_orders ═══
GRANT SELECT, INSERT, UPDATE ON public.shop_orders TO anon;
GRANT SELECT, INSERT, UPDATE ON public.shop_orders TO authenticated;

ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for all" ON public.shop_orders;
DROP POLICY IF EXISTS "Allow select for all" ON public.shop_orders;
DROP POLICY IF EXISTS "Allow update for all" ON public.shop_orders;

CREATE POLICY "Allow insert for all" ON public.shop_orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select for all" ON public.shop_orders
    FOR SELECT USING (true);

CREATE POLICY "Allow update for all" ON public.shop_orders
    FOR UPDATE USING (true) WITH CHECK (true);

-- ═══ shop_products ═══
GRANT SELECT, UPDATE ON public.shop_products TO anon;
GRANT SELECT, UPDATE ON public.shop_products TO authenticated;

-- ═══ shop_coupon_codes ═══
GRANT SELECT, INSERT, UPDATE ON public.shop_coupon_codes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.shop_coupon_codes TO authenticated;

-- ═══ shop_coupon_uses (존재할 때만) ═══
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shop_coupon_uses') THEN
        EXECUTE 'GRANT SELECT, INSERT ON public.shop_coupon_uses TO anon';
        EXECUTE 'GRANT SELECT, INSERT ON public.shop_coupon_uses TO authenticated';
    END IF;
END $$;

-- ═══ subscriptions ═══
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for subscriptions" ON public.subscriptions;
CREATE POLICY "Allow all for subscriptions" ON public.subscriptions
    FOR ALL USING (true) WITH CHECK (true);

-- ═══ 확인 쿼리 ═══
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('shop_orders', 'subscriptions');
