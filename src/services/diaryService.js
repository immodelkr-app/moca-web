import { supabase, isSupabaseEnabled } from './supabaseClient';
import { getUser } from './userService';

const getLocalKey = (agencyName) => `agency_memo_${agencyName}`;

export const fetchAllDiaries = async () => {
    const user = getUser();
    const nickname = user?.nickname || 'guest';

    if (isSupabaseEnabled()) {
        // --- Migration Logic ---
        const migratedFlag = `moca_diaries_migrated_${nickname}`;
        if (!localStorage.getItem(migratedFlag)) {
            const allLocalMemos = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('agency_memo_')) {
                    const agencyName = key.replace('agency_memo_', '');
                    try {
                        const agencyMemos = JSON.parse(localStorage.getItem(key) || '[]');
                        agencyMemos.forEach(memo => {
                            // Only migrate items that look like old local formats (don't duplicate if already fetched)
                            if (!memo.id || typeof memo.id === 'number') {
                                allLocalMemos.push({
                                    nickname,
                                    agency_name: agencyName,
                                    date: memo.date,
                                    content: memo.content,
                                    timestamp: memo.timestamp || new Date().toISOString()
                                });
                            }
                        });
                    } catch (e) { }
                }
            }
            if (allLocalMemos.length > 0) {
                // Ignore errors on migration, attempt to push
                await supabase.from('tour_diaries').insert(allLocalMemos);
            }
            localStorage.setItem(migratedFlag, 'true');
        }
        // ------------------------

        const { data, error } = await supabase
            .from('tour_diaries')
            .select('*')
            .eq('nickname', nickname)
            .order('timestamp', { ascending: false });

        if (!error && data) {
            // Also sync to localStorage for offline access
            const agencyMemos = {};
            data.forEach(memo => {
                const aname = memo.agency_name || memo.agencyName; // Safety fallback
                if (!agencyMemos[aname]) {
                    agencyMemos[aname] = [];
                }
                agencyMemos[aname].push({
                    id: memo.id,
                    date: memo.date,
                    content: memo.content,
                    timestamp: memo.timestamp || memo.created_at
                });
            });

            // Clear old keys to avoid ghosts, then set new ones
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('agency_memo_')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));

            Object.keys(agencyMemos).forEach(agencyName => {
                localStorage.setItem(getLocalKey(agencyName), JSON.stringify(agencyMemos[agencyName]));
            });

            return data.map(memo => ({
                id: memo.id,
                agencyName: memo.agency_name || memo.agencyName,
                date: memo.date,
                content: memo.content,
                timestamp: memo.timestamp || memo.created_at
            }));
        } else if (error) {
            console.error("Supabase fetch failed", error);
        }
    }

    // Fallback
    const memos = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('agency_memo_')) {
            const agencyName = key.replace('agency_memo_', '');
            try {
                const agencyMemos = JSON.parse(localStorage.getItem(key) || '[]');
                const memosWithAgency = agencyMemos.map(memo => ({
                    ...memo,
                    agencyName
                }));
                memos.push(...memosWithAgency);
            } catch (e) { }
        }
    }

    // Sort
    memos.sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return memos;
};

export const fetchDiariesByAgency = async (agencyName) => {
    const user = getUser();
    const nickname = user?.nickname || 'guest';

    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('tour_diaries')
            .select('*')
            .eq('nickname', nickname)
            .eq('agency_name', agencyName)
            .order('timestamp', { ascending: false });

        if (!error && data) {
            const memos = data.map(memo => ({
                id: memo.id,
                date: memo.date,
                content: memo.content,
                timestamp: memo.timestamp || memo.created_at
            }));
            localStorage.setItem(getLocalKey(agencyName), JSON.stringify(memos));
            return memos;
        }
    }

    // Fallback
    const savedMemos = localStorage.getItem(getLocalKey(agencyName));
    return savedMemos ? JSON.parse(savedMemos) : [];
};

export const addDiaryEntry = async (agencyName, date, content) => {
    const user = getUser();
    const nickname = user?.nickname || 'guest';
    const timestamp = new Date().toISOString();

    let newMemo = {
        date,
        content,
        timestamp,
        id: Date.now() // Fallback ID
    };

    if (isSupabaseEnabled()) {
        const { data, error } = await supabase
            .from('tour_diaries')
            .insert([{
                nickname,
                agency_name: agencyName,
                date,
                content,
                timestamp
            }])
            .select()
            .single();

        if (!error && data) {
            newMemo.id = data.id;
        } else {
            console.error("Failed to add to Supabase", error);
        }
    }

    // Fallback save
    const existingStr = localStorage.getItem(getLocalKey(agencyName));
    const existingMemos = existingStr ? JSON.parse(existingStr) : [];
    const updatedMemos = [newMemo, ...existingMemos];
    localStorage.setItem(getLocalKey(agencyName), JSON.stringify(updatedMemos));

    return newMemo;
};

export const deleteDiaryEntry = async (agencyName, id) => {
    if (isSupabaseEnabled()) {
        const { error } = await supabase
            .from('tour_diaries')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Failed to delete from Supabase", error);
        }
    }

    const existingStr = localStorage.getItem(getLocalKey(agencyName));
    if (existingStr) {
        const existingMemos = JSON.parse(existingStr);
        const updatedMemos = existingMemos.filter(memo => memo.id !== id);
        localStorage.setItem(getLocalKey(agencyName), JSON.stringify(updatedMemos));
    }
};

export const updateDiaryEntry = async (agencyName, id, content, date) => {
    let updateData = { content };
    if (date) updateData.date = date;

    if (isSupabaseEnabled()) {
        const { error } = await supabase
            .from('tour_diaries')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error("Failed to update Supabase", error);
        }
    }

    const existingStr = localStorage.getItem(getLocalKey(agencyName));
    if (existingStr) {
        const existingMemos = JSON.parse(existingStr);
        const updatedMemos = existingMemos.map(memo => {
            if (memo.id === id) {
                return { ...memo, ...updateData };
            }
            return memo;
        });
        localStorage.setItem(getLocalKey(agencyName), JSON.stringify(updatedMemos));
    }
};
