import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './', // Capacitor Android 로컬 파일 로딩을 위해 필요
    server: {
        host: true, // open to local network
        port: 5173, // default port
    },
    build: {
        outDir: 'dist',
    }
})
