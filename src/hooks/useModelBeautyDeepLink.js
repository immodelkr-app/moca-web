import { useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { MOCA_SESSION_TOKEN_KEY } from '../services/userService';

const MODELBEAUTY_SCHEME = 'modelbeauty://open';
const MODELBEAUTY_WEB = 'https://modelbeauty.kr';
const MODELBEAUTY_PLAY_STORE = 'https://play.google.com/store/apps/details?id=kr.modelbeauty';
const APP_OPEN_TIMEOUT_MS = 1800;

const isMobileDevice = () => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /android|iphone|ipad|ipod/i.test(ua);
};

/**
 * 모델뷰티 앱이 깔려있으면 바로 앱으로(딥링크), 없으면 인터스티셜에서 설치/웹계속 선택.
 * path를 주면 modelbeauty://open?path=... 로 해당 화면(예: 체험단 상세)까지 바로 이동한다.
 * ModelBeautyBanner, 체험단 카드 등 모델뷰티로 넘어가는 모든 진입점이 공유한다.
 */
export const useModelBeautyDeepLink = () => {
    const [showInstallModal, setShowInstallModal] = useState(false);
    const timerRef = useRef(null);
    const pendingPathRef = useRef(undefined);

    const openApp = (path) => {
        if (!isMobileDevice()) {
            const webUrl = path ? `${MODELBEAUTY_WEB}${path}` : MODELBEAUTY_WEB;
            window.open(webUrl, '_blank', 'noopener');
            return;
        }

        const onVisibilityChange = () => {
            if (document.hidden) cleanup();
        };
        const cleanup = () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            clearTimeout(timerRef.current);
        };
        document.addEventListener('visibilitychange', onVisibilityChange);

        pendingPathRef.current = path;
        timerRef.current = setTimeout(() => {
            cleanup();
            if (!document.hidden) setShowInstallModal(true);
        }, APP_OPEN_TIMEOUT_MS);

        window.location.href = path
            ? `${MODELBEAUTY_SCHEME}?path=${encodeURIComponent(path)}`
            : MODELBEAUTY_SCHEME;
    };

    const handleInstall = () => {
        window.location.href = MODELBEAUTY_PLAY_STORE;
    };

    const handleContinueWeb = () => {
        setShowInstallModal(false);
        const path = pendingPathRef.current;
        window.location.href = path ? `${MODELBEAUTY_WEB}${path}` : MODELBEAUTY_WEB;
    };

    const closeModal = () => setShowInstallModal(false);

    return { openApp, showInstallModal, handleInstall, handleContinueWeb, closeModal };
};

export const MODELBEAUTY_WEB_URL = MODELBEAUTY_WEB;

/**
 * 모카 로그인 상태 그대로 모델뷰티 웹 페이지(예: 라이브 상품 /products/slug)를 연다.
 * 서버에서 60초짜리 티켓 URL을 받아 이동하며, 토큰이 없거나 실패하면 티켓 없이 일반 주소로 연다
 * (그 경우 모델뷰티에서 직접 로그인). 반환값은 이동한 URL.
 */
export const openModelBeautyWithLogin = async (path = '/') => {
    let url = `${MODELBEAUTY_WEB}${path}`;
    try {
        const token = localStorage.getItem(MOCA_SESSION_TOKEN_KEY);
        if (token) {
            const r = await fetch('/api/mb-ticket', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, path }),
            });
            const j = r.ok ? await r.json() : null;
            if (j?.url) url = j.url;
        }
    } catch (e) { /* 일반 주소로 진행 */ }
    // 앱에서는 크롬 커스텀 탭(앱 안 느낌, 결제 앱 왕복 가능), 웹에서는 같은 창 이동
    if (Capacitor.isNativePlatform()) await Browser.open({ url });
    else window.location.href = url;
    return url;
};
