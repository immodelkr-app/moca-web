import React, { useState, useEffect } from 'react';
import {
    fetchAuditionEntries, checkVoteEligibility, fetchMyVotes, submitVotes, fetchVoteTally,
} from '../services/classAuditionService';

// 모카클래스 상세페이지의 오디션 심사/투표 섹션. audition_status가 'open'/'closed'일 때만 노출된다.
const ClassAuditionSection = ({ classId, auditionStatus, currentUser }) => {
    const [entries, setEntries] = useState([]);
    const [tally, setTally] = useState([]);
    const [loading, setLoading] = useState(true);
    const [eligible, setEligible] = useState(false);
    const [hasVoted, setHasVoted] = useState(false);
    const [selected, setSelected] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            if (auditionStatus === 'closed') {
                const { data } = await fetchVoteTally(classId);
                if (!cancelled) setTally(data);
            } else if (auditionStatus === 'open') {
                const { data } = await fetchAuditionEntries(classId);
                if (!cancelled) setEntries(data);
                if (currentUser?.id) {
                    const [{ eligible: isEligible }, { data: myVotes }] = await Promise.all([
                        checkVoteEligibility(classId, currentUser.id),
                        fetchMyVotes(classId, currentUser.id),
                    ]);
                    if (!cancelled) {
                        setEligible(isEligible);
                        setHasVoted((myVotes || []).length > 0);
                    }
                }
            }
            if (!cancelled) setLoading(false);
        };
        load();
        return () => { cancelled = true; };
    }, [classId, auditionStatus, currentUser?.id]);

    const toggleSelect = (entryId) => {
        setSelected(prev => {
            if (prev.includes(entryId)) return prev.filter(id => id !== entryId);
            if (prev.length >= 2) return prev;
            return [...prev, entryId];
        });
    };

    const handleSubmit = async () => {
        if (selected.length !== 2) { setError('정확히 2명을 선택해주세요.'); return; }
        setSubmitting(true);
        setError('');
        const { error: err } = await submitVotes(classId, currentUser.id, selected);
        if (err) {
            setError(typeof err === 'string' ? err : (err.message || '투표에 실패했습니다.'));
            setSubmitting(false);
            return;
        }
        setHasVoted(true);
        setSubmitting(false);
    };

    if (auditionStatus !== 'open' && auditionStatus !== 'closed') return null;

    return (
        <div id="audition-section" className="mb-6">
            <h2 className="text-lg font-black text-[var(--moca-text)] flex items-center gap-2 mb-6 border-b border-[var(--moca-border)] pb-4">
                <span className="material-symbols-outlined text-fuchsia-400">theater_comedy</span>
                오디션 심사 · 가상 캐스팅
            </h2>

            {loading ? (
                <div className="py-8 text-center text-slate-400 font-bold">불러오는 중...</div>
            ) : auditionStatus === 'closed' ? (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        {tally[0] && (
                            <div className="flex-1 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 border border-amber-200 text-center">
                                <p className="text-amber-500 font-black text-xs tracking-widest mb-3">👑 MAIN</p>
                                <div className="w-28 h-28 mx-auto rounded-2xl overflow-hidden bg-white mb-3">
                                    {tally[0].photo_url ? <img src={tally[0].photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-amber-300">{tally[0].entry_number}</div>}
                                </div>
                                <p className="font-black text-slate-700">{tally[0].entry_number}번{tally[0].display_name ? ` · ${tally[0].display_name}` : ''}</p>
                                <p className="text-amber-500 text-xs font-bold mt-1">{tally[0].voteCount}표</p>
                            </div>
                        )}
                        {tally[1] && (
                            <div className="flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-200 text-center">
                                <p className="text-slate-500 font-black text-xs tracking-widest mb-3">🥈 SUB</p>
                                <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden bg-white mb-3">
                                    {tally[1].photo_url ? <img src={tally[1].photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-slate-300">{tally[1].entry_number}</div>}
                                </div>
                                <p className="font-black text-slate-700">{tally[1].entry_number}번{tally[1].display_name ? ` · ${tally[1].display_name}` : ''}</p>
                                <p className="text-slate-400 text-xs font-bold mt-1">{tally[1].voteCount}표</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : !currentUser ? (
                <p className="text-sm text-slate-400 font-bold py-4 text-center">로그인 후 심사에 참여할 수 있습니다.</p>
            ) : !eligible ? (
                <p className="text-sm text-slate-400 font-bold py-4 text-center">이 회차 수강생/운영진만 심사에 참여할 수 있습니다.</p>
            ) : hasVoted ? (
                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="material-symbols-outlined text-4xl text-fuchsia-300 block mb-2">how_to_vote</span>
                    <p className="text-slate-500 font-bold text-sm">투표가 완료되었습니다. 결과 발표를 기다려주세요!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-sm text-slate-500 font-bold">잘했다고 생각하는 참가자 2명을 선택해주세요 ({selected.length}/2)</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {entries.map(entry => {
                            const isSelected = selected.includes(entry.id);
                            return (
                                <button
                                    key={entry.id}
                                    onClick={() => toggleSelect(entry.id)}
                                    className={`relative rounded-2xl p-2 border-2 transition-all ${isSelected ? 'border-fuchsia-500 bg-fuchsia-50' : 'border-slate-100 bg-slate-50'}`}
                                >
                                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-white mb-1.5">
                                        {entry.photo_url ? <img src={entry.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl font-black text-slate-300">{entry.entry_number}</div>}
                                    </div>
                                    <p className="text-xs font-black text-slate-700">{entry.entry_number}번</p>
                                    {isSelected && (
                                        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-fuchsia-500 text-white flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[14px]">check</span>
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                    <button
                        onClick={handleSubmit}
                        disabled={selected.length !== 2 || submitting}
                        className="w-full py-3.5 rounded-2xl bg-fuchsia-600 text-white font-black text-sm disabled:opacity-40 transition-all"
                    >
                        {submitting ? '제출 중...' : '심사 참여하기'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ClassAuditionSection;
