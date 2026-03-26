import React, { useState, useEffect } from 'react';
import { fetchProductReviews, fetchMyOrderForProduct, hasUserReviewedProduct, submitProductReview } from '../../services/shopService';
import { getUser } from '../../services/userService';

const isImageUrl = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase().split('?')[0];
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') ||
        lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.gif');
};

const StarRating = ({ value, onChange, readonly = false }) => (
    <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
            <button
                key={star}
                type="button"
                onClick={() => !readonly && onChange && onChange(star)}
                className={`text-2xl leading-none transition-transform ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} ${star <= value ? 'text-yellow-400' : 'text-white/20'}`}
            >
                ★
            </button>
        ))}
    </div>
);

const PolicyAccordion = ({ icon, title, children, color = 'white' }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[16px] text-${color}-400`}>{icon}</span>
                    <span className="text-white/80 text-sm font-bold">{title}</span>
                </div>
                <span className={`material-symbols-outlined text-white/30 text-[18px] transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            {open && <div className="px-4 pb-4 pt-1 border-t border-white/5">{children}</div>}
        </div>
    );
};

const PolicyItem = ({ mark = '•', children }) => (
    <li className="flex gap-2 text-white/55 text-xs leading-relaxed">
        <span className="text-white/30 shrink-0">{mark}</span>
        <span>{children}</span>
    </li>
);

const ProductDetailModal = ({ product, onClose, onBuyClick }) => {
    const [iframeError, setIframeError] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [myOrder, setMyOrder] = useState(null);
    const [alreadyReviewed, setAlreadyReviewed] = useState(false);
    const [rating, setRating] = useState(5);
    const [reviewContent, setReviewContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [issuedCoupon, setIssuedCoupon] = useState(null);
    const [copied, setCopied] = useState(false);
    const [loadingReviews, setLoadingReviews] = useState(true);

    const user = getUser();
    const userNickname = user?.nickname || '';
    const userGrade = user?.grade || 'SILVER';

    const detail = product.detail_content;
    const detailIsImage = isImageUrl(detail);
    const discountPct = Math.round((1 - product.sale_price / product.original_price) * 100);

    useEffect(() => {
        const load = async () => {
            setLoadingReviews(true);
            const { data } = await fetchProductReviews(product.id);
            setReviews(data || []);

            if (userNickname) {
                const { data: order } = await fetchMyOrderForProduct(userNickname, product.id);
                setMyOrder(order);
                if (order) {
                    const reviewed = await hasUserReviewedProduct(userNickname, product.id);
                    setAlreadyReviewed(reviewed);
                }
            }
            setLoadingReviews(false);
        };
        load();
    }, [product.id, userNickname]);

    const handleOpenExternal = () => window.open(detail, '_blank', 'noopener,noreferrer');

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!reviewContent.trim() || isSubmitting || !myOrder) return;
        setIsSubmitting(true);
        const { data, error, couponCode } = await submitProductReview(
            product.id, myOrder.id, userNickname, userGrade, rating, reviewContent.trim()
        );
        if (!error && data) {
            setReviews(prev => [data, ...prev]);
            setAlreadyReviewed(true);
            setReviewContent('');
            setIssuedCoupon(couponCode);
        } else {
            alert('리뷰 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
        setIsSubmitting(false);
    };

    const handleCopyCoupon = () => {
        navigator.clipboard.writeText(issuedCoupon).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return `${d.getMonth() + 1}.${d.getDate()}. ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : null;

    return (
        <div className="fixed inset-0 z-[350] flex flex-col bg-[#0f0f1a] animate-fade-in sm:items-center sm:justify-center">
            <div className="w-full h-full sm:max-w-md sm:h-[90vh] bg-[#0f0f1a] sm:rounded-3xl flex flex-col overflow-hidden relative shadow-2xl">

                {/* 상단 고정 헤더 */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors border border-white/10">
                        <span className="material-symbols-outlined text-[20px]">ios_share</span>
                    </button>
                </div>

                {/* 메인 스크롤 콘텐츠 */}
                <div className="flex-1 overflow-y-auto pb-28">

                    {/* 1. 히어로 이미지 */}
                    <div className="w-full aspect-[4/3] bg-black relative">
                        {product.image_url ? (
                            <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex justify-center items-center bg-purple-900/40">
                                <span className="material-symbols-outlined text-purple-400 text-6xl">storefront</span>
                            </div>
                        )}
                    </div>

                    {/* 2. 상품 정보 */}
                    <div className="px-5 py-6 bg-[#0f0f1a]">
                        <h1 className="text-white font-black text-2xl leading-tight mb-2">{product.title}</h1>
                        {product.subtitle && (
                            <p className="text-white/50 text-sm mb-3 leading-relaxed">{product.subtitle}</p>
                        )}
                        {avgRating && (
                            <div className="flex items-center gap-1.5 mb-3">
                                <span className="text-yellow-400 text-sm">★</span>
                                <span className="text-white font-bold text-sm">{avgRating}</span>
                                <span className="text-white/40 text-xs">({reviews.length}개 리뷰)</span>
                            </div>
                        )}
                        <div className="flex items-end gap-2 mt-4">
                            <span className="text-orange-400 font-black text-3xl">{discountPct}%</span>
                            <span className="text-white font-black text-3xl">
                                {Number(product.sale_price).toLocaleString()}
                                <span className="text-xl ml-1 font-normal text-white/80">원</span>
                            </span>
                        </div>
                        <div className="mt-1">
                            <span className="text-white/30 text-sm line-through">
                                정가 {Number(product.original_price).toLocaleString()}원
                            </span>
                        </div>
                    </div>

                    <div className="w-full h-2 bg-black/40"></div>

                    {/* 3. 상세 설명 */}
                    <div className="w-full py-6">
                        <div className="px-5 mb-4 border-l-2 border-purple-500 ml-5 pl-3 w-max">
                            <h2 className="text-white font-bold text-lg">상품 상세 정보</h2>
                        </div>

                        {!detail ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                                <span className="material-symbols-outlined text-white/10 text-4xl mb-2">description</span>
                                <p className="text-white/30 text-sm">등록된 상세 이미지가 없습니다.</p>
                            </div>
                        ) : detailIsImage ? (
                            <img src={detail} alt="상세 설명" className="w-full h-auto block" />
                        ) : (
                            <div className="px-5 flex flex-col">
                                <div className="flex items-center justify-between mb-3 bg-white/5 p-3 rounded-xl border border-white/10">
                                    <p className="text-white/40 text-[11px] truncate flex-1 mr-2">{detail}</p>
                                    <button
                                        onClick={handleOpenExternal}
                                        className="flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
                                    >
                                        <span className="material-symbols-outlined text-sm">open_in_new</span>새 탭
                                    </button>
                                </div>
                                {!iframeError ? (
                                    <iframe
                                        src={detail}
                                        title={product.title}
                                        className="w-full bg-white rounded-xl"
                                        style={{ minHeight: '600px' }}
                                        onError={() => setIframeError(true)}
                                        sandbox="allow-scripts allow-same-origin allow-popups"
                                    />
                                ) : (
                                    <div className="py-10 text-center border border-white/10 rounded-xl bg-white/5">
                                        <p className="text-white/50 text-sm mb-4">외부 사이트 정책으로 앱 내 미리보기가 차단되었습니다.</p>
                                        <button onClick={handleOpenExternal} className="px-5 py-2.5 bg-indigo-500 rounded-xl text-white font-bold text-sm">
                                            외부 브라우저에서 보기
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="w-full h-2 bg-black/40"></div>

                    {/* 4. 교환 · 반품 · 취소 · 환불 정책 */}
                    <div className="px-5 py-6 bg-[#0f0f1a]">
                        <div className="px-0 mb-4 border-l-2 border-orange-500 pl-3">
                            <h2 className="text-white font-bold text-base">교환 · 반품 · 취소 · 환불 정책</h2>
                            <p className="text-white/30 text-[11px] mt-0.5">전자상거래법에 따른 소비자 권리 안내</p>
                        </div>
                        <div className="space-y-2">
                            {/* 결제 취소 */}
                            <PolicyAccordion icon="cancel" title="결제 취소" color="blue">
                                <ul className="space-y-1.5 mt-2">
                                    <PolicyItem mark="①">배송 시작 전: 주문 완료 후 배송 준비 전까지 100% 전액 취소 가능합니다.</PolicyItem>
                                    <PolicyItem mark="②">이용약관 신청 후 회사로부터 상담이 제공되지 않은 경우 결제 취소가 가능합니다.</PolicyItem>
                                    <PolicyItem mark="③">취소 신청은 고객센터(immodelkr@gmail.com)로 주문번호를 포함하여 연락 주세요.</PolicyItem>
                                </ul>
                            </PolicyAccordion>

                            {/* 반품 / 교환 */}
                            <PolicyAccordion icon="swap_horiz" title="반품 · 교환" color="emerald">
                                <ul className="space-y-1.5 mt-2">
                                    <PolicyItem mark="①">상품 수령 후 <strong className="text-white">3일 이내</strong> 반품·교환 신청이 가능합니다.</PolicyItem>
                                    <PolicyItem mark="②">단순 변심 반품: 미개봉·미사용 상태에 한하며, <strong className="text-white">왕복 배송비는 고객 부담</strong>입니다.</PolicyItem>
                                    <PolicyItem mark="③">상품 하자·오배송: 수령 후 3일 이내 사진 첨부 후 고객센터 접수 시 <strong className="text-white">배송비 전액 회사 부담</strong>으로 교환 또는 환불 처리합니다.</PolicyItem>
                                    <PolicyItem mark="④">개봉 후 사용한 상품은 단순 변심으로 인한 반품·교환이 불가합니다.</PolicyItem>
                                </ul>
                            </PolicyAccordion>

                            {/* 환불 정책 */}
                            <PolicyAccordion icon="payments" title="환불 정책" color="yellow">
                                <div className="space-y-3 mt-2">
                                    <div>
                                        <p className="text-blue-300 text-[11px] font-bold mb-1.5">📦 실물 상품 (모카 에디트)</p>
                                        <ul className="space-y-1.5">
                                            <PolicyItem mark="①">배송 전 취소: <strong className="text-white">100% 전액 환불</strong></PolicyItem>
                                            <PolicyItem mark="②">상품 수령 후 3일 이내 신청: 미사용·미개봉 시 환불 가능 (왕복 배송비 고객 부담)</PolicyItem>
                                            <PolicyItem mark="③">상품 하자·오배송: 수령 후 3일 이내 접수 시 100% 환불</PolicyItem>
                                        </ul>
                                    </div>
                                    <hr className="border-white/10" />
                                    <div>
                                        <p className="text-emerald-300 text-[11px] font-bold mb-1.5">👑 멤버십 (월정액 구독)</p>
                                        <ul className="space-y-1.5">
                                            <PolicyItem mark="①">정기결제 회원: 이용한 일수를 제외하고 일할 계산으로 환불됩니다. 월 기준 30일, 결제 시간으로부터 24시간 이후 ~ 15일까지 남은 일 수에 대해 일할 계산 처리됩니다.</PolicyItem>
                                            <PolicyItem mark="②">연간결제 회원: 연 기준 12개월이며, 잔여 이용료는 전체 연간결제 이용료를 12로 나눈 하루 일대를 기준으로 환불됩니다.</PolicyItem>
                                            <PolicyItem mark="③">회원이 상담 후 상대 프로필카드를 2회 이상 수령한 경우, 잔여 횟수가 남은 회원에 한하여 이용 금액과 위약금 10%를 제외한 부분 환불이 가능합니다.</PolicyItem>
                                        </ul>
                                    </div>
                                    <hr className="border-white/10" />
                                    <div>
                                        <p className="text-white/40 text-[11px] font-bold mb-1.5">※ 회사 귀책사유</p>
                                        <ul className="space-y-1.5">
                                            <PolicyItem mark="②">회사의 귀책사유로 결제 오류가 발생한 경우 — 전액 환불</PolicyItem>
                                            <PolicyItem mark="③">회사의 귀책사유로 서비스가 중단되는 경우 — 전액 환불</PolicyItem>
                                        </ul>
                                        <p className="text-white/30 text-[10px] mt-2">※ 본 조의 환불 금액 기준은 연간결제 회원이라 하더라도 정기결제 금액으로 계산 후 진행됩니다.</p>
                                    </div>
                                </div>
                            </PolicyAccordion>

                            {/* 환불 불가 */}
                            <PolicyAccordion icon="block" title="환불 불가 항목" color="red">
                                <ul className="space-y-1.5 mt-2">
                                    <PolicyItem>멤버십 결제 후 7일을 초과한 경우</PolicyItem>
                                    <PolicyItem>상품 수령 후 3일을 초과한 경우</PolicyItem>
                                    <PolicyItem>콘텐츠를 다운로드하거나 실질적으로 이용한 경우</PolicyItem>
                                    <PolicyItem>고객의 사용·훼손으로 상품 가치가 현저히 감소한 경우</PolicyItem>
                                    <PolicyItem>개봉 후 사용한 상품의 단순 변심</PolicyItem>
                                </ul>
                            </PolicyAccordion>
                        </div>

                        {/* 문의처 */}
                        <div className="mt-4 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
                            <p className="text-orange-300 text-xs font-bold">📞 교환·반품·환불 문의</p>
                            <p className="text-white/50 text-[11px] mt-1">immodelkr@gmail.com</p>
                            <p className="text-white/30 text-[10px] mt-0.5">주문번호, 결제일자, 사유를 함께 보내주세요. (영업일 기준 1~2일 내 답변)</p>
                        </div>
                    </div>

                    <div className="w-full h-2 bg-black/40"></div>

                    {/* 5. 구매 리뷰 - 임시 비활성화 (나중에 활용) */}
                    {false && <div className="px-5 py-8 bg-[#0f0f1a]">
                        <div className="flex items-center gap-2 mb-5">
                            <h2 className="text-white font-bold text-lg">구매 리뷰</h2>
                            {avgRating && <span className="text-yellow-400 text-sm font-bold">★ {avgRating}</span>}
                            <span className="text-white/40 text-sm">{reviews.length}</span>
                        </div>

                        {/* 쿠폰 발급 완료 배너 */}
                        {issuedCoupon && (
                            <div className="mb-5 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-4">
                                <p className="text-yellow-300 font-bold text-sm mb-1">🎁 리뷰 작성 감사 쿠폰이 발급되었어요!</p>
                                <p className="text-white/50 text-xs mb-3">다음 구매 시 5% 할인 · 30일 유효</p>
                                <div className="flex items-center gap-2 bg-black/40 rounded-xl px-3 py-2.5">
                                    <span className="text-yellow-300 font-black text-sm tracking-widest flex-1">{issuedCoupon}</span>
                                    <button
                                        onClick={handleCopyCoupon}
                                        className="text-xs font-bold bg-yellow-500/20 text-yellow-300 px-3 py-1.5 rounded-lg transition-colors hover:bg-yellow-500/30"
                                    >
                                        {copied ? '복사됨 ✓' : '복사'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 리뷰 작성 폼 — 구매자 & 미작성자만 표시 */}
                        {!loadingReviews && myOrder && !alreadyReviewed && !issuedCoupon && (
                            <form onSubmit={handleReviewSubmit} className="mb-6 bg-white/[0.03] border border-purple-500/20 rounded-2xl p-4">
                                <p className="text-purple-300 font-bold text-sm mb-1">✍️ 구매 리뷰를 남겨주세요</p>
                                <p className="text-white/40 text-xs mb-4">리뷰 작성 시 5% 할인 쿠폰을 드려요!</p>
                                <div className="mb-3">
                                    <p className="text-white/50 text-xs mb-2">별점</p>
                                    <StarRating value={rating} onChange={setRating} />
                                </div>
                                <textarea
                                    value={reviewContent}
                                    onChange={(e) => setReviewContent(e.target.value)}
                                    placeholder="상품을 이용하신 후기를 남겨주세요."
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors resize-none placeholder-white/30 mb-3"
                                    rows={3}
                                />
                                <button
                                    type="submit"
                                    disabled={!reviewContent.trim() || isSubmitting}
                                    className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:opacity-90 text-white font-bold text-sm py-3 rounded-xl transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? '등록 중...' : '리뷰 등록하고 쿠폰 받기'}
                                </button>
                            </form>
                        )}

                        {/* 이미 리뷰 작성됨 알림 */}
                        {myOrder && alreadyReviewed && !issuedCoupon && (
                            <div className="mb-5 bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                <p className="text-white/40 text-sm">이미 리뷰를 작성하셨습니다.</p>
                            </div>
                        )}

                        {/* 리뷰 리스트 */}
                        <div className="flex flex-col gap-4">
                            {loadingReviews ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                                </div>
                            ) : reviews.length === 0 ? (
                                <div className="text-center py-8 bg-white/5 rounded-2xl">
                                    <span className="material-symbols-outlined text-white/10 text-3xl block mb-2">rate_review</span>
                                    <p className="text-white/30 text-sm">아직 등록된 리뷰가 없습니다.</p>
                                    <p className="text-white/20 text-xs mt-1">구매 후 첫 리뷰를 남겨보세요!</p>
                                </div>
                            ) : (
                                reviews.map(r => (
                                    <div key={r.id} className="flex gap-3 items-start">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                                            {r.user_nickname.charAt(0)}
                                        </div>
                                        <div className="flex-1 bg-white/[0.03] border border-white/5 p-3.5 rounded-2xl rounded-tl-none">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <span className="text-white/80 font-bold text-sm">{r.user_nickname}</span>
                                                        {(r.user_grade === 'VIP' || r.user_grade === 'VVIP') && (
                                                            <span className="text-[10px] font-bold bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                                                                {r.user_grade === 'VIP' ? '전속모델' : r.user_grade}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-0.5">
                                                        {[1, 2, 3, 4, 5].map(s => (
                                                            <span key={s} className={`text-sm ${s <= r.rating ? 'text-yellow-400' : 'text-white/15'}`}>★</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <span className="text-white/30 text-[10px] mt-1">{formatDate(r.created_at)}</span>
                                            </div>
                                            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{r.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>}
                </div>

                {/* 5. 바닥 고정 CTA 버튼 */}
                <div className="absolute bottom-0 left-0 right-0 bg-[#0a0a14]/90 backdrop-blur-xl border-t border-white/10 p-4 sm:rounded-b-3xl">
                    <button
                        onClick={() => {
                            onClose();
                            onBuyClick(product);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6C63FF] to-[#bd61ff] active:from-purple-600 active:to-fuchsia-600 text-white font-black text-base py-4 rounded-2xl shadow-[0_0_30px_rgba(108,99,255,0.3)] transition-all"
                    >
                        <span>{Number(product.sale_price).toLocaleString()}원에 구매하기</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ProductDetailModal;
