-- Migration: Fix app_settings RLS Policies
-- Allow public (anonymous) updates and inserts to app_settings table

DROP POLICY IF EXISTS "Allow authenticated updates to app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow authenticated inserts to app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public updates to app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Allow public inserts to app_settings" ON public.app_settings;

CREATE POLICY "Allow public updates to app_settings"
    ON public.app_settings
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow public inserts to app_settings"
    ON public.app_settings
    FOR INSERT
    TO public
    WITH CHECK (true);
