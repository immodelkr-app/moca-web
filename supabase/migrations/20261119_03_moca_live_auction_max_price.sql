-- 경매 상한가: max_price가 있으면 그 금액을 넘는 입찰은 거부하고, 상한가로 입찰하면 즉시 마감(낙찰).
-- NULL이면 상한 없음(기존 동작).
ALTER TABLE public.moca_live_auction ADD COLUMN IF NOT EXISTS max_price INTEGER CHECK (max_price IS NULL OR max_price > 0);

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
    -- 상한가가 있으면 최소 입찰가가 상한가를 넘지 않게 (상한가 자체는 항상 입찰 가능)
    IF a.max_price IS NOT NULL THEN v_min := LEAST(v_min, a.max_price); END IF;
    IF p_amount IS NULL OR p_amount < v_min THEN
        RAISE EXCEPTION '% 원 이상 입찰해주세요.', v_min;
    END IF;
    IF a.max_price IS NOT NULL AND p_amount > a.max_price THEN
        RAISE EXCEPTION '상한가는 % 원입니다.', a.max_price;
    END IF;

    INSERT INTO public.moca_live_auction_bids (auction_id, user_nickname, amount, user_id)
    VALUES (p_auction_id, p_nickname, p_amount, p_user_id);

    IF a.max_price IS NOT NULL AND p_amount = a.max_price THEN
        a.ends_at := now(); -- 상한가 도달: 즉시 마감
    ELSIF a.extensions_used < a.max_extensions AND a.ends_at - now() <= make_interval(secs => a.extension_sec) THEN
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

-- 등록 RPC: p_max_price 추가 (구 7인자 버전은 제거)
DROP FUNCTION IF EXISTS public.admin_create_moca_live_auction(TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.admin_create_moca_live_auction(
    p_admin_key TEXT, p_live_id UUID, p_product_name TEXT, p_start_price INTEGER, p_min_increment INTEGER,
    p_duration_sec INTEGER, p_max_extensions INTEGER, p_max_price INTEGER DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
    PERFORM _qna_assert_admin(p_admin_key);
    IF p_duration_sec < 10 OR p_start_price <= 0 OR p_min_increment <= 0 OR p_max_extensions < 0 THEN
        RAISE EXCEPTION '경매 설정값이 올바르지 않습니다.';
    END IF;
    IF p_max_price IS NOT NULL AND p_max_price <= p_start_price THEN
        RAISE EXCEPTION '상한가는 시작가보다 커야 합니다.';
    END IF;
    INSERT INTO moca_live_auction (live_id, product_name, start_price, min_increment, max_extensions, max_price, ends_at)
    VALUES (p_live_id, btrim(p_product_name), p_start_price, p_min_increment, p_max_extensions, p_max_price, now() + make_interval(secs => p_duration_sec))
    RETURNING id INTO v_id;
    RETURN v_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_create_moca_live_auction(TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_moca_live_auction(TEXT, UUID, TEXT, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER) TO anon, authenticated;
