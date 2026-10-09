/**
 * newContentService.js
 * 대시보드 버튼의 N 뱃지 — 최근 3일 내 새 콘텐츠가 있고, 사용자가 아직 확인하지 않았을 때만 표시
 */
import { supabase, isSupabaseEnabled } from './supabaseClient';

const NEW_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const SEEN_KEY_PREFIX = 'new_content_seen_';

// 섹션별 최신 콘텐츠 조회 (모카그램은 본인 글 제외)
const SOURCES = {
    class: (since) => supabase.from('classes').select('created_at').gt('created_at', since),
    cert: (since, nickname) => {
        let q = supabase.from('certification_posts').select('created_at').gt('created_at', since);
        if (nickname) q = q.neq('user_nickname', nickname);
        return q;
    },
};

const getSeenAt = (section) => Number(localStorage.getItem(SEEN_KEY_PREFIX + section)) || 0;

// 해당 메뉴를 열어봤음을 기록 (이 시각 이전 콘텐츠는 N 표시 안 함)
export const markContentSeen = (section) => {
    localStorage.setItem(SEEN_KEY_PREFIX + section, String(Date.now()));
};

// 반환: { class: boolean, cert: boolean }
export const fetchNewContentFlags = async (nickname) => {
    const flags = { class: false, cert: false };
    if (!isSupabaseEnabled()) return flags;

    await Promise.all(Object.keys(SOURCES).map(async (section) => {
        // 3일 이전 글은 무조건 제외, 이미 확인한 시각 이전 글도 제외
        const sinceMs = Math.max(Date.now() - NEW_WINDOW_MS, getSeenAt(section));
        const { data, error } = await SOURCES[section](new Date(sinceMs).toISOString(), nickname)
            .order('created_at', { ascending: false })
            .limit(1);
        flags[section] = !error && (data || []).length > 0;
    }));
    return flags;
};
