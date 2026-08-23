import React, { useState, useRef } from 'react';

const MODELBEAUTY_SCHEME = 'modelbeauty://open';
const MODELBEAUTY_WEB = 'https://modelbeauty.kr';
const MODELBEAUTY_PLAY_STORE = 'https://play.google.com/store/apps/details?id=kr.modelbeauty';
const APP_OPEN_TIMEOUT_MS = 1800;

const isMobileDevice = () => {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /android|iphone|ipad|ipod/i.test(ua);
};

// 모델뷰티: 앱이 깔려있으면 바로 앱으로, 없으면 인터스티셜에서 설치/웹계속 선택
const ModelBeautyBanner = ({ variant = 'card', className = '' }) => {
    const [showInstallModal, setShowInstallModal] = useState(false);
    const timerRef = useRef(null);

    const openApp = () => {
        if (!isMobileDevice()) {
            window.open(MODELBEAUTY_WEB, '_blank', 'noopener');
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

        timerRef.current = setTimeout(() => {
            cleanup();
            if (!document.hidden) setShowInstallModal(true);
        }, APP_OPEN_TIMEOUT_MS);

        window.location.href = MODELBEAUTY_SCHEME;
    };

    const handleInstall = () => {
        window.location.href = MODELBEAUTY_PLAY_STORE;
    };

    const handleContinueWeb = () => {
        setShowInstallModal(false);
        window.location.href = MODELBEAUTY_WEB;
    };

    return (
        <>
            {variant === 'card' ? (
                <button
                    onClick={openApp}
                    className={`w-full flex items-center gap-4 p-5 rounded-3xl bg-gradient-to-r from-pink-500 to-violet-500 shadow-md shadow-pink-500/20 active:scale-[0.98] transition-all text-left ${className}`}
                >
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🌸</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-black text-base leading-tight">모델뷰티</h3>
                        <p className="text-white/85 text-xs font-bold mt-0.5">포인트 쓰러가자 GO 🛍️</p>
                    </div>
                    <span className="material-symbols-outlined text-white/80 text-[22px] flex-shrink-0">chevron_right</span>
                </button>
            ) : (
                <button
                    onClick={openApp}
                    className={`w-full py-2.5 px-3 rounded-2xl bg-[#EBE3FC] text-[#633AE8] text-[11px] font-black flex items-center justify-center gap-1 shadow-sm active:scale-[0.98] transition-all ${className}`}
                >
                    <span>✨</span>
                    <span>모델뷰티에서 포인트 쓰러가자 GO 🛍️</span>
                    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
            )}

            {showInstallModal && (
                <div
                    className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 px-6"
                    onClick={() => setShowInstallModal(false)}
                >
                    <div
                        className="w-full max-w-sm bg-white rounded-3xl p-6 text-center shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#F3E8FF] flex items-center justify-center">
                            <span className="text-2xl">🌸</span>
                        </div>
                        <h3 className="text-lg font-black text-[#1F1235] mb-2">모델뷰티 앱 설치하기</h3>
                        <p className="text-sm font-medium text-[#6B7280] leading-relaxed mb-6">
                            앱을 설치하면 더 빠르고 편하게<br />포인트를 사용할 수 있어요!
                        </p>
                        <div className="space-y-2.5">
                            <button
                                onClick={handleInstall}
                                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 text-white font-black active:scale-[0.98] transition-all"
                            >
                                앱 설치하기
                            </button>
                            <button
                                onClick={handleContinueWeb}
                                className="w-full py-3.5 rounded-2xl bg-gray-100 text-gray-500 font-bold active:scale-[0.98] transition-all"
                            >
                                웹으로 계속하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ModelBeautyBanner;
