import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { fetchVoteTally, subscribeToAuditionVotes } from '../services/classAuditionService';
import { ADMIN_PASSWORD, ADMIN_AUTH_SESSION_KEY } from './AdminPage';

// /admin/classes/:classId/audition/present - 오디션 심사 결과를 TV/빔프로젝터에 띄우는 전용 화면.
// AdminMocaLiveControlPage와 동일하게 /admin과 인증 세션을 공유한다.
const AdminClassAuditionPresent = () => {
    const { classId } = useParams();
    const [authenticated, setAuthenticated] = useState(() => window.sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) === '1');
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [cls, setCls] = useState(null);
    const [tally, setTally] = useState([]);
    const [loading, setLoading] = useState(true);
    // 'none' → (결과 발표 클릭) → 'sub' → (스페이스바) → 'main'
    const [revealStage, setRevealStage] = useState('none');

    const loadClass = useCallback(async () => {
        const { data } = await supabase.from('classes').select('id, title, audition_status').eq('id', classId).single();
        if (data) setCls(data);
    }, [classId]);

    const loadTally = useCallback(async () => {
        const { data } = await fetchVoteTally(classId);
        setTally(data);
    }, [classId]);

    useEffect(() => {
        if (!authenticated) return;
        setLoading(true);
        Promise.all([loadClass(), loadTally()]).finally(() => setLoading(false));

        const unsubscribeVotes = subscribeToAuditionVotes(classId, () => loadTally());
        const classChannel = supabase
            .channel(`class_audition_status_${classId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'classes', filter: `id=eq.${classId}` }, (payload) => setCls(payload.new))
            .subscribe();

        return () => {
            unsubscribeVotes();
            supabase.removeChannel(classChannel);
        };
    }, [authenticated, classId, loadClass, loadTally]);

    // 서브 발표 단계에서 스페이스바를 누르면 메인을 공개한다
    useEffect(() => {
        if (revealStage !== 'sub') return;
        const handleKeyDown = (e) => {
            if (e.code === 'Space' || e.key === ' ') {
                e.preventDefault();
                setRevealStage('main');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [revealStage]);

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (passwordInput === ADMIN_PASSWORD) {
            window.sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, '1');
            setAuthenticated(true);
        } else {
            setPasswordError('비밀번호가 틀렸습니다.');
        }
    };

    if (!authenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--moca-surface-2)] px-4">
                <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl p-6 w-full max-w-xs shadow-sm">
                    <p className="text-sm font-black text-[var(--moca-text)] mb-3">🔒 관리자 인증</p>
                    <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="관리자 비밀번호"
                        autoFocus
                        className="w-full px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm mb-2"
                    />
                    {passwordError && <p className="text-[12px] font-bold text-red-500 mb-2">{passwordError}</p>}
                    <button type="submit" className="w-full py-2.5 rounded-xl bg-[var(--moca-primary)] text-white font-black text-[13px]">
                        확인
                    </button>
                </form>
            </div>
        );
    }

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white/60 text-sm font-bold">불러오는 중...</div>;
    }

    if (!cls) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-950 text-white/60 text-sm font-bold">
                <p>클래스를 찾을 수 없습니다.</p>
                <Link to="/admin" className="text-fuchsia-400">← 어드민으로 돌아가기</Link>
            </div>
        );
    }

    const isClosed = cls.audition_status === 'closed';
    const maxVotes = tally[0]?.voteCount || 1;

    // 동률 처리: 최다득표(메인) 그룹, 그 다음 득표(서브) 그룹을 각각 묶어서 보여준다
    const topVotes = tally[0]?.voteCount;
    const mainGroup = topVotes !== undefined ? tally.filter(t => t.voteCount === topVotes) : [];
    const restAfterMain = tally.filter(t => t.voteCount !== topVotes);
    const subVotes = restAfterMain[0]?.voteCount;
    const subGroup = subVotes !== undefined ? restAfterMain.filter(t => t.voteCount === subVotes) : [];

    const startReveal = () => setRevealStage(subGroup.length > 0 ? 'sub' : 'main');

    return (
        <div className="min-h-screen bg-slate-950 text-white px-6 py-10 lg:px-16 lg:py-14 flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <Link to="/admin" className="text-[12px] font-bold text-white/40 hover:text-white/70">← 어드민으로 돌아가기</Link>
                <span className={`px-3 py-1 rounded-full text-[11px] font-black ${isClosed ? 'bg-indigo-500/20 text-indigo-300' : 'bg-green-500/20 text-green-300'}`}>
                    {isClosed ? '마감됨' : '투표 진행 중'}
                </span>
            </div>

            <h1 className="text-2xl lg:text-4xl font-black text-center mb-2">{cls.title}</h1>
            <p className="text-center text-white/40 font-bold text-sm mb-12">오디션 심사 · 가상 캐스팅</p>

            {isClosed && revealStage !== 'none' ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-10 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row items-center gap-10">
                        {subGroup.length > 0 && (
                            <div className="flex flex-col items-center gap-4 animate-fadeIn">
                                <p className="text-slate-300 font-black text-lg tracking-widest">🥈 SUB</p>
                                <div className="flex flex-wrap items-center justify-center gap-6">
                                    {subGroup.map(entry => (
                                        <div key={entry.id} className="flex flex-col items-center gap-3">
                                            <div className="w-40 h-40 lg:w-52 lg:h-52 rounded-[28px] overflow-hidden border-4 border-slate-400 shadow-xl">
                                                {entry.photo_url ? <img src={entry.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-4xl font-black">{entry.entry_number}</div>}
                                            </div>
                                            <p className="text-xl font-black">{entry.entry_number}번{entry.display_name ? ` · ${entry.display_name}` : ''}</p>
                                            <p className="text-slate-300 font-bold">{entry.voteCount}표</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {revealStage === 'main' && mainGroup.length > 0 && (
                            <div className="flex flex-col items-center gap-4 animate-fadeIn">
                                <p className="text-amber-400 font-black text-xl tracking-widest">👑 MAIN</p>
                                <div className="flex flex-wrap items-center justify-center gap-6">
                                    {mainGroup.map(entry => (
                                        <div key={entry.id} className="flex flex-col items-center gap-3">
                                            <div className="w-56 h-56 lg:w-72 lg:h-72 rounded-[32px] overflow-hidden border-4 border-amber-400 shadow-2xl shadow-amber-400/30">
                                                {entry.photo_url ? <img src={entry.photo_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800 flex items-center justify-center text-6xl font-black">{entry.entry_number}</div>}
                                            </div>
                                            <p className="text-2xl font-black">{entry.entry_number}번{entry.display_name ? ` · ${entry.display_name}` : ''}</p>
                                            <p className="text-amber-300 font-bold">{entry.voteCount}표</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {revealStage === 'sub' && (
                        <p className="text-white/50 font-black text-sm animate-pulse">스페이스바를 누르면 메인이 공개됩니다 ␣</p>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-center max-w-3xl w-full mx-auto space-y-5">
                    {tally.map(entry => (
                        <div key={entry.id} className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center font-black text-lg">
                                {entry.photo_url ? <img src={entry.photo_url} alt="" className="w-full h-full object-cover" /> : entry.entry_number}
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-sm mb-1.5">{entry.entry_number}번{entry.display_name ? ` · ${entry.display_name}` : ''}</p>
                                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                                    <div className="bg-fuchsia-500 h-full rounded-full transition-all duration-500" style={{ width: `${(entry.voteCount / maxVotes) * 100}%` }} />
                                </div>
                            </div>
                            <span className="font-black text-lg w-12 text-right">{entry.voteCount}표</span>
                        </div>
                    ))}
                    {isClosed && (
                        <button
                            onClick={startReveal}
                            className="mt-8 mx-auto px-10 py-4 rounded-[24px] bg-fuchsia-600 text-white font-black text-lg shadow-2xl shadow-fuchsia-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        >
                            🎬 결과 발표
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminClassAuditionPresent;
