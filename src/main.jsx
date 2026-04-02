import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

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
