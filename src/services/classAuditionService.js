/**
 * classAuditionService.js
 * 모카클래스 오디션 심사/투표 관련 서비스
 */
import { supabase, isSupabaseEnabled } from './supabaseClient';

const CLASS_BUCKET = 'class-images';

// ──────────────────────────────────────────────
// 📋 참가자 항목 관리 (운영자)
// ──────────────────────────────────────────────

export const fetchAuditionEntries = async (classId) => {
    if (!isSupabaseEnabled()) return { data: [], error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('class_audition_entries')
        .select('*')
        .eq('class_id', classId)
        .order('entry_number', { ascending: true });
    return { data: data || [], error };
};

export const uploadAuditionPhoto = async (file) => {
    if (!isSupabaseEnabled()) return { url: null, error: 'Supabase not connected' };
    const ext = file.name.split('.').pop();
    const fileName = `audition_${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
        .from(CLASS_BUCKET)
        .upload(fileName, file, { upsert: true, contentType: file.type });
    if (uploadErr) return { url: null, error: uploadErr };
    const { data } = supabase.storage.from(CLASS_BUCKET).getPublicUrl(fileName);
    return { url: data.publicUrl, error: null };
};

export const createAuditionEntry = async ({ classId, entryNumber, photoUrl, displayName }) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('class_audition_entries')
        .insert([{
            class_id: classId,
            entry_number: parseInt(entryNumber, 10),
            photo_url: photoUrl || null,
            display_name: displayName || null,
        }])
        .select()
        .single();
    return { data, error };
};

export const deleteAuditionEntry = async (entryId) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { error } = await supabase
        .from('class_audition_entries')
        .delete()
        .eq('id', entryId);
    return { error };
};

// ──────────────────────────────────────────────
// 🗳️ 투표 상태 관리 (운영자)
// ──────────────────────────────────────────────

export const openAudition = async (classId) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('classes')
        .update({ audition_status: 'open', audition_opened_at: new Date().toISOString() })
        .eq('id', classId)
        .select()
        .single();
    return { data, error };
};

export const closeAudition = async (classId) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('classes')
        .update({ audition_status: 'closed', audition_closed_at: new Date().toISOString() })
        .eq('id', classId)
        .select()
        .single();
    return { data, error };
};

export const reopenAuditionDraft = async (classId) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    const { data, error } = await supabase
        .from('classes')
        .update({ audition_status: 'draft' })
        .eq('id', classId)
        .select()
        .single();
    return { data, error };
};

// ──────────────────────────────────────────────
// ✅ 자격 체크 + 투표 (참석자/운영진)
// ──────────────────────────────────────────────

/**
 * 그 회차 심사에 참여할 자격이 있는지 확인
 * (수강확정(paid) 참석자 이거나, users.is_staff_judge 플래그가 켜진 운영진)
 */
export const checkVoteEligibility = async (classId, userId) => {
    if (!isSupabaseEnabled() || !userId) return { eligible: false, error: null };

    const [appResult, userResult] = await Promise.all([
        supabase
            .from('class_applications')
            .select('approval_status')
            .eq('class_id', classId)
            .eq('user_id', userId)
            .maybeSingle(),
        supabase
            .from('users')
            .select('is_staff_judge')
            .eq('id', userId)
            .maybeSingle(),
    ]);

    const isPaidAttendee = appResult.data?.approval_status === 'paid';
    const isStaffJudge = !!userResult.data?.is_staff_judge;

    return {
        eligible: isPaidAttendee || isStaffJudge,
        error: appResult.error || userResult.error || null,
    };
};

export const fetchMyVotes = async (classId, userId) => {
    if (!isSupabaseEnabled() || !userId) return { data: [], error: null };
    const { data, error } = await supabase
        .from('class_audition_votes')
        .select('entry_id')
        .eq('class_id', classId)
        .eq('user_id', userId);
    return { data: data || [], error };
};

export const submitVotes = async (classId, userId, entryIds) => {
    if (!isSupabaseEnabled()) return { error: 'Supabase not connected' };
    if (!Array.isArray(entryIds) || entryIds.length !== 2) {
        return { error: '정확히 2명을 선택해야 합니다.' };
    }

    // 이미 투표했는지 먼저 확인 (중복 제출 방지)
    const { data: existing, error: existingError } = await fetchMyVotes(classId, userId);
    if (existingError) return { error: existingError };
    if (existing.length > 0) return { error: '이미 투표하셨습니다.' };

    const { error } = await supabase
        .from('class_audition_votes')
        .insert(entryIds.map(entryId => ({ class_id: classId, entry_id: entryId, user_id: userId })));
    return { error };
};

// ──────────────────────────────────────────────
// 📊 결과 집계
// ──────────────────────────────────────────────

/**
 * 참가자별 득표수를 내림차순으로 반환 (1위=메인, 2위=서브)
 */
export const fetchVoteTally = async (classId) => {
    if (!isSupabaseEnabled()) return { data: [], error: null };

    const [entriesResult, votesResult] = await Promise.all([
        fetchAuditionEntries(classId),
        supabase.from('class_audition_votes').select('entry_id').eq('class_id', classId),
    ]);

    if (entriesResult.error) return { data: [], error: entriesResult.error };
    if (votesResult.error) return { data: [], error: votesResult.error };

    const voteCounts = {};
    (votesResult.data || []).forEach(v => { voteCounts[v.entry_id] = (voteCounts[v.entry_id] || 0) + 1; });

    const tally = entriesResult.data
        .map(entry => ({ ...entry, voteCount: voteCounts[entry.id] || 0 }))
        .sort((a, b) => b.voteCount - a.voteCount);

    return { data: tally, error: null };
};

export const subscribeToAuditionVotes = (classId, onChange) => {
    if (!isSupabaseEnabled()) return () => {};
    const channel = supabase
        .channel(`class_audition_votes_${classId}`)
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'class_audition_votes', filter: `class_id=eq.${classId}` },
            onChange
        )
        .subscribe();

    return () => supabase.removeChannel(channel);
};
