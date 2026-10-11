import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserGrade, syncUserGrade } from '../services/userService';
import GoldGateModal from './GoldGateModal';

export const GOLD_OR_ABOVE = ['GOLD', 'IMODEL', 'VIP'];

/**
 * 모카캐스팅 화면 보호 — GOLD 이상만 통과.
 * 대시보드 버튼 외에 푸시 알림·주소로 바로 들어오는 경우도 같은 안내 팝업으로 막는다.
 * (화면 수준 제한이며, 서버(DB) 수준의 접근 차단은 아님)
 */
const CastingGoldGuard = ({ children }) => {
    const navigate = useNavigate();
    const [grade, setGrade] = useState(getUserGrade());
    const [synced, setSynced] = useState(false);

    // 방금 GOLD가 된 회원이 예전 등급으로 막히지 않도록 DB의 최신 등급으로 갱신한 뒤 판단
    useEffect(() => {
        syncUserGrade()
            .then(() => setGrade(getUserGrade()))
            .catch(() => { })
            .finally(() => setSynced(true));
    }, []);

    if (GOLD_OR_ABOVE.includes(grade)) return children;
    if (!synced) return null; // 최신 등급 확인 전에는 팝업을 깜빡이지 않음

    return (
        <div className="min-h-screen bg-white">
            <GoldGateModal
                title="모카캐스팅은 GOLD 등급부터 이용할 수 있어요"
                onClose={() => navigate('/home/dashboard', { replace: true })}
            />
        </div>
    );
};

export default CastingGoldGuard;
