// 임시: 페이앱 결제통보(feedbackurl) 수신 테스트. 환경변수 PAYAPP_LINKVAL 로 연동 VALUE 검증.
export default async function handler(req, res) {
    const b = req.body || {};
    console.log('[payapp-feedback]', JSON.stringify({
        mul_no: b.mul_no, pay_state: b.pay_state, price: b.price, var1: b.var1,
        pay_type: b.pay_type, valOk: b.linkval === process.env.PAYAPP_LINKVAL,
    }));
    if (!process.env.PAYAPP_LINKVAL || b.linkval !== process.env.PAYAPP_LINKVAL) return res.status(200).send('FAIL');
    return res.status(200).send('SUCCESS');
}
