import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchMocaLiveStreamById, goLive, stopLive } from '../services/mocaLiveService';
import { AdminMocaLiveControlPanel, LiveViewerCount } from './AdminMocaLive';
import { ADMIN_PASSWORD, ADMIN_AUTH_SESSION_KEY } from './AdminPage';

// /admin/moca-live-control/:id - 방송 목록 테이블 안에 접혀 들어가던 컨트롤 패널(채팅+게임+고정댓글)을
// 전체 화면으로 분리한 전용 페이지. 방송 중엔 이 화면 하나만 띄워놓고 계속 보게 된다.
// 인증은 AdminPage와 세션스토리지 플래그를 공유해서, /admin에서 로그인한 상태면 다시 묻지 않는다.
const AdminMocaLiveControlPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [authenticated, setAuthenticated] = useState(() => window.sessionStorage.getItem(ADMIN_AUTH_SESSION_KEY) === '1');
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [stream, setStream] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    const load = async () => {
        setLoading(true);
        setStream(await fetchMocaLiveStreamById(id));
        setLoading(false);
    };

    useEffect(() => {
        if (authenticated) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authenticated, id]);

    const handlePasswordSubmit = (e) => {
        e.preventDefault();
        if (passwordInput === ADMIN_PASSWORD) {
            window.sessionStorage.setItem(ADMIN_AUTH_SESSION_KEY, '1');
            setAuthenticated(true);
        } else {
            setPasswordError('비밀번호가 틀렸습니다.');
        }
    };

    const handleToggleLive = async () => {
        if (!stream) return;
        if (stream.is_live) {
            if (!window.confirm(`'${stream.title}' 라이브를 종료할까요?`)) return;
            setToggling(true);
            await stopLive(stream.id);
        } else {
            if (!window.confirm(`'${stream.title}'을(를) 지금 라이브로 전환할까요?\n다른 방송이 라이브 중이면 자동으로 종료됩니다.`)) return;
            setToggling(true);
            await goLive(stream.id);
        }
        setToggling(false);
        await load();
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
        return <div className="min-h-screen flex items-center justify-center text-[var(--moca-text-3)] text-sm font-bold">불러오는 중...</div>;
    }

    if (!stream) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-[var(--moca-text-3)] text-sm font-bold">
                <p>방송을 찾을 수 없습니다.</p>
                <Link to="/admin" className="text-[var(--moca-primary)]">← 어드민으로 돌아가기</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--moca-surface-2)] px-5 py-6 lg:px-12 lg:py-9">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div>
                    <button onClick={() => navigate('/admin')} className="text-[12px] font-bold text-[var(--moca-text-3)] hover:text-[var(--moca-primary)] mb-2">
                        ← 어드민 목록으로
                    </button>
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${stream.is_live ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                            {stream.is_live ? '🔴 라이브 중' : '대기'}
                        </span>
                        {stream.is_live && <LiveViewerCount liveId={stream.id} />}
                        <p className="text-lg font-black text-[var(--moca-text)]">{stream.title}</p>
                        <span className="text-[13px] text-[var(--moca-text-3)]">{stream.streamer_name}</span>
                    </div>
                </div>
                <button
                    onClick={handleToggleLive}
                    disabled={toggling}
                    className={`px-5 py-2.5 rounded-xl text-[13px] font-black disabled:opacity-50 ${stream.is_live ? 'bg-gray-200 text-gray-600' : 'bg-red-500 text-white'}`}
                >
                    {toggling ? '처리 중...' : stream.is_live ? '방송 종료' : '🔴 라이브 시작'}
                </button>
            </div>

            <AdminMocaLiveControlPanel
                liveId={stream.id}
                streamerName={stream.streamer_name}
                chatHeightClass="h-[calc(100vh-220px)] lg:h-[calc(100vh-190px)]"
            />
        </div>
    );
};

export default AdminMocaLiveControlPage;
