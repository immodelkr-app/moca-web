// 모델뷰티 자동 로그인 티켓 발급: 서버 서명 세션 토큰을 확인하고 60초짜리 티켓 URL을 돌려준다.
// 환경변수: MOCA_SESSION_SECRET(모카 전용), MOCA_TICKET_SECRET(모델뷰티와 같은 값)
import { sign, verify } from './_mocaToken.js';

const MODELBEAUTY = 'https://modelbeauty.kr';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { token, path } = req.body || {};
    const session = verify(token, process.env.MOCA_SESSION_SECRET);
    if (!session) return res.status(401).json({ error: '로그인이 필요합니다.' });
    if (!/^01\d{8,9}$/.test(session.phone || '')) return res.status(400).json({ error: '휴대폰 번호가 등록된 회원만 이용할 수 있습니다.' });

    const secret = process.env.MOCA_TICKET_SECRET;
    if (!secret) return res.status(500).json({ error: '서버 설정이 없습니다.' });

    const safePath = typeof path === 'string' && path.startsWith('/') && !path.startsWith('//') ? path : '/';
    const ticket = sign({ phone: session.phone, nickname: session.nickname, path: safePath, exp: Date.now() + 60e3 }, secret);
    return res.status(200).json({ url: `${MODELBEAUTY}/api/auth/moca-login?ticket=${encodeURIComponent(ticket)}` });
}
