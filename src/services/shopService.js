import { supabase } from './supabaseClient';

// ─── 할인율 (쿠폰 없이 특가 그대로) ──────────────────────────────────────────
// 등급별 자동 할인 제거 — 쿠폰 코드 방식으로 전환

// ── 상품 목록 조회 ────────────────────────────────────────────────────────────
export const fetchShopProducts = async () => {
    if (!supabase) {
        return { data: MOCK_PRODUCTS, error: null };
    }
    const { data, error } = await supabase
        .from('shop_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
    return { data: data || [], error };
};

// ── 주문 저장 ────────────────────────────────────────────────────────────────
export const createOrder = async (orderData) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await supabase
        .from('shop_orders')
        .insert([orderData])
        .select()
        .single();
    return { data, error };
};

// ── 재고 차감 ─────────────────────────────────────────────────────────────────
export const decreaseStock = async (productId, quantity = 1) => {
    if (!supabase) return { error: new Error('Supabase not configured') };
    const { data: product } = await supabase
        .from('shop_products')
        .select('stock')
        .eq('id', productId)
        .single();

    if (!product || product.stock < quantity) {
        return { error: new Error('재고가 부족합니다.') };
    }
    const { error } = await supabase
        .from('shop_products')
        .update({ stock: product.stock - quantity })
        .eq('id', productId);
    return { error };
};

// ── 내 주문 내역 조회 ─────────────────────────────────────────────────────────
export const fetchMyOrders = async (userNickname) => {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
        .from('shop_orders')
        .select('*, shop_products(title, image_url)')
        .eq('user_nickname', userNickname)
        .order('created_at', { ascending: false });
    return { data: data || [], error };
};

// ── 배송지 저장 ───────────────────────────────────────────────────────────────
export const saveAddress = async (addressData) => {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase
        .from('shop_addresses')
        .upsert([addressData], { onConflict: 'user_nickname' })
        .select()
        .single();
    return { data, error };
};

// ── 쿠폰 코드 검증 ───────────────────────────────────────────────────────────
// 반환: { coupon, discountAmount, finalPrice, error }
export const verifyCouponCode = async (code, userGrade, salePrice) => {
    const trimmedCode = code.trim().toUpperCase();

    if (!supabase) {
        // 목업: TEST10 → 10% 할인
        if (trimmedCode === 'TEST10') {
            const discountAmount = Math.floor(salePrice * 0.1);
            return { coupon: { code: 'TEST10', description: '테스트 10% 쿠폰', discount_type: 'pct', discount_value: 10 }, discountAmount, finalPrice: salePrice - discountAmount, error: null };
        }
        return { coupon: null, discountAmount: 0, finalPrice: salePrice, error: new Error('존재하지 않는 쿠폰 코드입니다.') };
    }

    const { data, error } = await supabase
        .from('shop_coupon_codes')
        .select('*')
        .eq('code', trimmedCode)
        .eq('is_active', true)
        .single();

    if (error || !data) {
        return { coupon: null, discountAmount: 0, finalPrice: salePrice, error: new Error('존재하지 않는 쿠폰 코드입니다.') };
    }

    // 만료일 체크
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { coupon: null, discountAmount: 0, finalPrice: salePrice, error: new Error('만료된 쿠폰입니다.') };
    }

    // 사용 횟수 체크
    if (data.max_uses !== null && data.used_count >= data.max_uses) {
        return { coupon: null, discountAmount: 0, finalPrice: salePrice, error: new Error('사용 가능 횟수가 초과된 쿠폰입니다.') };
    }

    // 최소 구매금액 체크
    if (salePrice < data.min_price) {
        return { coupon: null, discountAmount: 0, finalPrice: salePrice, error: new Error(`${data.min_price.toLocaleString()}원 이상 구매 시 사용 가능합니다.`) };
    }

    // 등급 체크
    if (data.target_grade !== 'ALL' && data.target_grade !== userGrade) {
        return { coupon: null, discountAmount: 0, finalPrice: salePrice, error: new Error(`이 쿠폰은 ${data.target_grade} 등급 전용입니다.`) };
    }

    // 할인 금액 계산
    let discountAmount = 0;
    if (data.discount_type === 'pct') {
        discountAmount = Math.floor(salePrice * (data.discount_value / 100));
    } else {
        discountAmount = Math.min(data.discount_value, salePrice);
    }
    const finalPrice = salePrice - discountAmount;

    return { coupon: data, discountAmount, finalPrice, error: null };
};

// ── 쿠폰 사용 기록 저장 (결제 완료 후 호출) ──────────────────────────────────
export const recordCouponUse = async (couponId, userNickname, orderId) => {
    if (!supabase) return { error: null };
    // used_count 증가 (RPC 시도 → 실패 시 직접 update)
    const { error: rpcError } = await supabase.rpc('increment_coupon_count', { coupon_id: couponId });
    if (rpcError) {
        const { data: couponData } = await supabase.from('shop_coupon_codes').select('used_count').eq('id', couponId).single();
        if (couponData) {
            await supabase.from('shop_coupon_codes').update({ used_count: (couponData.used_count || 0) + 1 }).eq('id', couponId);
        }
    }

    const { error } = await supabase.from('shop_coupon_uses').insert([{
        coupon_id: couponId,
        user_nickname: userNickname,
        order_id: orderId,
    }]);
    return { error };
};

// ── 댓글 관리 (Comments) ───────────────────────────────────────────────────────
export const fetchShopProductComments = async (productId) => {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
        .from('shop_product_comments')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true }); // 과거부터 최신순
    return { data: data || [], error };
};

export const addShopProductComment = async (productId, userNickname, userGrade, content) => {
    if (!supabase) return { data: { id: Date.now().toString(), product_id: productId, user_nickname: userNickname, user_grade: userGrade, content, created_at: new Date().toISOString() }, error: null };

    const { data, error } = await supabase
        .from('shop_product_comments')
        .insert([{
            product_id: productId,
            user_nickname: userNickname,
            user_grade: userGrade,
            content: content
        }])
        .select()
        .single();

    return { data, error };
};

export const deleteShopProductComment = async (commentId) => {
    if (!supabase) return { error: null };
    const { error } = await supabase
        .from('shop_product_comments')
        .delete()
        .eq('id', commentId);
    return { error };
};

// ── 리뷰 (Reviews) ────────────────────────────────────────────────────────────

// 상품 승인된 리뷰 목록
export const fetchProductReviews = async (productId) => {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
        .from('shop_product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
    return { data: data || [], error };
};

// 내가 이 상품을 구매했는지 확인 (paid 주문만)
export const fetchMyOrderForProduct = async (userNickname, productId) => {
    if (!supabase) return { data: null, error: null };
    const { data, error } = await supabase
        .from('shop_orders')
        .select('id, status')
        .eq('user_nickname', userNickname)
        .eq('product_id', productId)
        .eq('status', 'paid')
        .maybeSingle();
    return { data: data || null, error };
};

// 이미 리뷰를 작성했는지 확인
export const hasUserReviewedProduct = async (userNickname, productId) => {
    if (!supabase) return false;
    const { data } = await supabase
        .from('shop_product_reviews')
        .select('id')
        .eq('user_nickname', userNickname)
        .eq('product_id', productId)
        .maybeSingle();
    return !!data;
};

// 리뷰 제출 + 리뷰 쿠폰 자동 발급
export const submitProductReview = async (productId, orderId, userNickname, userGrade, rating, content) => {
    if (!supabase) return { data: null, error: new Error('Supabase not configured'), couponCode: null };

    // 고유 쿠폰 코드 생성 (REVIEW + 8자리 랜덤)
    const couponCode = 'REVIEW' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // 리뷰 보상 쿠폰 발행
    await supabase.from('shop_coupon_codes').insert([{
        code: couponCode,
        description: '리뷰 작성 감사 쿠폰 (5% 할인)',
        discount_type: 'pct',
        discount_value: 5,
        min_price: 0,
        target_grade: 'ALL',
        max_uses: 1,
        used_count: 0,
        expires_at: expiresAt.toISOString(),
        is_active: true,
    }]);

    // 리뷰 저장
    const { data, error } = await supabase
        .from('shop_product_reviews')
        .insert([{
            product_id: productId,
            order_id: orderId,
            user_nickname: userNickname,
            user_grade: userGrade,
            rating,
            content,
            is_approved: true,
            review_coupon_code: couponCode,
        }])
        .select()
        .single();

    return { data, error, couponCode };
};

// 어드민: 모든 리뷰 조회
export const fetchAllReviews = async () => {
    if (!supabase) return { data: [], error: null };
    const { data, error } = await supabase
        .from('shop_product_reviews')
        .select('*, shop_products(title)')
        .order('created_at', { ascending: false });
    return { data: data || [], error };
};

// 어드민: 리뷰 승인/숨김 토글
export const toggleReviewApproval = async (reviewId, currentState) => {
    if (!supabase) return { error: null };
    const { error } = await supabase
        .from('shop_product_reviews')
        .update({ is_approved: !currentState })
        .eq('id', reviewId);
    return { error };
};

// 어드민: 리뷰 삭제
export const deleteReview = async (reviewId) => {
    if (!supabase) return { error: null };
    const { error } = await supabase
        .from('shop_product_reviews')
        .delete()
        .eq('id', reviewId);
    return { error };
};

// ── 접근 가능 여부 체크 (VVIP 얼리버드 유지) ─────────────────────────────────
export const EARLY_ACCESS_MINUTES = 30;

export const canAccessProduct = (product, userGrade) => {
    const now = new Date();
    const saleStart = new Date(product.sale_start);
    const earlyStart = new Date(saleStart.getTime() - EARLY_ACCESS_MINUTES * 60000);
    const saleEnd = new Date(product.sale_end);

    // 로그를 통해 시간 비교 현황을 파악하기 쉽게 합니다 (브라우저 콘솔용)
    // console.log(`[${product.title}] now:`, now, 'end:', saleEnd);

    // 날짜가 이미 지났는지 체크
    if (now > saleEnd) return { access: false, reason: 'ended' };

    // 모카 에디트가 아직 시작되지 않았는지 체크 (얼리버드 시간 이전)
    if (now < earlyStart) return { access: false, reason: 'not_started' };

    // 얼리버드 시간 구간 (VVIP만 가능)
    if (now >= earlyStart && now < saleStart && userGrade !== 'VVIP') {
        return { access: false, reason: 'early_only' };
    }

    // 재고 소진 체크
    if (product.stock <= 0) return { access: false, reason: 'sold_out' };

    // 모든 조건 통과 시 오픈
    return { access: true, reason: 'open' };
};

// ── 목업 데이터 ───────────────────────────────────────────────────────────────
const now = new Date();
const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
const in6Hours = new Date(now.getTime() + 6 * 60 * 60 * 1000);
const earlyStart = new Date(now.getTime() - 5 * 60 * 1000);

export const MOCK_PRODUCTS = [
    { id: '1', title: '모카 프리미엄 프로필 촬영권', subtitle: '스튜디오 컨셉 촬영 2시간', image_url: null, original_price: 150000, sale_price: 89000, stock: 5, sale_start: earlyStart.toISOString(), sale_end: inOneHour.toISOString(), min_grade: 'SILVER', badge: 'BEST', is_active: true },
    { id: '2', title: '헤어+메이크업 풀 패키지', subtitle: '제휴 샵 당일 예약 가능', image_url: null, original_price: 120000, sale_price: 72000, stock: 3, sale_start: earlyStart.toISOString(), sale_end: inOneHour.toISOString(), min_grade: 'SILVER', badge: 'HOT', is_active: true },
    { id: '3', title: 'VIP 에스테틱 3회 이용권', subtitle: '피부 관리 & 마사지 풀코스', image_url: null, original_price: 200000, sale_price: 140000, stock: 2, sale_start: earlyStart.toISOString(), sale_end: in6Hours.toISOString(), min_grade: 'VIP', badge: 'VIP 전용', is_active: true },
    { id: '4', title: '포트폴리오 리터칭 패키지', subtitle: '전문 보정사 10장 고화질 리터칭', image_url: null, original_price: 80000, sale_price: 48000, stock: 10, sale_start: earlyStart.toISOString(), sale_end: in6Hours.toISOString(), min_grade: 'SILVER', badge: 'NEW', is_active: true },
];
