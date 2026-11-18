-- 20261119_01_moca_live_auction.sql
-- 모카TV 라이브 경매 (1단계: 입찰/연장/당첨자 확정. 결제 연결은 2단계).
-- 입찰·마감 판정은 전부 이 파일의 RPC에서 서버 시간(now())으로만 수행한다 (클라이언트 시계 불신).
-- bids 테이블은 SELECT만 열고, INSERT는 SECURITY DEFINER RPC로만 가능하다.
-- (auctions 테이블 쓰기는 기존 라이브 기능과 같은 TO public 패턴 - auth.uid() 세션이 없는 앱 구조상 한계)

CREATE TABLE IF NOT EXISTS public.moca_live_auction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    live_id UUID NOT NULL REFERENCES public.moca_live_streams(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    start_price INTEGER NOT NULL CHECK (start_price > 0),
    min_increment INTEGER NOT NULL DEFAULT 500 CHECK (min_increment > 0),
    max_extensions INTEGER NOT NULL DEFAULT 2,
    extension_sec INTEGER NOT NULL DEFAULT 10,
    extensions_used INTEGER NOT NULL DEFAULT 0,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    current_price INTEGER,
    current_bidder TEXT,
    bid_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled', 'archived')),
    winner_nickname TEXT,
    winning_price INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_moca_live_auction_live_id ON public.moca_live_auction(live_id, status);

ALTER TABLE public.moca_live_auction ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on moca_live_auction" ON public.moca_live_auction FOR SELECT TO public USING (true);
CREATE POLICY "Allow public insert on moca_live_auction" ON public.moca_live_auction FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow public update on moca_live_auction" ON public.moca_live_auction FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete on moca_live_auction" ON public.moca_live_auction FOR DELETE TO public USING (true);

CREATE TABLE IF NOT EXISTS public.moca_live_auction_bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id UUID NOT NULL REFERENCES public.moca_live_auction(id) ON DELETE CASCADE,
    user_nickname TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_moca_live_auction_bids_auction ON public.moca_live_auction_bids(auction_id, amount DESC);

ALTER TABLE public.moca_live_auction_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on moca_live_auction_bids" ON public.moca_live_auction_bids FOR SELECT TO public USING (true);

-- 서버 현재 시각 (클라이언트 카운트다운 보정용)
CREATE OR REPLACE FUNCTION public.moca_server_now()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE sql STABLE
AS $$ SELECT now(); $$;

-- 마감 확정: 시간이 지난 open 경매를 closed로 바꾸고 당첨자를 정한다. 멱등이라 누가 몇 번 불러도 안전.
-- 최고 입찰자 = current_bidder (동액이면 먼저 입찰한 사람이 이미 current로 남아 있음 - 같은 금액은 입찰 거부).
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
            winning_price = a.current_price
        WHERE id = p_auction_id
        RETURNING * INTO a;
    END IF;

    RETURN QUERY SELECT a.status, a.winner_nickname, a.winning_price;
END;
$$;

-- 입찰: 서버 시간 기준 검증 + 마감 임박 시 자동 연장(최대 max_extensions회)
CREATE OR REPLACE FUNCTION public.place_moca_live_auction_bid(
    p_auction_id UUID,
    p_nickname TEXT,
    p_amount INTEGER
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
    IF p_nickname IS NULL OR btrim(p_nickname) = '' THEN
        RAISE EXCEPTION '로그인이 필요합니다.';
    END IF;

    SELECT * INTO a FROM public.moca_live_auction WHERE id = p_auction_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION '존재하지 않는 경매입니다.';
    END IF;
    IF a.status <> 'open' OR now() >= a.ends_at THEN
        RAISE EXCEPTION '마감된 경매입니다.';
    END IF;
    IF a.current_bidder = p_nickname THEN
        RAISE EXCEPTION '이미 최고 입찰자입니다.';
    END IF;

    v_min := CASE WHEN a.bid_count = 0 THEN a.start_price ELSE a.current_price + a.min_increment END;
    IF p_amount IS NULL OR p_amount < v_min THEN
        RAISE EXCEPTION '% 원 이상 입찰해주세요.', v_min;
    END IF;

    INSERT INTO public.moca_live_auction_bids (auction_id, user_nickname, amount)
    VALUES (p_auction_id, p_nickname, p_amount);

    -- 마감 직전 입찰이면 연장 (extension_sec 이내 + 횟수 남음)
    IF a.extensions_used < a.max_extensions AND a.ends_at - now() <= make_interval(secs => a.extension_sec) THEN
        a.ends_at := a.ends_at + make_interval(secs => a.extension_sec);
        a.extensions_used := a.extensions_used + 1;
        v_extended := true;
    END IF;

    UPDATE public.moca_live_auction
    SET current_price = p_amount,
        current_bidder = p_nickname,
        bid_count = a.bid_count + 1,
        ends_at = a.ends_at,
        extensions_used = a.extensions_used
    WHERE id = p_auction_id;

    RETURN QUERY SELECT p_amount, a.ends_at, a.extensions_used, v_extended;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_moca_live_auction(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.place_moca_live_auction_bid(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_moca_live_auction(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_moca_live_auction_bid(UUID, TEXT, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moca_server_now() TO anon, authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.moca_live_auction;
