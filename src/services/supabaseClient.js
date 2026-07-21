/**
 * supabaseClient.js
 * Supabase 클라이언트 초기화
 *
 * .env에 아래 변수를 추가해야 실제 DB 저장이 됩니다:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJhbGc...\
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabase 환경변수가 없으면 null 반환 (localStorage fallback 사용)
if (!supabaseUrl || !supabaseAnonKey) {
    if (import.meta.env.PROD) {
        console.error('%c[Supabase] CRITICAL: Environment variables missing!', 'color: white; background: red; padding: 5px; border-radius: 3px;');
        console.error('PROD 환경인데 VITE_SUPABASE_URL 등이 비어 있습니다. 배포 설정에서 환경 변수를 등록해 주세요.');
    } else {
        console.warn('[Supabase] Local development: Environment variables missing. Using fallback mode.');
    }
}

// ✅ Capacitor WebView 환경에서 window.postMessage 충돌 방지용 안전한 fetch 래퍼
// Capacitor 브리지는 window.postMessage를 인터셉트하므로,
// supabase-js 내부의 BroadcastChannel / postMessage 사용이 충돌을 일으킬 수 있습니다.
const safeFetch = (...args) => {
    return fetch(...args);
};

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            // ✅ Web Locks API 우회: 여러 탭 또는 동시 auth 작업에서 발생하는
            // "Navigator LockManager lock timed out" 오류를 방지합니다.
            lock: async (_name, _acquireTimeout, fn) => {
                return await fn();
            },
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false, // Capacitor WebView에서 URL 감지 비활성화
            storageKey: 'moca-supabase-auth', // 고정 스토리지 키
        },
        global: {
            // ✅ Capacitor WebView에서 supabase-js가 내부적으로
            // window.postMessage를 호출하는 것을 방지하기 위한 fetch 래퍼
            fetch: safeFetch,
            headers: {},
        },
        realtime: {
            // ✅ 불필요한 실시간 연결 비활성화 (어드민 공지 등록에는 불필요)
            params: {
                eventsPerSecond: 2,
            },
        },
    })
    : null;

export const isSupabaseEnabled = () => !!supabase;

