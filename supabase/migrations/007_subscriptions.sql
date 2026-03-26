-- subscriptions 테이블 생성
-- Supabase SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    user_nickname text NOT NULL,
    plan_id text NOT NULL,         -- 'gold_1m', 'gold_3m', 'gold_6m', 'gold_12m'
    months int4 NOT NULL,
    price int4 NOT NULL,
    payment_key text,
    order_id text,
    status text DEFAULT 'active',  -- 'active', 'expired', 'cancelled'
    started_at timestamptz DEFAULT now(),
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- RLS 정책
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for subscriptions" ON public.subscriptions
    FOR ALL USING (true) WITH CHECK (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);
