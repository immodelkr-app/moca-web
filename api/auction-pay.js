// 모카TV 경매 낙찰 결제 API (클라이언트 → 서버). 금액·낙찰자·기한은 모두 DB RPC가 판단하고, 클라이언트가 보낸 금액은 쓰지 않는다.
// 카드 결제는 페이앱 결제창 → 웹노티(payapp-feedback)에서 확정, 이때 포인트 차감. 포인트 전액 결제는 여기서 바로 확정한다.
import { payRequestAuction, rpc } from './_payapp.js';
import { getBalance, deductPoints } from './_corePoints.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { auctionId, userId } = req.body || {};
    const usePoints = Number.parseInt(req.body?.usePoints ?? 0, 10) || 0;
    if (!UUID.test(auctionId || '') || !UUID.test(userId || '')) return res.status(400).json({ error: '잘못된 요청입니다.' });

    try {
        const b = await rpc('auction_pay_begin', { p_auction_id: auctionId, p_user_id: userId, p_use_points: usePoints });

        if (b.points > 0) { // 잔액 부족은 결제창을 열기 전에 알려준다 (실제 차감은 결제 확정 시)
            const balance = await getBalance(b.master_user_id);
            if (balance < b.points) return res.status(400).json({ error: `보유 포인트(${balance.toLocaleString()}P)가 부족합니다.` });
        }

        if (b.card_amount === 0) { // 포인트 전액 결제: 차감 먼저, 성공해야 확정
            await rpc('auction_pay_attach', { p_auction_id: auctionId, p_mul_no: 'POINTS' });
            await deductPoints(b.master_user_id, b.points, `모카TV 경매 낙찰 결제 (${b.title})`);
            await rpc('auction_pay_mark_points', { p_auction_id: auctionId, p_deducted: true });
            const c = await rpc('auction_pay_confirm', { p_auction_id: auctionId, p_mul_no: 'POINTS', p_price: 0, p_pay_type: 'points' });
            if (c.result !== 'paid' && c.result !== 'already') return res.status(409).json({ error: '결제를 확정할 수 없습니다. 운영자에게 문의해주세요.' });
            return res.status(200).json({ done: true });
        }

        const out = await payRequestAuction({ title: b.title, amount: b.card_amount, phone: b.phone, auctionId });
        if (out.state !== '1') return res.status(400).json({ error: out.errorMessage || '결제 요청에 실패했습니다.' });
        await rpc('auction_pay_attach', { p_auction_id: auctionId, p_mul_no: out.mul_no });
        return res.status(200).json({ payurl: out.payurl });
    } catch (e) {
        return res.status(500).json({ error: String(e.message || e) });
    }
}
