/**
 * supabaseClient.js
 * Supabase 클라이언트 초기화
 *
 * .env에 아래 변수를 추가해야 실제 DB 저장이 됩니다:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJhbGc...
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
            detectSessionInUrl: true,
        }
    })
    : null;

export const isSupabaseEnabled = () => !!supabase;
