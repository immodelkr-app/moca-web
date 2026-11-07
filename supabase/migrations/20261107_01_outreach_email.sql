-- 20261107_01_outreach_email.sql
-- 업체 대상 모카캐스팅 홍보 메일 발송 + 반응(열람/클릭/반송) 모니터링
-- 테이블은 전부 RLS 잠금(정책 없음): 읽기/쓰기는 Edge Function(service role)만 한다.
-- 공개 호출이 필요한 건 토큰 기반 RPC 2개(클릭 기록, 수신거부)뿐이다.

-- 1. 캠페인
CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 업체별 발송 1건 (캠페인 + 이메일 단위로 중복 발송 방지)
CREATE TABLE IF NOT EXISTS public.email_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    company_name TEXT,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
    batch_no INT NOT NULL DEFAULT 1,
    resend_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued', -- queued | sent | delivered | bounced | complained | failed
    error TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    open_count INT NOT NULL DEFAULT 0,
    click_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (campaign_id, email)
);
CREATE INDEX IF NOT EXISTS idx_email_sends_resend_id ON public.email_sends(resend_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign ON public.email_sends(campaign_id, batch_no);

-- 3. 이벤트 원본 로그 (웹훅/클릭)
CREATE TABLE IF NOT EXISTS public.email_events (
    id BIGSERIAL PRIMARY KEY,
    send_id UUID NOT NULL REFERENCES public.email_sends(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- delivered | opened | clicked | bounced | complained
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 수신거부 (이메일 단위, 캠페인과 무관하게 영구 제외)
CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS 잠금: 정책을 만들지 않아 anon/authenticated는 직접 접근 불가 (service role만 가능)
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.email_campaigns, public.email_sends, public.email_events, public.email_unsubscribes FROM anon, authenticated;

-- 5. 클릭 기록 (메일의 버튼 링크 /r/:token 페이지가 호출. 토큰은 추측 불가한 24자리 hex)
CREATE OR REPLACE FUNCTION public.outreach_click(p_token TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
    UPDATE email_sends
       SET clicked_at = COALESCE(clicked_at, now()), click_count = click_count + 1
     WHERE token = p_token
     RETURNING id INTO v_id;
    IF v_id IS NOT NULL THEN
        INSERT INTO email_events (send_id, type) VALUES (v_id, 'clicked');
    END IF;
END;
$$;

-- 6. 수신거부 (메일 하단 링크 /unsubscribe/:token 페이지가 호출). 업체명을 돌려줘 확인 문구에 쓴다.
CREATE OR REPLACE FUNCTION public.outreach_unsubscribe(p_token TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email TEXT; v_name TEXT;
BEGIN
    SELECT email, company_name INTO v_email, v_name FROM email_sends WHERE token = p_token;
    IF v_email IS NULL THEN
        RETURN NULL;
    END IF;
    INSERT INTO email_unsubscribes (email) VALUES (lower(v_email)) ON CONFLICT DO NOTHING;
    RETURN COALESCE(v_name, '');
END;
$$;

REVOKE ALL ON FUNCTION public.outreach_click(TEXT) FROM public;
REVOKE ALL ON FUNCTION public.outreach_unsubscribe(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.outreach_click(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_unsubscribe(TEXT) TO anon, authenticated;
