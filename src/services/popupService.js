import { supabase, isSupabaseEnabled } from './supabaseClient';

const LOCAL_KEY = 'immodel_popups';

const loadLocal = () => {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
};
const saveLocal = (data) => localStorage.setItem(LOCAL_KEY, JSON.stringify(data));

// 활성 팝업 목록 (오늘 날짜 기준 유효한 것만)
export const fetchActivePopups = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('popups')
            .select('*')
            .eq('is_active', true)
            .or(`start_date.is.null,start_date.lte.${today}`)
            .or(`end_date.is.null,end_date.gte.${today}`)
            .order('created_at', { ascending: false });
        if (!error && data) return data;
    }
    const all = loadLocal();
    return all.filter(p => p.is_active);
};

// 전체 팝업 목록 (어드민용)
export const fetchAllPopups = async () => {
    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('popups')
            .select('*')
            .order('created_at', { ascending: false });
        if (!error && data) { saveLocal(data); return data; }
    }
    return loadLocal();
};

// 팝업 생성
export const createPopup = async (popup) => {
    if (isSupabaseEnabled()) {
        const { data, error } = await supabase.from('popups').insert([popup]).select().single();
        if (!error && data) {
            const local = loadLocal();
            saveLocal([data, ...local]);
            return data;
        }
    }
    const newPopup = { ...popup, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    const local = loadLocal();
    saveLocal([newPopup, ...local]);
    return newPopup;
};

// 팝업 수정
export const updatePopup = async (id, updates) => {
    if (isSupabaseEnabled()) {
        const { data, error } = await supabase.from('popups').update(updates).eq('id', id).select().single();
        if (!error && data) {
            const local = loadLocal().map(p => p.id === id ? data : p);
            saveLocal(local);
            return data;
        }
    }
    const local = loadLocal().map(p => p.id === id ? { ...p, ...updates } : p);
    saveLocal(local);
    return local.find(p => p.id === id);
};

// 팝업 삭제
export const deletePopup = async (id) => {
    if (isSupabaseEnabled()) {
        await supabase.from('popups').delete().eq('id', id);
    }
    saveLocal(loadLocal().filter(p => p.id !== id));
};
