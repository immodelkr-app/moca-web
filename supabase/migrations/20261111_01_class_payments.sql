-- 모카클래스 카드결제(페이앱). 클래스별로 online_payment=true 일 때만 결제 흐름 사용, 기본값은 기존 '신청만 받기'.
-- 결제 확정/환불은 서버(Vercel api/class-pay, payapp-feedback)만 RPC로 처리한다.
-- RPC는 서버 전용 비밀값(app_secrets 'payapp_rpc')을 검증한다. 비밀값은 이 파일에 넣지 않고 DB와 Vercel 환경변수(PAYAPP_RPC_SECRET)에만 둔다.
ALTER TABLE public.classes ADD COLUMN IF NOT EXISTS online_payment BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.app_secrets (name TEXT PRIMARY KEY, value TEXT NOT NULL);
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;           -- 정책 없음 = anon/authenticated 접근 불가
REVOKE ALL ON public.app_secrets FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.class_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.class_applications(id) ON DELETE CASCADE,
    class_id UUID NOT NULL,
    user_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    product_kind TEXT NOT NULL DEFAULT 'service',      -- 'service'(클래스) | 'goods' | 'digital' (2027 유료등급·강의 대비)
    status TEXT NOT NULL DEFAULT 'requested',           -- requested | paid | cancelled | overbooked
    payapp_mul_no TEXT UNIQUE,
    pay_type TEXT,
    paid_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    settlement_return_needed BOOLEAN NOT NULL DEFAULT false, -- D+5 경과 후 취소: 정산금 반환 필요(paycancelreq)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.class_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.class_payments FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public._pay_auth(p_secret TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app_secrets WHERE name = 'payapp_rpc' AND value = p_secret) THEN
        RAISE EXCEPTION 'forbidden';
    END IF;
END $$;

-- 수업 시작시각(KST). 날짜옵션형은 선택한 날짜 중 가장 빠른 것, 아니면 event_datetime. 알 수 없으면 NULL.
CREATE OR REPLACE FUNCTION public._class_start_at(p_class UUID, p_sel JSONB) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c classes%ROWTYPE; r TIMESTAMPTZ;
BEGIN
    SELECT * INTO c FROM classes WHERE id = p_class;
    IF c.date_options IS NOT NULL AND jsonb_array_length(c.date_options) > 0 THEN
        SELECT min((o->>'date' || ' ' || coalesce(nullif(o->>'time',''), '00:00') || ' Asia/Seoul')::timestamptz) INTO r
          FROM jsonb_array_elements(c.date_options) o
         WHERE p_sel @> jsonb_build_array(jsonb_build_object('id', o->>'id')) AND coalesce(o->>'date','') <> '';
        RETURN r;
    END IF;
    RETURN c.event_datetime;
END $$;

-- 1) 결제 시작: 금액 검증 후 결제기록 생성. 금액은 class_pricing 또는 정액 price_info 와 일치하는 값만 허용(임의 금액 차단).
CREATE OR REPLACE FUNCTION public.class_pay_begin(p_secret TEXT, p_application_id UUID, p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a class_applications%ROWTYPE; c classes%ROWTYPE; pid UUID; ph TEXT;
BEGIN
    PERFORM _pay_auth(p_secret);
    SELECT * INTO a FROM class_applications WHERE id = p_application_id AND user_id = p_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION '신청 내역이 없습니다.'; END IF;
    IF a.approval_status <> 'awaiting_payment' THEN RAISE EXCEPTION '결제할 수 없는 신청 상태입니다.'; END IF;
    SELECT * INTO c FROM classes WHERE id = a.class_id;
    IF NOT c.online_payment THEN RAISE EXCEPTION '카드결제를 받지 않는 클래스입니다.'; END IF;
    IF a.applied_price IS NULL OR a.applied_price <= 0
       OR NOT (EXISTS (SELECT 1 FROM class_pricing WHERE class_id = a.class_id AND price = a.applied_price)
               OR a.applied_price = nullif(regexp_replace(coalesce(c.price_info, ''), '[^0-9]', '', 'g'), '')::int) THEN
        RAISE EXCEPTION '결제 금액이 올바르지 않습니다.';
    END IF;
    UPDATE class_payments SET status = 'cancelled', cancel_reason = '재시도로 대체'
     WHERE application_id = a.id AND status = 'requested';
    INSERT INTO class_payments (application_id, class_id, user_id, amount)
    VALUES (a.id, a.class_id, a.user_id, a.applied_price) RETURNING id INTO pid;
    SELECT phone INTO ph FROM users WHERE id = a.user_id;
    RETURN json_build_object('payment_id', pid, 'class_id', a.class_id, 'amount', a.applied_price, 'title', c.title,
                             'phone', coalesce(nullif(a.user_phone, ''), ph, ''));
END $$;

CREATE OR REPLACE FUNCTION public.class_pay_attach(p_secret TEXT, p_payment_id UUID, p_mul_no TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM _pay_auth(p_secret);
    UPDATE class_payments SET payapp_mul_no = p_mul_no WHERE id = p_payment_id AND status = 'requested';
END $$;

-- 2) 결제 확정(웹노티 pay_state=4). 멱등. 금액 대조 + 정원 재검증, 초과면 'overbooked' 반환(서버가 자동환불).
CREATE OR REPLACE FUNCTION public.class_pay_confirm(p_secret TEXT, p_payment_id UUID, p_mul_no TEXT, p_price INTEGER, p_pay_type TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p class_payments%ROWTYPE; c classes%ROWTYPE; used INT;
BEGIN
    PERFORM _pay_auth(p_secret);
    SELECT * INTO p FROM class_payments WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN RETURN 'unknown'; END IF;
    IF p.status = 'paid' THEN RETURN 'already'; END IF;
    IF p.amount <> p_price THEN RETURN 'mismatch'; END IF;
    SELECT * INTO c FROM classes WHERE id = p.class_id;

    BEGIN
        IF c.date_options IS NULL OR jsonb_array_length(c.date_options) = 0 THEN
            PERFORM pg_advisory_xact_lock(hashtext(p.class_id::text));
            SELECT count(*) INTO used FROM class_applications
             WHERE class_id = p.class_id AND id <> p.application_id AND approval_status IN ('pending','approved','paid');
            IF c.capacity IS NOT NULL AND used >= c.capacity THEN RAISE EXCEPTION '정원 마감'; END IF;
        END IF;
        -- 날짜옵션형은 기존 트리거(check_class_date_capacity)가 날짜별 정원을 검증하고 초과 시 예외를 던진다.
        UPDATE class_applications SET approval_status = 'paid', payment_status = 'paid', paid_at = now(),
               payment_type = 'payapp', approved_at = coalesce(approved_at, now())
         WHERE id = p.application_id;
    EXCEPTION WHEN OTHERS THEN
        UPDATE class_payments SET status = 'overbooked', payapp_mul_no = p_mul_no, pay_type = p_pay_type, paid_at = now() WHERE id = p.id;
        UPDATE class_applications SET approval_status = 'waitlisted', payment_status = 'pending' WHERE id = p.application_id;
        RETURN 'overbooked';
    END;
    UPDATE class_payments SET status = 'paid', payapp_mul_no = p_mul_no, pay_type = p_pay_type, paid_at = now() WHERE id = p.id;
    RETURN 'paid';
END $$;

-- 3) 취소 반영(웹노티 취소통보 또는 서버가 환불 성공 후 호출). 멱등.
CREATE OR REPLACE FUNCTION public.class_pay_mark_cancelled(p_secret TEXT, p_mul_no TEXT, p_reason TEXT, p_settlement_return BOOLEAN DEFAULT false)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p class_payments%ROWTYPE;
BEGIN
    PERFORM _pay_auth(p_secret);
    SELECT * INTO p FROM class_payments WHERE payapp_mul_no = p_mul_no FOR UPDATE;
    IF NOT FOUND OR p.status = 'cancelled' THEN RETURN; END IF;
    UPDATE class_payments SET status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason,
           settlement_return_needed = p_settlement_return WHERE id = p.id;
    -- overbooked 건은 대기 상태 유지, 그 외에는 신청 취소
    IF p.status <> 'overbooked' THEN
        UPDATE class_applications SET approval_status = 'cancelled', payment_status = 'cancelled' WHERE id = p.application_id;
    END IF;
END $$;

-- 4) 사용자 환불 가능 여부: 수업 시작 72시간 전까지 전액. 시작시각을 모르면 자동환불 불가(문의 안내).
CREATE OR REPLACE FUNCTION public.class_pay_refund_info(p_secret TEXT, p_application_id UUID, p_user_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a class_applications%ROWTYPE; p class_payments%ROWTYPE; s TIMESTAMPTZ;
BEGIN
    PERFORM _pay_auth(p_secret);
    SELECT * INTO a FROM class_applications WHERE id = p_application_id AND user_id = p_user_id;
    IF NOT FOUND THEN RAISE EXCEPTION '신청 내역이 없습니다.'; END IF;
    SELECT * INTO p FROM class_payments WHERE application_id = a.id AND status = 'paid' ORDER BY paid_at DESC LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION '결제 완료된 내역이 없습니다.'; END IF;
    s := _class_start_at(a.class_id, a.selected_dates);
    RETURN json_build_object('mul_no', p.payapp_mul_no, 'amount', p.amount, 'paid_at', p.paid_at,
        'start_at', s, 'refundable', (s IS NOT NULL AND now() <= s - interval '72 hours'),
        'settled', (p.paid_at < now() - interval '5 days'));
END $$;

GRANT EXECUTE ON FUNCTION public.class_pay_begin(TEXT, UUID, UUID), public.class_pay_attach(TEXT, UUID, TEXT),
  public.class_pay_confirm(TEXT, UUID, TEXT, INTEGER, TEXT), public.class_pay_mark_cancelled(TEXT, TEXT, TEXT, BOOLEAN),
  public.class_pay_refund_info(TEXT, UUID, UUID) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._pay_auth(TEXT), public._class_start_at(UUID, JSONB) FROM anon, authenticated, public;
