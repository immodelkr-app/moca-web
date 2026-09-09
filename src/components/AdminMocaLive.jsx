import React, { useEffect, useState } from 'react';
import {
    fetchAllMocaLiveStreams, createMocaLiveStream, updateMocaLiveStream,
    deleteMocaLiveStream, goLive, stopLive, extractYoutubeVideoId,
} from '../services/mocaLiveService';
import { sendBroadcastPush } from '../services/pushNotificationService';

const EMPTY_FORM = {
    title: '',
    youtubeInput: '',
    streamerName: '김대표',
    coverImageUrl: '',
};

const PushResultBadge = ({ result }) => {
    if (!result) return null;
    if (!result.success) {
        return <p className="text-[11px] font-bold text-red-500 mt-1.5">발송 실패: {result.error}</p>;
    }
    return (
        <p className="text-[11px] font-bold text-emerald-600 mt-1.5">
            발송 완료 · 성공 {result.successCount}건 / 실패 {result.failCount}건
        </p>
    );
};

const AdminMocaLive = () => {
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('list');
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [pushResult, setPushResult] = useState(null);
    const [sendingPush, setSendingPush] = useState(false);

    const load = async () => {
        setLoading(true);
        const data = await fetchAllMocaLiveStreams();
        setStreams(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const flashMsg = (text) => {
        setMsg(text);
        setTimeout(() => setMsg(''), 3000);
    };

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setError('');
        setActiveTab('create');
    };

    const openEdit = (stream) => {
        setEditingId(stream.id);
        setForm({
            title: stream.title,
            youtubeInput: stream.youtube_video_id,
            streamerName: stream.streamer_name,
            coverImageUrl: stream.cover_image_url || '',
        });
        setError('');
        setActiveTab('create');
    };

    const handleSave = async () => {
        setError('');
        if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
        const videoId = extractYoutubeVideoId(form.youtubeInput);
        if (!videoId) { setError('유튜브 링크 또는 videoId 형식이 올바르지 않습니다.'); return; }

        setSaving(true);
        const payload = {
            title: form.title.trim(),
            youtubeVideoId: videoId,
            streamerName: form.streamerName.trim() || '김대표',
            coverImageUrl: form.coverImageUrl.trim(),
        };
        const { error: saveError } = editingId
            ? await updateMocaLiveStream(editingId, payload)
            : await createMocaLiveStream(payload);
        setSaving(false);

        if (saveError) {
            setError('저장 중 오류가 발생했습니다: ' + (saveError.message || ''));
            return;
        }

        flashMsg(editingId ? '수정되었습니다.' : '등록되었습니다.');
        setActiveTab('list');
        await load();
    };

    const handleGoLive = async (stream) => {
        if (!window.confirm(`'${stream.title}'을(를) 지금 라이브로 전환할까요?\n다른 방송이 라이브 중이면 자동으로 종료됩니다.`)) return;
        const { error: liveError } = await goLive(stream.id);
        if (liveError) {
            flashMsg('라이브 전환 중 오류가 발생했습니다: ' + (liveError.message || ''));
            return;
        }
        flashMsg('🔴 라이브가 시작되었습니다.');
        await load();
    };

    const handleStop = async (stream) => {
        if (!window.confirm(`'${stream.title}' 라이브를 종료할까요?`)) return;
        const { error: stopError } = await stopLive(stream.id);
        if (stopError) {
            flashMsg('종료 중 오류가 발생했습니다: ' + (stopError.message || ''));
            return;
        }
        flashMsg('라이브가 종료되었습니다.');
        await load();
    };

    const handleDelete = async (stream) => {
        if (!window.confirm(`'${stream.title}'을(를) 삭제하시겠습니까?`)) return;
        const { error: deleteError } = await deleteMocaLiveStream(stream.id);
        if (deleteError) {
            flashMsg('삭제 중 오류가 발생했습니다: ' + (deleteError.message || ''));
            return;
        }
        flashMsg('삭제되었습니다.');
        await load();
    };

    const handleSendLivePush = async (stream) => {
        setSendingPush(true);
        const result = await sendBroadcastPush({
            title: '🔴 모카TV 라이브 방송 중!',
            body: stream.title,
            route: '/home/dashboard',
        });
        setPushResult(result);
        setSendingPush(false);
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex gap-1 p-1 mb-4 rounded-2xl bg-[var(--moca-surface-2)] border border-[var(--moca-border)]">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-black transition-colors ${activeTab === 'list' ? 'bg-white text-[var(--moca-primary)] shadow-sm' : 'text-[var(--moca-text-3)]'}`}
                >
                    전체 방송 {streams.length}건
                </button>
                <button
                    onClick={openCreate}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-black transition-colors ${activeTab === 'create' ? 'bg-white text-[var(--moca-primary)] shadow-sm' : 'text-[var(--moca-text-3)]'}`}
                >
                    🔴 새 라이브 등록
                </button>
            </div>

            {msg && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold">
                    {msg}
                </div>
            )}

            {activeTab === 'create' && (
                <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-5 mb-6">
                    <p className="text-sm font-black text-[var(--moca-text)] mb-4">
                        {editingId ? '✏️ 라이브 방송 수정' : '🔴 새 라이브 방송 등록'}
                    </p>

                    <div className="space-y-3">
                        <div>
                            <label className="text-[11px] font-bold text-[var(--moca-text-3)]">제목 *</label>
                            <input
                                value={form.title}
                                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                                placeholder="예: 김대표와 함께하는 오디션 합격 Q&A"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-[var(--moca-text-3)]">유튜브 라이브 링크 (미등록/비공개 권장) *</label>
                            <input
                                value={form.youtubeInput}
                                onChange={(e) => setForm((f) => ({ ...f, youtubeInput: e.target.value }))}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                                placeholder="예: https://www.youtube.com/watch?v=xxxxxxxxxxx"
                            />
                            <p className="text-[10px] text-[var(--moca-text-3)] mt-1">유튜브 스튜디오에서 라이브를 "미등록(링크 공개)"으로 켠 뒤 그 링크를 붙여넣으세요. 검색엔 노출되지 않고 모카 앱을 통해서만 시청됩니다.</p>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-[var(--moca-text-3)]">진행자명</label>
                            <input
                                value={form.streamerName}
                                onChange={(e) => setForm((f) => ({ ...f, streamerName: e.target.value }))}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                                placeholder="예: 김대표"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-[var(--moca-text-3)]">커버 이미지 URL (선택, 비우면 유튜브 썸네일 사용)</label>
                            <input
                                value={form.coverImageUrl}
                                onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
                                className="w-full mt-1 px-3 py-2 rounded-xl border border-[var(--moca-border)] text-sm"
                                placeholder="https://..."
                            />
                        </div>

                        {error && <p className="text-[12px] font-bold text-red-500">{error}</p>}

                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 py-2.5 rounded-xl bg-[var(--moca-primary)] text-white font-black text-[13px] disabled:opacity-50"
                            >
                                {saving ? '저장 중...' : editingId ? '수정 저장' : '등록'}
                            </button>
                            <button
                                onClick={() => setActiveTab('list')}
                                className="px-4 py-2.5 rounded-xl border border-[var(--moca-border)] text-[var(--moca-text-3)] font-black text-[13px]"
                            >
                                취소
                            </button>
                        </div>
                        <p className="text-[10px] text-[var(--moca-text-3)]">등록만으로는 앱에 노출되지 않습니다. 목록에서 "🔴 라이브 시작"을 눌러야 실제로 대시보드에 노출됩니다.</p>
                    </div>
                </div>
            )}

            {activeTab === 'list' && (
                <>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-black text-[var(--moca-text)]">전체 방송 <span className="text-[var(--moca-primary)]">{streams.length}</span>건</p>
                        <button onClick={load} className="text-xs font-bold text-[var(--moca-text-3)] hover:text-[var(--moca-primary)]">새로고침</button>
                    </div>

                    {loading ? (
                        <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">불러오는 중...</p>
                    ) : streams.length === 0 ? (
                        <p className="text-sm text-[var(--moca-text-3)] font-bold py-10 text-center">등록된 라이브 방송이 없습니다.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[11px] text-[var(--moca-text-3)] font-bold border-b border-[var(--moca-border)]">
                                        <th className="py-2 pr-3">상태</th>
                                        <th className="py-2 pr-3">제목</th>
                                        <th className="py-2 pr-3">진행자</th>
                                        <th className="py-2 pr-3">등록일</th>
                                        <th className="py-2 pr-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {streams.map((s) => (
                                        <tr key={s.id} className="border-b border-[var(--moca-border)] last:border-0">
                                            <td className="py-2.5 pr-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${s.is_live ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {s.is_live ? '🔴 라이브 중' : '대기'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 pr-3 font-bold text-[var(--moca-text)] max-w-[240px] truncate">{s.title}</td>
                                            <td className="py-2.5 pr-3 text-[var(--moca-text-3)]">{s.streamer_name}</td>
                                            <td className="py-2.5 pr-3 text-[10px] text-[var(--moca-text-3)]">{new Date(s.created_at).toLocaleDateString('ko-KR')}</td>
                                            <td className="py-2.5 pr-3">
                                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                                    {s.is_live ? (
                                                        <button onClick={() => handleStop(s)} className="text-[11px] font-black text-red-500 hover:underline">종료</button>
                                                    ) : (
                                                        <button onClick={() => handleGoLive(s)} className="text-[11px] font-black text-red-500 hover:underline">🔴 라이브 시작</button>
                                                    )}
                                                    {s.is_live && (
                                                        <button
                                                            onClick={() => handleSendLivePush(s)}
                                                            disabled={sendingPush}
                                                            className="text-[11px] font-black text-fuchsia-600 hover:underline disabled:opacity-40"
                                                        >
                                                            {sendingPush ? '발송 중...' : '🔔 알림'}
                                                        </button>
                                                    )}
                                                    <button onClick={() => openEdit(s)} className="text-[11px] font-black text-[var(--moca-text-3)] hover:text-[var(--moca-primary)]">✏️ 수정</button>
                                                    <button onClick={() => handleDelete(s)} className="text-[11px] font-black text-[var(--moca-text-3)] hover:text-red-500">삭제</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <PushResultBadge result={pushResult} />
                </>
            )}
        </div>
    );
};

export default AdminMocaLive;
