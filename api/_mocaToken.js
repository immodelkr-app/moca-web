// 모카 서버 서명 토큰 공용 모듈 (밑줄 파일은 Vercel 라우트로 노출되지 않음)
// - 세션 토큰: 모카 로그인 성공 시 서버가 발급, 기기에 저장. 서버가 "이 사람이 로그인한 회원"임을 확인하는 유일한 증거.
// - 티켓: 모델뷰티 입구(/api/auth/moca-login)가 검증하는 60초짜리 서명 문서.
import crypto from 'crypto';

const b64 = (buf) => Buffer.from(buf).toString('base64url');

export const sign = (payload, secret) => {
    const body = b64(JSON.stringify(payload));
    return `${body}.${b64(crypto.createHmac('sha256', secret).update(body).digest())}`;
};

// 서명이 틀리거나 만료되면 null
export const verify = (token, secret) => {
    if (!secret || typeof token !== 'string') return null;
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', secret).update(body).digest();
    const given = Buffer.from(sig, 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    try {
        const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        return payload.exp > Date.now() ? payload : null;
    } catch {
        return null;
    }
};
