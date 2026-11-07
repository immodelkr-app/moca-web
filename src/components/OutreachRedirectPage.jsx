import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { recordOutreachClick } from '../services/outreachEmailService';

// 홍보 메일 버튼 링크(/r/:token): 클릭을 기록한 뒤 모카캐스팅으로 이동.
// 서버 리다이렉트가 아니라 JS로 기록하므로, 메일 보안 검사기가 링크를 미리 열어도 클릭으로 잡히지 않는다.
const TARGET = '/home/castings';

const OutreachRedirectPage = () => {
    const { token } = useParams();

    useEffect(() => {
        let done = false;
        const go = () => { if (!done) { done = true; window.location.replace(TARGET); } };
        recordOutreachClick(token).finally(go);
        const timer = setTimeout(go, 1500); // 기록이 지연돼도 이동은 막지 않음
        return () => clearTimeout(timer);
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--moca-bg)]">
            <p className="text-sm font-bold text-[var(--moca-text-3)]">모카캐스팅으로 이동 중입니다...</p>
        </div>
    );
};

export default OutreachRedirectPage;
