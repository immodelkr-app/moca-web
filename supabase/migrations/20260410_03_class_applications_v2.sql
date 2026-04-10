-- 019 class_applications_v2.sql
-- Add approval status columns and user phone snapshot

ALTER TABLE public.class_applications
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS user_phone TEXT,
  ADD COLUMN IF NOT EXISTS admin_memo TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS blogpay_url TEXT;

-- approval_status values: 'pending' | 'approved' | 'paid' | 'cancelled'
-- Migrate existing payment_status values
UPDATE public.class_applications
SET approval_status = CASE
  WHEN payment_status = 'paid' THEN 'paid'
  WHEN payment_status = 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END
WHERE approval_status = 'pending';

-- Policy: admin can read all applications
DROP POLICY IF EXISTS "Admin read all applications" ON public.class_applications;
CREATE POLICY "Admin read all applications" ON public.class_applications
  FOR SELECT TO authenticated
  USING (true);

-- Policy: admin can update
DROP POLICY IF EXISTS "Admin update applications" ON public.class_applications;
CREATE POLICY "Admin update applications" ON public.class_applications
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
