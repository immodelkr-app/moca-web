import React, { useEffect, useRef, useState } from 'react';
import {
    fetchVisibleAuction, subscribeToAuction, fetchAuctionBids, placeAuctionBid,
    finalizeAuction, fetchServerClockOffset,
} from '../services/mocaLiveEngagementService';

const maskName = (name) => (name ? `${name.slice(0, 1)}${'*'.repeat(Math.max(1, Math.min(name.length - 1, 3)))}` : '');
const won = (n) => `${Number(n).toLocaleString('ko-KR')}원`;

// 시청자용 경매 카드. 카운트다운은 서버 시계 오프셋으로 보정하고, 마감 판정은 서버(RPC)가 한다.
const MocaLiveAuctionCard = ({ liveId, myNickname }) => {
    const [auction, setAuction] = useState(null);
    const [bids, setBids] = useState([]);
    const [remainingSec, setRemainingSec] = useState(0);
    const [amountInput, setAmountInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const offsetRef = useRef(0);
    const finalizingRef = useRef(false);

    useEffect(() => {
        if (!liveId) return;
        let mounted = true;

        fetchServerClockOffset().then((o) => { offsetRef.current = o; });

        const load = async () => {
            const a = await fetchVisibleAuction(liveId);
            if (!mounted) return;
            setAuction(a);
            if (a) setBids(await fetchAuctionBids(a.id));
            else setBids([]);
        };
        load();
        const poll = setInterval(load, 3000); // Realtime 누락 대비 폴링 보강

        const unsubscribe = subscribeToAuction(liveId, (updated) => {
            if (!mounted || !updated) return;
            if (updated.status === 'archived' || updated.status === 'cancelled') { setAuction(null); return; }
            setAuction(updated);
            fetchAuctionBids(updated.id).then((b) => { if (mounted) setBids(b); });
        });

        return () => { mounted = false; clearInterval(poll); unsubscribe(); };
    }, [liveId]);

    // 카운트다운 + 0초가 되면 마감 확정 요청 (여러 시청자가 동시에 호출해도 서버에서 멱등)
    useEffect(() => {
        if (!auction || auction.status !== 'open') return;
        finalizingRef.current = false;

        const tick = () => {
            const left = Math.max(0, Math.ceil((new Date(auction.ends_at).getTime() - (Date.now() + offsetRef.current)) / 1000));
            setRemainingSec(left);
            if (left === 0 && !finalizingRef.current) {
                finalizingRef.current = true;
                finalizeAuction(auction.id).then(async () => {
                    const a = await fetchVisibleAuction(liveId);
                    if (a) setAuction(a);
                });
            }
        };
        tick();
        const timer = setInterval(tick, 250);
        return () => clearInterval(timer);
    }, [auction?.id, auction?.ends_at, auction?.status, liveId]);

    if (!auction) return null;

    const isOpen = auction.status === 'open';
    const minBid = auction.bid_count === 0 ? auction.start_price : auction.current_price + auction.min_increment;
    const iAmTop = auction.current_bidder === myNickname;
    const iWon = auction.status === 'closed' && auction.winner_nickname === myNickname;
    const urgent = isOpen && remainingSec <= 10;

    const handleBid = async (e) => {
        e.preventDefault();
        setError('');
        const amount = Number(amountInput);
        if (!Number.isInteger(amount) || amount < minBid) { setError(`${won(minBid)} 이상 입력해주세요.`); return; }

        setSubmitting(true);
        const { result, error: err } = await placeAuctionBid(auction.id, myNickname, amount);
        setSubmitting(false);

        if (err) { setError(err.message || '입찰에 실패했습니다.'); return; }
        setAmountInput('');
        setAuction((a) => (a ? {
            ...a, current_price: result.current_price, current_bidder: myNickname,
            bid_count: a.bid_count + 1, ends_at: result.ends_at, extensions_used: result.extensions_used,
        } : a));
        fetchAuctionBids(auction.id).then(setBids);
    };

    const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div className="rounded-2xl bg-white/95 backdrop-blur px-4 py-3 shadow-lg border-2 border-[#9333EA]/30">
            <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                    <span className="text-[13px]">🔨</span>
                    <p className="text-[12px] font-black text-[#1F1235]">{isOpen ? '실시간 경매' : '경매 결과'}</p>
                </div>
                {isOpen && (
                    <span className={`text-[13px] font-black tabular-nums ${urgent ? 'text-red-500' : 'text-[#9333EA]'}`}>
                        ⏱ {fmtTime(remainingSec)}
                    </span>
                )}
            </div>

            <p className="text-[13.5px] font-black text-[#1F1235] mb-1 leading-snug">{auction.product_name}</p>
            <p className="text-[12px] font-bold text-[#5B4E7A]">
                {auction.bid_count === 0
                    ? <>시작가 <span className="text-[#9333EA]">{won(auction.start_price)}</span></>
                    : <>현재가 <span className="text-[#9333EA] text-[15px] font-black">{won(auction.current_price)}</span> · {maskName(auction.current_bidder)}{iAmTop && ' (나)'}</>}
                <span className="text-[#9CA3AF]"> · 입찰 {auction.bid_count}회</span>
            </p>
            {isOpen && urgent && auction.extensions_used < auction.max_extensions && (
                <p className="text-[10.5px] font-bold text-red-500 mt-0.5">마지막 {auction.extension_sec}초 안에 입찰하면 시간이 연장돼요!</p>
            )}

            {isOpen && (
                <form onSubmit={handleBid} className="flex items-center gap-2 mt-2.5">
                    <input
                        type="number"
                        inputMode="numeric"
                        value={amountInput}
                        onChange={(e) => setAmountInput(e.target.value)}
                        placeholder={`${minBid.toLocaleString('ko-KR')} 이상`}
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-[#E8E0FA] text-[13px] font-bold"
                    />
                    <button
                        type="submit"
                        disabled={!amountInput || submitting || iAmTop}
                        className="px-4 py-2 rounded-xl bg-[#9333EA] text-white text-[12px] font-black disabled:opacity-40 whitespace-nowrap"
                    >
                        {iAmTop ? '최고가' : submitting ? '입찰 중...' : '입찰'}
                    </button>
                </form>
            )}
            {isOpen && (
                <div className="flex gap-1.5 mt-1.5">
                    <button
                        type="button"
                        onClick={() => setAmountInput(String(minBid))}
                        className="px-2.5 py-1 rounded-lg bg-[#F3E8FF] text-[#9333EA] text-[11px] font-black"
                    >
                        최소 {minBid.toLocaleString('ko-KR')}
                    </button>
                </div>
            )}
            {error && <p className="text-[11px] font-bold text-red-500 mt-1.5">{error}</p>}

            {bids.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#F3E8FF] space-y-0.5">
                    {bids.slice(0, 3).map((b, i) => (
                        <p key={b.id} className="text-[11px] font-bold text-[#5B4E7A]">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {maskName(b.user_nickname)} · {won(b.amount)}
                        </p>
                    ))}
                </div>
            )}

            {auction.status === 'closed' && (
                auction.winner_nickname ? (
                    <p className={`text-[12px] font-black mt-2 ${iWon ? 'text-emerald-600' : 'text-[#1F1235]'}`}>
                        {iWon
                            ? `🎉 축하합니다! ${won(auction.winning_price)}에 낙찰되었어요. 안내를 기다려주세요.`
                            : `🏆 ${maskName(auction.winner_nickname)}님이 ${won(auction.winning_price)}에 낙찰!`}
                    </p>
                ) : (
                    <p className="text-[11px] font-bold text-[#9CA3AF] mt-2">입찰자가 없어 유찰되었습니다.</p>
                )
            )}
        </div>
    );
};

export default MocaLiveAuctionCard;
