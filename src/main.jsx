import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ── Capacitor/WebView Window.postMessage Safety Interceptor ──
// Android WebView 또는 Capacitor 환경에서 window.postMessage 호출 시
// transfer 인자가 전달되어 "Failed to execute 'postMessage' on 'Window': The object must have a callable @@iterator property"
// 에러가 발생하는 현상을 방지합니다.
if (typeof window !== 'undefined' && typeof window.postMessage === 'function') {
    const originalPostMessage = window.postMessage;
    window.postMessage = function (message, targetOrigin, transfer) {
        try {
            if (transfer !== undefined && (!transfer || typeof transfer[Symbol.iterator] !== 'function')) {
                return originalPostMessage.call(window, message, targetOrigin || '*');
            }
            return originalPostMessage.call(window, message, targetOrigin || '*', transfer);
        } catch (err) {
            console.warn('[PostMessage Safe Wrapper] Prevented crash on postMessage:', err);
            try {
                return originalPostMessage.call(window, message, targetOrigin || '*');
            } catch (fallbackErr) {
                // 안전 무시
            }
        }
    };
}

// ── Chunk Load Error Handler ──
// 배포 직후 이전 버전의 캐시 때문에 발생하는 'Failed to load module' 에러 발생시 자동 새로고침
window.addEventListener('error', (e) => {
    if (e.message && (e.message.includes('Failed to fetch dynamically imported module') || e.message.includes('Importing a module script failed'))) {
        console.warn('[System] Chunk Load Error detected. Reloading to latest version...');
        window.location.reload();
    }
}, true);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)

