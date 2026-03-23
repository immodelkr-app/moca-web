import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';

export const usePageView = () => {
    const location = useLocation();

    useEffect(() => {
        const recordPageView = async () => {
            if (!isSupabaseEnabled()) return;

            // 라우터의 현재 경로를 가져옵니다.
            const path = location.pathname;

            try {
                // page_views 테이블에 현재 경로 기록
                const { error } = await supabase
                    .from('page_views')
                    .insert([{ path }]);

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
