DROP POLICY IF EXISTS "Public Select shop_products" ON public.shop_products;
DROP POLICY IF EXISTS "Public Insert shop_products" ON public.shop_products;
DROP POLICY IF EXISTS "Public Update shop_products" ON public.shop_products;
DROP POLICY IF EXISTS "Public Delete shop_products" ON public.shop_products;

CREATE POLICY "Enable ALL access for all users" ON public.shop_products FOR ALL USING (true) WITH CHECK (true);
