// im-core-auth(통합포인트) 서버 호출 모듈. 포인트 잔액/차감/반환은 반드시 서버에서만 한다. (밑줄 파일은 Vercel 라우트로 노출되지 않음)
const base = () => process.env.VITE_IM_CORE_AUTH_URL;
const headers = () => ({ 'Content-Type': 'application/json', 'x-api-secret': process.env.VITE_IM_CORE_AUTH_API_SECRET || '' });

const call = async (path, init) => {
    if (!base() || !process.env.VITE_IM_CORE_AUTH_API_SECRET) throw new Error('포인트 서버 설정이 없습니다.');
    const r = await fetch(`${base()}${path}`, { ...init, headers: headers() });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) throw new Error(j.message || `포인트 서버 오류(${r.status})`);
    return j;
};

export const getBalance = async (masterUserId) => {
    const j = await call(`/api/points/balance/${masterUserId}`, { method: 'GET' });
    return Number(j.integratedPoints ?? j.balance ?? 0);
};

const move = (kind, masterUserId, amount, description) =>
    call(`/api/points/${kind}`, { method: 'POST', body: JSON.stringify({ masterUserId, appSource: 'MOCA', amount, description }) });

export const deductPoints = (masterUserId, amount, description) => move('deduct', masterUserId, amount, description);
export const rewardPoints = (masterUserId, amount, description) => move('reward', masterUserId, amount, description);
