// 모카클래스 카드결제 API (클라이언트 → 서버). action: 'begin'(결제창 URL 발급) | 'refund'(사용자 환불)
// 금액·환불가능 여부는 모두 DB RPC에서 서버가 판단한다. 클라이언트가 보낸 금액은 쓰지 않는다.
import { payRequest, cancelPayment, rpc } from './_payapp.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { action, applicationId, userId } = req.body || {};
    if (!UUID.test(applicationId || '') || !UUID.test(userId || '')) return res.status(400).json({ error: '잘못된 요청입니다.' });

    try {
        if (action === 'begin') {
            const b = await rpc('class_pay_begin', { p_application_id: applicationId, p_user_id: userId });
            const out = await payRequest({ title: b.title, amount: b.amount, phone: b.phone, paymentId: b.payment_id, classId: b.class_id });
            if (out.state !== '1') return res.status(400).json({ error: out.errorMessage || '결제 요청에 실패했습니다.' });
            await rpc('class_pay_attach', { p_payment_id: b.payment_id, p_mul_no: out.mul_no });
            return res.status(200).json({ payurl: out.payurl });
        }

        if (action === 'refund') {
            const info = await rpc('class_pay_refund_info', { p_application_id: applicationId, p_user_id: userId });
            if (!info.refundable) {
                return res.status(409).json({ error: '수업 시작 3일 전까지만 환불할 수 있습니다. 문의가 필요하면 고객센터로 연락해주세요.' });
            }
            const out = await cancelPayment({ mulNo: info.mul_no, memo: '수강 취소(고객 요청)', settled: info.settled });
            if (out.state !== '1') return res.status(400).json({ error: out.errorMessage || '환불 처리에 실패했습니다.' });
            // 정산 전 취소는 웹노티(취소통보)로도 반영되지만, 즉시 반영을 위해 여기서도 처리한다(멱등).
            await rpc('class_pay_mark_cancelled', { p_mul_no: info.mul_no, p_reason: '고객 환불', p_settlement_return: !!info.settled });
            return res.status(200).json({ ok: true, settled: !!info.settled });
        }

        return res.status(400).json({ error: '알 수 없는 요청입니다.' });
    } catch (e) {
        return res.status(500).json({ error: String(e.message || e) });
    }
}
