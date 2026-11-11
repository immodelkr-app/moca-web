// 임시: paycancel/hash 검증용. 테스트 결제 119438326 만 취소 가능. 확인 후 삭제.
import crypto from 'crypto';

const TEST_MUL_NO = '119438326';

// 페이앱 서버 시각 기준(KST) 14자리
const kstNow = () => new Date(Date.now() + 9 * 3600e3).toISOString().replace(/\D/g, '').slice(0, 14);

async function cancel(requestkey) {
    const { PAYAPP_USERID: userid, PAYAPP_LINKKEY: linkkey } = process.env;
    const requestdate = kstNow();
    const hash = crypto.createHash('sha256').update(userid + requestdate + requestkey).digest('hex');
    const r = await fetch('https://api.payapp.kr/oapi/v2', {
        method: 'POST',
        body: new URLSearchParams({
            cmd: 'paycancel', userid, linkkey, requestdate, hash,
            mul_no: TEST_MUL_NO, cancelmemo: '취소 API 테스트', partcancel: '0',
        }),
    });
    return Object.fromEntries(new URLSearchParams(await r.text()));
}

export default async function handler(req, res) {
    const { PAYAPP_REQUESTKEY, PAYAPP_LINKKEY, PAYAPP_USERID } = process.env;
    if (!PAYAPP_REQUESTKEY || !PAYAPP_LINKKEY || !PAYAPP_USERID) return res.status(500).json({ error: '환경변수 없음' });
    try {
        const withRequestKey = await cancel(PAYAPP_REQUESTKEY);
        if (withRequestKey.state === '1') return res.status(200).json({ keyUsed: 'REQUESTKEY', ...withRequestKey });
        const withLinkKey = await cancel(PAYAPP_LINKKEY);
        return res.status(200).json({ keyUsed: withLinkKey.state === '1' ? 'LINKKEY' : 'none', requestkeyResult: withRequestKey, linkkeyResult: withLinkKey });
    } catch (e) {
        return res.status(500).json({ error: String(e.message || e) });
    }
}
