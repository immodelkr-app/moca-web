// 모카 로그인 성공 직후 호출: 닉네임+비밀번호 해시를 서버가 다시 확인하고 서버 서명 세션 토큰을 발급한다.
// 이 토큰이 있어야만 모델뷰티 티켓(/api/mb-ticket)을 받을 수 있다. 환경변수: MOCA_SESSION_SECRET
import { sign } from './_mocaToken.js';

const SESSION_DAYS = 30;

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
    const { nickname, passwordHash } = req.body || {};
    const secret = process.env.MOCA_SESSION_SECRET;
    if (!secret) return res.status(500).json({ error: '서버 설정이 없습니다.' });
    if (!nickname || !passwordHash) return res.status(400).json({ error: '잘못된 요청입니다.' });

    try {
        const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY;
        // password_hash 직접 조회는 DB에서 막혀 있어 login_user RPC로 닉네임+해시를 대조한다
        const r = await fetch(`${url}/rest/v1/rpc/login_user`, {
            method: 'POST',
            headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_nickname: nickname, p_hash: passwordHash }),
        });
        const [user] = (await r.json().catch(() => [])) || [];
        if (!r.ok || !user) return res.status(401).json({ error: '인증에 실패했습니다.' });

        const token = sign({
            uid: user.id, phone: String(user.phone || '').replace(/\D/g, ''), nickname: user.nickname,
            exp: Date.now() + SESSION_DAYS * 864e5,
        }, secret);
        return res.status(200).json({ token });
    } catch (e) {
        return res.status(500).json({ error: String(e.message || e) });
    }
}
