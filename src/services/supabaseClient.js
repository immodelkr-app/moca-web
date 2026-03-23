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
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isSupabaseEnabled = () => !!supabase;
