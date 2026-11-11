// 페이앱 결제통보(feedbackurl). 결제 확정의 유일한 근거다(리다이렉트/클라이언트는 믿지 않음).
// 규칙: linkval 검증 → 금액 대조(RPC) → 중복 통보는 RPC가 멱등 처리 → 반드시 'SUCCESS' 응답(실패 시 페이앱이 재시도).
import { isValidLinkval, rpc, cancelPayment } from './_payapp.js';

export default async function handler(req, res) {
    const b = req.body || {};
    if (!isValidLinkval(b.linkval)) return res.status(200).send('FAIL');
    console.log('[payapp-feedback]', JSON.stringify({ mul_no: b.mul_no, pay_state: b.pay_state, price: b.price, var1: b.var1, pay_type: b.pay_type }));

    // 클래스 결제가 아닌 통보(var1이 결제ID가 아님)는 확인만 하고 종료
    if (!/^[0-9a-f-]{36}$/i.test(b.var1 || '') && b.pay_state === '4') return res.status(200).send('SUCCESS');

    try {
        if (b.pay_state === '4') { // 결제완료
            const r = await rpc('class_pay_confirm', {
                p_payment_id: b.var1, p_mul_no: b.mul_no, p_price: Number(b.price), p_pay_type: b.pay_type || '',
            });
            if (r === 'overbooked') {
                // 동시 결제로 정원 초과 → 자동 전액 환불, 신청은 대기로 전환됨
                const out = await cancelPayment({ mulNo: b.mul_no, memo: '정원 초과 자동환불', settled: false });
                if (out.state === '1') await rpc('class_pay_mark_cancelled', { p_mul_no: b.mul_no, p_reason: '정원 초과 자동환불' });
                else console.error('[payapp-feedback] 자동환불 실패', b.mul_no, out.errorMessage);
            } else if (r === 'mismatch' || r === 'unknown') {
                console.error('[payapp-feedback] 확정 거부', r, b.mul_no, b.var1);
            }
        } else if (b.pay_state === '64') { // 취소통보 (페이앱 사이트에서 직접 취소한 경우 포함)
            await rpc('class_pay_mark_cancelled', { p_mul_no: b.mul_no, p_reason: '페이앱 취소통보' });
        }
        return res.status(200).send('SUCCESS');
    } catch (e) {
        console.error('[payapp-feedback] 처리 오류', e.message);
        return res.status(200).send('FAIL'); // 재시도 유도
    }
}
