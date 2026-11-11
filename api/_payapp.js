// 페이앱 연동 + 결제용 DB RPC 호출 모듈. PG를 바꿀 때는 이 파일만 교체한다. (밑줄 파일은 Vercel 라우트로 노출되지 않음)
import crypto from 'crypto';

const API = 'https://api.payapp.kr/oapi/v2';
export const SITE = 'https://immoca.kr';

const env = () => ({
    userid: process.env.PAYAPP_USERID,
    linkkey: process.env.PAYAPP_LINKKEY,
    requestkey: process.env.PAYAPP_REQUESTKEY,
    linkval: process.env.PAYAPP_LINKVAL,
});

const post = async (params) => {
    const r = await fetch(API, { method: 'POST', body: new URLSearchParams(params) });
    return Object.fromEntries(new URLSearchParams(await r.text()));
};

// requestdate: KST 14자리, hash = sha256(userid + requestdate + 결제KEY)
const signed = (cmd, params) => {
    const { userid, linkkey, requestkey } = env();
    const requestdate = new Date(Date.now() + 9 * 3600e3).toISOString().replace(/\D/g, '').slice(0, 14);
    const hash = crypto.createHash('sha256').update(userid + requestdate + requestkey).digest('hex');
    return post({ cmd, userid, linkkey, requestdate, hash, ...params });
};

export const payRequest = ({ title, amount, phone, paymentId, classId }) => {
    const { userid } = env();
    return post({
        cmd: 'payrequest', userid, goodname: title, price: String(amount),
        recvphone: phone || '01000000000', smsuse: 'n', // 결제요청 SMS는 보내지 않고 앱에서 결제창을 연다
        feedbackurl: `${SITE}/api/payapp-feedback`, checkretry: 'y',
        returnurl: `${SITE}/open-app?path=${encodeURIComponent('class/' + classId)}`,
        appurl: `immodel://class/${classId}`, var1: paymentId,
    });
};

// 정산 전(D+5 이내): 즉시 취소. 정산 후: 환불 요청(정산금 반환 필요)
export const cancelPayment = ({ mulNo, memo, settled }) =>
    signed(settled ? 'paycancelreq' : 'paycancel', { mul_no: mulNo, cancelmemo: memo, partcancel: '0' });

export const isValidLinkval = (v) => !!env().linkval && v === env().linkval;

// DB RPC (SECURITY DEFINER, 서버 전용 비밀값 검증). 서비스키 없이 anon 키로 호출한다.
export const rpc = async (fn, args) => {
    const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY;
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_secret: process.env.PAYAPP_RPC_SECRET, ...args }),
    });
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error(body?.message || `rpc ${fn} 실패(${r.status})`);
    return body;
};
