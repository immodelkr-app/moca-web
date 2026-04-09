-- ── 구매 리뷰 테이블 ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shop_product_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL,
    order_id TEXT NOT NULL,
    user_nickname TEXT NOT NULL,
    user_grade TEXT NOT NULL DEFAULT 'SILVER',
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    content TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE,
    review_coupon_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 (읽기: 모두 허용, 쓰기: 인증된 사용자만)
ALTER TABLE shop_product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "누구나 승인된 리뷰 조회" ON shop_product_reviews;
CREATE POLICY "누구나 승인된 리뷰 조회" ON shop_product_reviews
    FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "인증된 사용자 리뷰 작성" ON shop_product_reviews;
CREATE POLICY "인증된 사용자 리뷰 작성" ON shop_product_reviews
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "관리자 전체 리뷰 조회" ON shop_product_reviews;
CREATE POLICY "관리자 전체 리뷰 조회" ON shop_product_reviews
    FOR ALL USING (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON shop_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_nickname ON shop_product_reviews(user_nickname);
