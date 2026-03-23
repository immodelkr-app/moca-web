import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, logoutUser } from '../services/userService';

/**
 * 주기적으로 인증 토큰(auth_expires_at) 만료 시간이 넘었는지 체크하고
 * 만료되었다면 강제 로그아웃 후 랜딩 페이지로 이동시킵니다.
 */
export const useAutoLogout = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // 매 1분마다 체크
        const intervalId = setInterval(() => {
            const user = getUser();
            if (!user) {
                // 이미 로그아웃된 상태
                return;
            }

            if (user.auth_expires_at) {
                const now = new Date();
                const expiresAt = new Date(user.auth_expires_at);
                if (now > expiresAt) {
                    // 유효시간(기본 1시간) 만료됨
                    logoutUser();
                    alert("로그인 세션(1시간)이 만료되어 자동 로그아웃 되었습니다.");
                    navigate('/', { replace: true });
                }
            }
        }, 60 * 1000); // 60초

        return () => clearInterval(intervalId);
    }, [navigate]);
};
