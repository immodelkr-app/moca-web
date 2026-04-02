import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/', // Vercel 배포 및 딥 링크(/home/dashboard)에서 자산 경로를 정확히 잡기 위해 루트(/)로 변경
    server: {
        host: true, // open to local network
        port: 5173, // default port
    },
    build: {
        outDir: 'dist',
    }
})
