import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../services/supabaseClient';
import { getUser, updateUserProfile } from '../services/userService';
import { initializePushNotifications } from '../services/pushNotificationService';

/**
 * 마케팅 수신 동의(선택) 공용 로직 — 모카캐스팅 게시판 동의 카드, GOLD 안내 팝업의 동의 영역에서 함께 사용
 * - 동의 여부는 세션이 아니라 DB의 최신 값으로 확인한다 (다른 기기에서 이미 동의했어도 다시 묻지 않음)
 * - 동의하면 동의 여부와 시각을 저장하고, 앱이면 이어서 푸시 허용을 요청한다
 */
export const useMarketingConsent = () => {
    const user = getUser();
    const [checking, setChecking] = useState(true);
    const [alreadyAgreed, setAlreadyAgreed] = useState(!!user?.marketing_consent);
    const [agreedNow, setAgreedNow] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const check = async () => {
            if (user?.id && supabase) {
                const { data } = await supabase.from('users').select('marketing_consent').eq('id', user.id).maybeSingle();
                if (!cancelled && data) setAlreadyAgreed(!!data.marketing_consent);
            }
            if (!cancelled) setChecking(false);
        };
        check();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const agree = async () => {
        if (!user) return false;
        setSaving(true);
        setError('');
        const { error: err } = await updateUserProfile(user.id || user.nickname, {
            marketing_consent: true,
            marketing_consent_at: new Date().toISOString(),
        });
        setSaving(false);
        if (err) {
            setError(err.message || '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            return false;
        }
        // 앱이면 바로 푸시 허용 요청 (실패해도 동의 저장은 유지)
        if (Capacitor.isNativePlatform()) initializePushNotifications().catch(() => { });
        setAgreedNow(true);
        return true;
    };

    return { user, checking, alreadyAgreed, agreedNow, saving, error, agree };
};
