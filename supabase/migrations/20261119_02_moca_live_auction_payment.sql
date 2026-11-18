-- 20261119_02_moca_live_auction_payment.sql
-- 경매 2단계: 낙찰자 결제(카드 + 통합포인트), 30분 결제기한, 차순위 넘기기.
-- 결제 상태 변경은 서버(Vercel api/auction-pay, payapp-feedback)가 비밀값(_pay_auth)과 함께 부르는 RPC로만 한다.
-- 그래서 경매 테이블의 공개 쓰기(INSERT/UPDATE/DELETE)를 닫고, 운영자 작업은 관리자 토큰 RPC로 옮긴다.

ALTER TABLE public.moca_live_auction_bids ADD COLUMN IF NOT EXISTS user_id UUID;

ALTER TABLE public.moca_live_auction
    ADD COLUMN IF NOT EXISTS current_bidder_id UUID,
    ADD COLUMN IF NOT EXISTS winner_user_id UUID,
    ADD COLUMN IF NOT EXISTS pay_status TEXT NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS pay_deadline TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS pay_points INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pay_card_amount INTEGER,
    ADD COLUMN IF NOT EXISTS pay_mul_no TEXT,
    ADD COLUMN IF NOT EXISTS pay_type TEXT,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS points_deducted BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS passed_user_ids UUID[] NOT NULL DEFAULT '{}';

-- pay_status: none(낙찰자 없음) | awaiting(결제 대기) | paid | passed(차순위 없음) | cancelled(결제 후 취소)
ALTER TABLE public.moca_live_auction DROP CONSTRAINT IF EXISTS moca_live_auction_pay_status_check;
ALTER TABLE public.moca_live_auction ADD CONSTRAINT moca_live_auction_pay_status_check
    CHECK (pay_status IN ('none', 'awaiting', 'paid', 'passed', 'cancelled'));

-- 공개 쓰기 차단 (SELECT 정책만 유지)
DROP POLICY IF EXISTS "Allow public insert on moca_live_auction" ON public.moca_live_auction;
DROP POLICY IF EXISTS "Allow public update on moca_live_auction" ON public.moca_live_auction;
DROP POLICY IF EXISTS "Allow public delete on moca_live_auction" ON public.moca_live_auction;
REVOKE INSERT, UPDATE, DELETE ON public.moca_live_auction FROM anon, authenticated;

-- 입찰: 회원 ID 필수 (닉네임과 회원이 일치하는지 서버가 확인). 구버전(3인자) 함수는 제거.
DROP FUNCTION IF EXISTS public.place_moca_live_auction_bid(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.place_moca_live_auction_bid(
    p_auction_id UUID,
    p_nickname TEXT,
    p_amount INTEGER,
    p_user_id UUID
)
RETURNS TABLE(current_price INTEGER, ends_at TIMESTAMP WITH TIME ZONE, extensions_used INTEGER, extended BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    a public.moca_live_auction%ROWTYPE;
    v_min INTEGER;
    v_extended BOOLEAN := false;
BEGIN
    IF p_user_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = p_user_id AND (u.nickname = p_nickname OR u.name = p_nickname)
    ) THEN
        RAISE EXCEPTION '로그인이 필요합니다.';
    END IF;

    SELECT * INTO a FROM public.moca_live_auction WHERE id = p_auction_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION '존재하지 않는 경매입니다.';
    END IF;
    IF a.status <> 'open' OR now() >= a.ends_at THEN
        RAISE EXCEPTION '마감된 경매입니다.';
    END IF;
    IF a.current_bidder_id = p_user_id THEN
        RAISE EXCEPTION '이미 최고 입찰자입니다.';
    END IF;

    v_min := CASE WHEN a.bid_count = 0 THEN a.start_price ELSE a.current_price + a.min_increment END;
    IF p_amount IS NULL OR p_amount < v_min THEN
        RAISE EXCEPTION '% 원 이상 입찰해주세요.', v_min;
    END IF;

    INSERT INTO public.moca_live_auction_bids (auction_id, user_nickname, amount, user_id)
    VALUES (p_auction_id, p_nickname, p_amount, p_user_id);

    IF a.extensions_used < a.max_extensions AND a.ends_at - now() <= make_interval(secs => a.extension_sec) THEN
        a.ends_at := a.ends_at + make_interval(secs => a.extension_sec);
        a.extensions_used := a.extensions_used + 1;
        v_extended := true;
    END IF;

    UPDATE public.moca_live_auction
    SET current_price = p_amount,
        current_bidder = p_nickname,
        current_bidder_id = p_user_id,
        bid_count = a.bid_count + 1,
        ends_at = a.ends_at,
        extensions_used = a.extensions_used
    WHERE id = p_auction_id;

    RETURN QUERY SELECT p_amount, a.ends_at, a.extensions_used, v_extended;
END;
$$;

-- 마감 확정: 낙찰자가 있으면 결제 대기(30분)로 전환
CREATE OR REPLACE FUNCTION public.finalize_moca_live_auction(p_auction_id UUID)
RETURNS TABLE(status TEXT, winner_nickname TEXT, winning_price INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    a public.moca_live_auction%ROWTYPE;
BEGIN
    SELECT * INTO a FROM public.moca_live_auction WHERE id = p_auction_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION '존재하지 않는 경매입니다.';
    END IF;

    IF a.status = 'open' AND now() >= a.ends_at THEN
        UPDATE public.moca_live_auction
        SET status = 'closed',
            closed_at = now(),
            winner_nickname = a.current_bidder,
            winner_user_id = a.current_bidder_id,
            winning_price = a.current_price,
            pay_status = CASE WHEN a.current_bidder_id IS NULL THEN 'none' ELSE 'awaiting' END,
            pay_deadline = CASE WHEN a.current_bidder_id IS NULL THEN NULL ELSE now() + interval '30 minutes' END
        WHERE id = p_auction_id
        RETURNING * INTO a;
    END IF;

    RETURN QUERY SELECT a.status, a.winner_nickname, a.winning_price;
END;
$$;

-- ===== 결제 RPC (서버 전용 비밀값 검증, class_pay_* 와 같은 방식) =====

-- 결제 시작: 낙찰자 본인·기한·금액 검증 후 카드금액/사용 포인트 확정. 카드금액은 0이거나 1,000원 이상이어야 한다.
CREATE OR REPLACE FUNCTION public.auction_pay_begin(p_secret TEXT, p_auction_id UUID, p_user_id UUID, p_use_points INTEGER)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a moca_live_auction%ROWTYPE; card INTEGER; ph TEXT; mid TEXT;
BEGIN
    PERFORM _pay_auth(p_secret);
    SELECT * INTO a FROM moca_live_auction WHERE id = p_auction_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION '존재하지 않는 경매입니다.'; END IF;
    IF a.status <> 'closed' OR a.winner_user_id IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION '낙찰자만 결제할 수 있습니다.'; END IF;
    IF a.pay_status <> 'awaiting' THEN RAISE EXCEPTION '결제할 수 없는 상태입니다.'; END IF;
    IF now() > a.pay_deadline THEN RAISE EXCEPTION '결제 가능 시간(30분)이 지났습니다.'; END IF;
    IF p_use_points IS NULL OR p_use_points < 0 OR p_use_points > a.winning_price THEN RAISE EXCEPTION '포인트 사용 금액이 올바르지 않습니다.'; END IF;
    card := a.winning_price - p_use_points;
    IF card > 0 AND card < 1000 THEN RAISE EXCEPTION '카드 결제 금액은 1,000원 이상이어야 합니다. 포인트 사용액을 조정해주세요.'; END IF;
    SELECT phone, master_user_id INTO ph, mid FROM users WHERE id = p_user_id;
    IF p_use_points > 0 AND mid IS NULL THEN RAISE EXCEPTION '통합포인트 계정이 연동되지 않았습니다.'; END IF;
    UPDATE moca_live_auction SET pay_points = p_use_points, pay_card_amount = card, pay_mul_no = NULL WHERE id = a.id;
    RETURN json_build_object('title', a.product_name, 'price', a.winning_price, 'card_amount', card, 'points', p_use_points,
                             'phone', coalesce(ph, ''), 'master_user_id', mid);
END $$;

CREATE OR REPLACE FUNCTION public.auction_pay_attach(p_secret TEXT, p_auction_id UUID, p_mul_no TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM _pay_auth(p_secret);
    UPDATE moca_live_auction SET pay_mul_no = p_mul_no WHERE id = p_auction_id AND pay_status = 'awaiting';
END $$;

-- 결제 확정(웹노티 또는 포인트 전액결제). 멱등. 금액·결제번호 대조. 결제대기 상태가 아니면 'void'(서버가 자동 환불).
CREATE OR REPLACE FUNCTION public.auction_pay_confirm(p_secret TEXT, p_auction_id UUID, p_mul_no TEXT, p_price INTEGER, p_pay_type TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a moca_live_auction%ROWTYPE; mid TEXT;
BEGIN
    PERFORM _pay_auth(p_secret);
    SELECT * INTO a FROM moca_live_auction WHERE id = p_auction_id FOR UPDATE;
    IF NOT FOUND THEN RETURN json_build_object('result', 'unknown'); END IF;
    IF a.pay_status = 'paid' AND a.pay_mul_no = p_mul_no THEN RETURN json_build_object('result', 'already'); END IF;
    IF a.pay_status <> 'awaiting' OR a.pay_mul_no IS DISTINCT FROM p_mul_no THEN RETURN json_build_object('result', 'void'); END IF;
    IF a.pay_card_amount IS NULL OR a.pay_card_amount <> p_price THEN RETURN json_build_object('result', 'mismatch'); END IF;
    UPDATE moca_live_auction SET pay_status = 'paid', paid_at = now(), pay_type = p_pay_type WHERE id = a.id;
    SELECT master_user_id INTO mid FROM users WHERE id = a.winner_user_id;
    RETURN json_build_object('result', 'paid', 'points', a.pay_points, 'master_user_id', mid);
END $$;

CREATE OR REPLACE FUNCTION public.auction_pay_mark_points(p_secret TEXT, p_auction_id UUID, p_deducted BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM _pay_auth(p_secret);
    UPDATE moca_live_auction SET points_deducted = p_deducted WHERE id = p_auction_id;
END $$;

-- 포인트 차감 실패 등으로 결제 확정을 되돌림 (카드는 서버가 별도로 취소)
CREATE OR REPLACE FUNCTION public.auction_pay_revert(p_secret TEXT, p_auction_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM _pay_auth(p_secret);
    UPDATE moca_live_auction SET pay_status = 'awaiting', paid_at = NULL, pay_mul_no = NULL, pay_type = NULL, points_deducted = false
     WHERE id = p_auction_id AND pay_status = 'paid';
END $$;

-- 취소통보(페이앱 사이트에서 환불 등): 결제완료 건만 취소로 표시하고, 돌려줘야 할 포인트 정보를 반환
CREATE OR REPLACE FUNCTION public.auction_pay_cancelled(p_secret TEXT, p_mul_no TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a moca_live_auction%ROWTYPE; mid TEXT;
BEGIN
    PERFORM _pay_auth(p_secret);
    SELECT * INTO a FROM moca_live_auction WHERE pay_mul_no = p_mul_no FOR UPDATE;
    IF NOT FOUND OR a.pay_status <> 'paid' THEN RETURN json_build_object('found', false); END IF;
    UPDATE moca_live_auction SET pay_status = 'cancelled' WHERE id = a.id;
    SELECT master_user_id INTO mid FROM users WHERE id = a.winner_user_id;
    RETURN json_build_object('found', true, 'auction_id', a.id,
                             'refund_points', CASE WHEN a.points_deducted THEN a.pay_points ELSE 0 END, 'master_user_id', mid);
END $$;

-- ===== 운영자 RPC (관리자 토큰 검증) =====

CREATE OR REPLACE FUNCTION public.admin_create_moca_live_auction(
    p_admin_key TEXT, p_live_id UUID, p_product_name TEXT, p_start_price INTEGER, p_min_increment INTEGER,
    p_duration_sec INTEGER, p_max_extensions INTEGER)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
    PERFORM _qna_assert_admin(p_admin_key);
    IF p_duration_sec < 10 OR p_start_price <= 0 OR p_min_increment <= 0 OR p_max_extensions < 0 THEN
        RAISE EXCEPTION '경매 설정값이 올바르지 않습니다.';
    END IF;
    INSERT INTO moca_live_auction (live_id, product_name, start_price, min_increment, max_extensions, ends_at)
    VALUES (p_live_id, btrim(p_product_name), p_start_price, p_min_increment, p_max_extensions, now() + make_interval(secs => p_duration_sec))
    RETURNING id INTO v_id;
    RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_cancel_moca_live_auction(p_admin_key TEXT, p_auction_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM _qna_assert_admin(p_admin_key);
    UPDATE moca_live_auction SET status = 'cancelled', closed_at = now() WHERE id = p_auction_id AND status = 'open';
END $$;

CREATE OR REPLACE FUNCTION public.admin_archive_moca_live_auction(p_admin_key TEXT, p_auction_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    PERFORM _qna_assert_admin(p_admin_key);
    UPDATE moca_live_auction SET status = 'archived' WHERE id = p_auction_id AND status = 'closed';
END $$;

-- 낙찰자 연락처 (결제 안내 문자용)
CREATE OR REPLACE FUNCTION public.admin_auction_winner_info(p_admin_key TEXT, p_auction_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a moca_live_auction%ROWTYPE; ph TEXT;
BEGIN
    PERFORM _qna_assert_admin(p_admin_key);
    SELECT * INTO a FROM moca_live_auction WHERE id = p_auction_id;
    IF NOT FOUND OR a.winner_user_id IS NULL THEN RAISE EXCEPTION '낙찰자가 없습니다.'; END IF;
    SELECT phone INTO ph FROM users WHERE id = a.winner_user_id;
    RETURN json_build_object('phone', coalesce(ph, ''), 'nickname', a.winner_nickname, 'price', a.winning_price, 'deadline', a.pay_deadline);
END $$;

-- 미결제 낙찰자를 건너뛰고 차순위(남은 입찰자 중 최고가)에게 30분 결제기한으로 넘김. 결제완료 건은 불가.
CREATE OR REPLACE FUNCTION public.admin_pass_moca_live_auction(p_admin_key TEXT, p_auction_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a moca_live_auction%ROWTYPE; nxt RECORD; passed UUID[];
BEGIN
    PERFORM _qna_assert_admin(p_admin_key);
    SELECT * INTO a FROM moca_live_auction WHERE id = p_auction_id FOR UPDATE;
    IF NOT FOUND OR a.status <> 'closed' THEN RAISE EXCEPTION '마감된 경매만 넘길 수 있습니다.'; END IF;
    IF a.pay_status = 'paid' THEN RAISE EXCEPTION '이미 결제가 완료된 경매입니다.'; END IF;
    passed := a.passed_user_ids;
    IF a.winner_user_id IS NOT NULL THEN passed := passed || a.winner_user_id; END IF;

    SELECT b.user_id, max(b.amount) AS amount, (array_agg(b.user_nickname ORDER BY b.amount DESC))[1] AS nick
      INTO nxt
      FROM moca_live_auction_bids b
     WHERE b.auction_id = p_auction_id AND b.user_id IS NOT NULL AND NOT (b.user_id = ANY (passed))
     GROUP BY b.user_id
     ORDER BY max(b.amount) DESC, min(b.created_at) ASC
     LIMIT 1;

    IF nxt.user_id IS NULL THEN
        UPDATE moca_live_auction SET passed_user_ids = passed, winner_user_id = NULL, winner_nickname = NULL, winning_price = NULL,
               pay_status = 'passed', pay_deadline = NULL, pay_points = 0, pay_card_amount = NULL, pay_mul_no = NULL
         WHERE id = a.id;
        RETURN json_build_object('next', false);
    END IF;

    UPDATE moca_live_auction SET passed_user_ids = passed, winner_user_id = nxt.user_id, winner_nickname = nxt.nick,
           winning_price = nxt.amount, pay_status = 'awaiting', pay_deadline = now() + interval '30 minutes',
           pay_points = 0, pay_card_amount = NULL, pay_mul_no = NULL, points_deducted = false
     WHERE id = a.id;
    RETURN json_build_object('next', true, 'nickname', nxt.nick, 'price', nxt.amount);
END $$;

REVOKE EXECUTE ON FUNCTION
    public.place_moca_live_auction_bid(UUID, TEXT, INTEGER, UUID),
    public.auction_pay_begin(TEXT, UUID, UUID, INTEGER), public.auction_pay_attach(TEXT, UUID, TEXT),
    public.auction_pay_confirm(TEXT, UUID, TEXT, INTEGER, TEXT), public.auction_pay_mark_points(TEXT, UUID, BOOLEAN),
    public.auction_pay_revert(TEXT, UUID), public.auction_pay_cancelled(TEXT, TEXT),
    public.admin_create_moca_live_auction(TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER),
    public.admin_cancel_moca_live_auction(TEXT, UUID), public.admin_archive_moca_live_auction(TEXT, UUID),
    public.admin_auction_winner_info(TEXT, UUID), public.admin_pass_moca_live_auction(TEXT, UUID)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
    public.place_moca_live_auction_bid(UUID, TEXT, INTEGER, UUID),
    public.auction_pay_begin(TEXT, UUID, UUID, INTEGER), public.auction_pay_attach(TEXT, UUID, TEXT),
    public.auction_pay_confirm(TEXT, UUID, TEXT, INTEGER, TEXT), public.auction_pay_mark_points(TEXT, UUID, BOOLEAN),
    public.auction_pay_revert(TEXT, UUID), public.auction_pay_cancelled(TEXT, TEXT),
    public.admin_create_moca_live_auction(TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER),
    public.admin_cancel_moca_live_auction(TEXT, UUID), public.admin_archive_moca_live_auction(TEXT, UUID),
    public.admin_auction_winner_info(TEXT, UUID), public.admin_pass_moca_live_auction(TEXT, UUID)
TO anon, authenticated;
