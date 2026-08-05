import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';

const VISITOR_ID_KEY = 'moca_visitor_id';

// 기기(브라우저)당 하나씩 발급되어 localStorage에 영구 저장되는 익명 방문자 ID.
// 순 방문자(중복 제거) 집계에 사용되며, 개인 식별 정보는 포함하지 않음.
const getVisitorId = () => {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
};

export const usePageView = () => {
    const location = useLocation();

    useEffect(() => {
        const recordPageView = async () => {
            if (!isSupabaseEnabled()) return;

            // 라우터의 현재 경로를 가져옵니다.
            const path = location.pathname;
            const visitorId = getVisitorId();

            try {
                // page_views 테이블에 현재 경로 기록
                const { error } = await supabase
                    .from('page_views')
                    .insert([{ path, visitor_id: visitorId }]);

                if (error) {
                    console.error('Failed to record page view:', error);
                }
            } catch (err) {
                console.error('Error recording page view:', err);
            }
        };

        recordPageView();
    }, [location.pathname]); // 경로가 변경될 때마다 실행
};
