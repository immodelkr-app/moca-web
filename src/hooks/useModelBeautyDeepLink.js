import { useRef, useState } from 'react';

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
