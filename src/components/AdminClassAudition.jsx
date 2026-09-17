import React, { useState, useEffect } from 'react';
import {
    fetchAuditionEntries, uploadAuditionPhoto, createAuditionEntry, deleteAuditionEntry,
    openAudition, closeAudition, reopenAuditionDraft, fetchVoteTally,
} from '../services/classAuditionService';

const MAX_FILE_MB = 10;

const STATUS_INFO = {
    none: { label: '미시작', color: 'bg-gray-100 text-gray-500' },
    draft: { label: '참가자 등록 중', color: 'bg-slate-100 text-slate-600' },
    open: { label: '투표 진행 중', color: 'bg-green-100 text-green-700' },
    closed: { label: '마감 (결과 공개)', color: 'bg-indigo-100 text-indigo-700' },
};

// 모카클래스 오디션 심사/투표 관리 패널. AdminClasses.jsx의 view==='audition'일 때 마운트된다.
const AdminClassAudition = ({ classData, onStatusChange }) => {
    const [auditionStatus, setAuditionStatus] = useState(classData.audition_status || 'none');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tally, setTally] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // 등록 폼
    const [entryNumber, setEntryNumber] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState('');

    const showError = (msg) => { setError(msg); setTimeout(() => setError(''), 4000); };
    const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

    const loadEntries = async () => {
        setLoading(true);
        const { data, error: err } = await fetchAuditionEntries(classData.id);
        setEntries(data);
        if (err) showError('참가자 목록을 불러오지 못했습니다: ' + (err.message || String(err)));
        setLoading(false);
    };

    const loadTally = async () => {
        const { data } = await fetchVoteTally(classData.id);
        setTally(data);
    };

    useEffect(() => {
        loadEntries();
        if (auditionStatus === 'open' || auditionStatus === 'closed') loadTally();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classData.id]);

    const handlePhotoSelect = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { showError('이미지 파일만 업로드 가능합니다.'); return; }
        if (file.size > MAX_FILE_MB * 1024 * 1024) { showError(`최대 ${MAX_FILE_MB}MB까지 업로드 가능합니다.`); return; }
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(file));
    };

    const resetForm = () => {
        setEntryNumber('');
        setDisplayName('');
        setPhotoFile(null);
        setPhotoPreview('');
    };

    const handleRegisterEntry = async (e) => {
        e.preventDefault();
        if (!entryNumber) { showError('참가자 번호를 입력해주세요.'); return; }
        setIsSubmitting(true);
        try {
            let photoUrl = null;
            if (photoFile) {
                const { url, error: uploadErr } = await uploadAuditionPhoto(photoFile);
                if (uploadErr) throw uploadErr;
                photoUrl = url;
            }
            const { error: createErr } = await createAuditionEntry({
                classId: classData.id, entryNumber, photoUrl, displayName,
            });
            if (createErr) throw createErr;
            showSuccess(`✅ ${entryNumber}번 참가자가 등록되었습니다.`);
            resetForm();
            loadEntries();
        } catch (err) {
            showError('등록 실패: ' + (err.message || String(err)));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEntry = async (entry) => {
        if (!window.confirm(`${entry.entry_number}번 참가자를 삭제하시겠습니까?`)) return;
        const { error: err } = await deleteAuditionEntry(entry.id);
        if (err) { showError('삭제 실패: ' + err.message); return; }
        setEntries(prev => prev.filter(en => en.id !== entry.id));
    };

    const changeStatus = async (action) => {
        if (!window.confirm(
            action === 'open' ? '투표를 시작하시겠습니까? 시작 후에는 참가자 등록을 권장하지 않습니다.' :
            action === 'closed' ? '투표를 마감하고 결과를 공개하시겠습니까?' :
            '참가자 등록 단계로 되돌리시겠습니까?'
        )) return;

        setIsSubmitting(true);
        try {
            const fn = action === 'open' ? openAudition : action === 'closed' ? closeAudition : reopenAuditionDraft;
            const { error: err } = await fn(classData.id);
            if (err) throw err;
            setAuditionStatus(action);
            onStatusChange?.(classData.id, action);
            showSuccess('✅ 상태가 변경되었습니다.');
            if (action === 'open' || action === 'closed') loadTally();
        } catch (err) {
            showError('상태 변경 실패: ' + (err.message || String(err)));
        } finally {
            setIsSubmitting(false);
        }
    };

    const openPresentation = () => {
        window.open(`/admin/classes/${classData.id}/audition/present`, '_blank');
    };

    const status = STATUS_INFO[auditionStatus] || STATUS_INFO.none;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-gradient-to-br from-fuchsia-600 to-pink-600 rounded-[32px] p-8 text-white shadow-2xl shadow-fuchsia-500/20">
                <div className="flex items-center gap-3 mb-3">
                    <span className="material-symbols-outlined text-3xl">theater_comedy</span>
                    <div>
                        <p className="text-pink-200 text-xs font-black uppercase tracking-widest">Audition Voting</p>
                        <h3 className="text-xl font-black">오디션 심사 관리</h3>
                    </div>
                </div>
                <p className="text-pink-200 text-sm font-bold">{classData.title}</p>
                <span className={`inline-block mt-3 px-3 py-1 rounded-full text-[11px] font-black ${status.color}`}>
                    {status.label}
                </span>
            </div>

            {error && <p className="text-red-500 text-sm font-bold px-2">{error}</p>}
            {successMsg && <p className="text-green-600 text-sm font-bold px-2">{successMsg}</p>}

            {/* 상태 전환 버튼 */}
            <div className="bg-white border border-[var(--moca-border)] rounded-[24px] p-6 shadow-sm flex flex-wrap gap-3">
                {auditionStatus === 'none' && (
                    <button disabled={isSubmitting} onClick={() => changeStatus('draft')} className="flex-1 py-3 rounded-2xl bg-slate-800 text-white font-black text-sm hover:opacity-90 transition-all disabled:opacity-50">
                        참가자 등록 시작
                    </button>
                )}
                {auditionStatus === 'draft' && (
                    <button disabled={isSubmitting || entries.length < 2} onClick={() => changeStatus('open')} className="flex-1 py-3 rounded-2xl bg-green-600 text-white font-black text-sm hover:opacity-90 transition-all disabled:opacity-50">
                        투표 시작 {entries.length < 2 && '(최소 2명 등록 필요)'}
                    </button>
                )}
                {auditionStatus === 'open' && (
                    <>
                        <button disabled={isSubmitting} onClick={() => changeStatus('closed')} className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:opacity-90 transition-all disabled:opacity-50">
                            투표 마감 + 결과 공개
                        </button>
                        <button onClick={openPresentation} className="flex-1 py-3 rounded-2xl bg-fuchsia-600 text-white font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">cast</span>
                            프레젠테이션 화면 열기
                        </button>
                    </>
                )}
                {auditionStatus === 'closed' && (
                    <button onClick={openPresentation} className="flex-1 py-3 rounded-2xl bg-fuchsia-600 text-white font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">cast</span>
                        프레젠테이션 화면 열기 (결과 리빌)
                    </button>
                )}
            </div>

            {/* 결과 발표 (마감 시) */}
            {auditionStatus === 'closed' && tally.length > 0 && (
                <div className="bg-white border border-[var(--moca-border)] rounded-[24px] p-6 shadow-sm">
                    <h4 className="font-black text-[var(--moca-text)] mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-fuchsia-500">emoji_events</span>
                        결과 발표
                    </h4>
                    <div className="flex flex-col sm:flex-row gap-4">
                        {tally[0] && (
                            <div className="flex-1 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 border border-amber-200 text-center">
                                <p className="text-amber-500 font-black text-xs tracking-widest mb-3">👑 MAIN</p>
                                <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden bg-white mb-3">
                                    {tally[0].photo_url ? <img src={tally[0].photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-amber-300">{tally[0].entry_number}</div>}
                                </div>
                                <p className="font-black text-slate-700">{tally[0].entry_number}번{tally[0].display_name ? ` · ${tally[0].display_name}` : ''}</p>
                                <p className="text-amber-500 text-xs font-bold mt-1">{tally[0].voteCount}표</p>
                            </div>
                        )}
                        {tally[1] && (
                            <div className="flex-1 bg-slate-50 rounded-2xl p-5 border border-slate-200 text-center">
                                <p className="text-slate-500 font-black text-xs tracking-widest mb-3">🥈 SUB</p>
                                <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden bg-white mb-3">
                                    {tally[1].photo_url ? <img src={tally[1].photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-slate-300">{tally[1].entry_number}</div>}
                                </div>
                                <p className="font-black text-slate-700">{tally[1].entry_number}번{tally[1].display_name ? ` · ${tally[1].display_name}` : ''}</p>
                                <p className="text-slate-400 text-xs font-bold mt-1">{tally[1].voteCount}표</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 참가자 등록 폼 (draft 단계에서만) */}
            {(auditionStatus === 'draft' || auditionStatus === 'none') && (
                <form onSubmit={handleRegisterEntry} className="bg-white border border-[var(--moca-border)] rounded-[24px] p-6 shadow-sm space-y-4">
                    <h4 className="font-black text-[var(--moca-text)] flex items-center gap-2">
                        <span className="material-symbols-outlined text-fuchsia-500">add_a_photo</span>
                        참가자 등록
                    </h4>
                    <div className="flex gap-4 items-start">
                        <label className="relative w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 flex-shrink-0 flex items-center justify-center cursor-pointer hover:border-fuchsia-300 transition-colors">
                            {photoPreview ? (
                                <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-slate-300 text-2xl">add_a_photo</span>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoSelect(e.target.files?.[0])} />
                        </label>
                        <div className="flex-1 space-y-2">
                            <input
                                type="number" min="1" value={entryNumber} onChange={e => setEntryNumber(e.target.value)}
                                placeholder="참가자 번호 (예: 1)"
                                className="w-full bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-fuchsia-400"
                            />
                            <input
                                type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                                placeholder="이름/닉네임 (선택)"
                                className="w-full bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-fuchsia-400"
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={isSubmitting} className="w-full py-3 rounded-2xl bg-fuchsia-600 text-white font-black text-sm hover:opacity-90 transition-all disabled:opacity-50">
                        {isSubmitting ? '등록 중...' : '참가자 추가'}
                    </button>
                </form>
            )}

            {/* 참가자 목록 */}
            <div className="bg-white border border-[var(--moca-border)] rounded-[24px] p-6 shadow-sm">
                <h4 className="font-black text-[var(--moca-text)] mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-fuchsia-500">groups</span>
                    참가자 목록 ({entries.length}명)
                </h4>
                {loading ? (
                    <div className="py-8 text-center text-slate-400 font-bold">불러오는 중...</div>
                ) : entries.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 font-bold text-sm">아직 등록된 참가자가 없습니다</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {entries.map(entry => {
                            const voteInfo = tally.find(t => t.id === entry.id);
                            return (
                                <div key={entry.id} className="relative bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-100 mb-2">
                                        {entry.photo_url ? (
                                            <img src={entry.photo_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <span className="material-symbols-outlined text-3xl">person</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm font-black text-slate-700">{entry.entry_number}번{entry.display_name ? ` · ${entry.display_name}` : ''}</p>
                                    {voteInfo && (auditionStatus === 'open' || auditionStatus === 'closed') && (
                                        <p className="text-[11px] font-bold text-fuchsia-500 mt-0.5">{voteInfo.voteCount}표</p>
                                    )}
                                    {(auditionStatus === 'draft' || auditionStatus === 'none') && (
                                        <button onClick={() => handleDeleteEntry(entry)} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/90 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shadow-sm">
                                            <span className="material-symbols-outlined text-[14px]">close</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminClassAudition;
