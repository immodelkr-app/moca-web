// 임시: 페이앱 결제요청 테스트 (1,000원 고정). 왕복 확인 후 삭제.
// 환경변수: PAYAPP_USERID (판매자 아이디)
const SITE = 'https://immoca.kr';

export default async function handler(req, res) {
    const userid = process.env.PAYAPP_USERID;
    if (!userid) return res.status(500).json({ error: 'PAYAPP_USERID 환경변수 없음' });

    const body = new URLSearchParams({
        cmd: 'payrequest',
        userid,
        goodname: '모카 결제 테스트',
        price: '1000',
        recvphone: '01090424521',
        smsuse: 'n', // 결제요청 SMS 발송 안 함
        feedbackurl: `${SITE}/api/payapp-feedback`,
        checkretry: 'y',
        returnurl: `${SITE}/paytest?payapp=return`,
        appurl: 'immodel://paytest',
        var1: 'paytest_' + Date.now(),
    });

    try {
        const r = await fetch('https://api.payapp.kr/oapi/v2', { method: 'POST', body });
        const out = Object.fromEntries(new URLSearchParams(await r.text()));
        if (out.state !== '1') return res.status(400).json({ error: out.errorMessage || '결제요청 실패' });
        return res.status(200).json({ payurl: out.payurl, mul_no: out.mul_no });
    } catch (e) {
        return res.status(500).json({ error: String(e.message || e) });
    }
}
