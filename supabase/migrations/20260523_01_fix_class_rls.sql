-- 20260523_01_fix_class_rls.sql
-- Fix RLS policies for class_applications and class_calendar_events tables
-- to allow public (anonymous client) operations since authentication is managed in-app.

-- 1. Drop current authenticated-only policies for class_applications
DROP POLICY IF EXISTS "Admin read all applications" ON public.class_applications;
DROP POLICY IF EXISTS "Admin update applications" ON public.class_applications;
DROP POLICY IF EXISTS "Users browse own applications" ON public.class_applications;
DROP POLICY IF EXISTS "Users create own applications" ON public.class_applications;

-- 2. Create public policies for class_applications
CREATE POLICY "Allow public select on class_applications" ON public.class_applications
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert on class_applications" ON public.class_applications
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public update on class_applications" ON public.class_applications
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete on class_applications" ON public.class_applications
  FOR DELETE TO public USING (true);


-- 3. Drop current auth.uid() dependent policies for class_calendar_events
DROP POLICY IF EXISTS "Users can view own class events" ON public.class_calendar_events;
DROP POLICY IF EXISTS "Users can insert own class events" ON public.class_calendar_events;
DROP POLICY IF EXISTS "Users can delete own class events" ON public.class_calendar_events;

-- 4. Create public policies for class_calendar_events
CREATE POLICY "Allow public select on class_calendar_events" ON public.class_calendar_events
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert on class_calendar_events" ON public.class_calendar_events
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Allow public delete on class_calendar_events" ON public.class_calendar_events
  FOR DELETE TO public USING (true);
