import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const OpenAppRedirect = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(true);
    const path = searchParams.get('path') || 'home/dashboard';

    useEffect(() => {
        // Simple mobile detection
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isMobileDevice = /android|iphone|ipad|ipod/i.test(userAgent);
        setIsMobile(isMobileDevice);

        if (isMobileDevice) {
            // Auto redirect to custom URL scheme
            const appUrl = `immodel://${path}`;
            window.location.href = appUrl;

            // Optional: fallback to store after a short delay if app didn't open
            const timer = setTimeout(() => {
                // If they remain in the browser, show a button or suggest downloading/using web
                console.log("App did not open, user remains on web page.");
            }, 2500);

            return () => clearTimeout(timer);
        } else {
            // On desktop, directly navigate to the web route
            navigate('/' + path);
        }
    }, [path, navigate]);

    const handleOpenApp = () => {
        window.location.href = `immodel://${path}`;
    };

    const handleUseWeb = () => {
        navigate('/' + path);
    };

    if (!isMobile) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--moca-bg)]">
                <span className="material-symbols-outlined text-indigo-500 animate-spin text-4xl">progress_activity</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12 font-sans select-none">
            <div className="w-full max-w-sm bg-white rounded-[32px] border border-slate-100 p-8 shadow-xl text-center space-y-8 animate-scaleUp">
                {/* Logo & Header */}
                <div className="space-y-3">
                    <div className="w-20 h-20 bg-gradient-to-br from-[#9333EA] to-[#7C3AED] rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
                        <span className="material-symbols-outlined text-white text-[42px] font-light">rocket_launch</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">모두의 캐스팅 아임모카</h2>
                    <p className="text-slate-400 text-xs font-bold">안전하고 편리하게 앱에서 확인해보세요</p>
                </div>

                {/* Status Indicator */}
                <div className="py-2 px-4 rounded-full bg-indigo-50 border border-indigo-100 inline-flex items-center gap-2 mx-auto">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
                    <span className="text-xs text-indigo-600 font-black">앱으로 이동하는 중...</span>
                </div>

                {/* Instruction */}
                <p className="text-xs text-slate-400 font-bold leading-relaxed">
                    아임모카 앱이 설치되어 있다면 자동으로 실행됩니다.<br />
                    실행되지 않는다면 아래 버튼을 눌러주세요.
                </p>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={handleOpenApp}
                        className="w-full py-4 rounded-[20px] bg-indigo-600 text-white font-black text-sm shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[16px] font-black">open_in_new</span>
                        아임모카 앱에서 열기
                    </button>
                    
                    <button
                        onClick={handleUseWeb}
                        className="w-full py-4 rounded-[20px] bg-slate-100 hover:bg-slate-200 text-slate-500 font-black text-sm transition-all active:scale-[0.98]"
                    >
                        모바일 웹으로 계속하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OpenAppRedirect;
