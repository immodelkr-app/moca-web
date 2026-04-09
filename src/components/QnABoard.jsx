import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';
import {
    fetchQnaPosts, fetchQnaPost, createQnaPost, deleteQnaPost,
    QNA_CATEGORIES, getCategoryInfo
} from '../services/qnaService';

/* ─── 날짜 포맷 ─────────────────────────────────────────────── */
const formatDate = (str) => {
    if (!str) return '';
    const d = new Date(str);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

/* ─── 작성 모달 ─────────────────────────────────────────────── */
const WriteModal = ({ onClose, onSuccess, user }) => {
    const [form, setForm] = useState({ category: 'app', title: '', content: '', is_locked: false });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
        if (!form.content.trim()) { setError('내용을 입력해주세요.'); return; }
        setSubmitting(true);
        setError('');
        const { error: err } = await createQnaPost({
            user_id: user?.id || user?.nickname || '',
            user_name: user?.name || user?.nickname || '익명',
            ...form,
        });
        setSubmitting(false);
        if (err) { setError('등록 중 오류가 발생했습니다.'); return; }
        onSuccess();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
            <div className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="p-6 pb-4 border-b border-[#E8E0FA] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#F3E8FF] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[20px] text-[#9333EA]">edit_note</span>
                        </div>
                        <h2 className="text-lg font-black text-[#1F1235]">질문 남기기</h2>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F8F5FF] border border-[#E8E0FA] flex items-center justify-center text-[#9CA3AF] hover:text-[#1F1235] transition-all">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* 카테고리 */}
                    <div>
                        <label className="text-[#5B4E7A] text-[11px] font-bold ml-1 block mb-2">카테고리 선택</label>
                        <div className="flex gap-2 flex-wrap">
                            {QNA_CATEGORIES.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => setForm(p => ({ ...p, category: cat.value }))}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all ${form.category === cat.value
                                        ? 'border-[#9333EA] bg-[#F3E8FF] text-[#9333EA]'
                                        : 'border-[#E8E0FA] bg-[#F8F5FF] text-[#5B4E7A] hover:border-[#9333EA]/30'
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 제목 */}
                    <div>
                        <label className="text-[#5B4E7A] text-[11px] font-bold ml-1 block mb-1.5">제목 <span className="text-[#9333EA]">*</span></label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            maxLength={50}
                            placeholder="제목을 입력해주세요"
                            className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-xl px-4 py-3 text-[#1F1235] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-colors"
                        />
                        <p className="text-right text-[10px] text-[#9CA3AF] mt-1">{form.title.length}/50</p>
                    </div>

                    {/* 내용 */}
                    <div>
                        <label className="text-[#5B4E7A] text-[11px] font-bold ml-1 block mb-1.5">내용 <span className="text-[#9333EA]">*</span></label>
                        <textarea
                            value={form.content}
                            onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                            maxLength={500}
                            rows={5}
                            placeholder="궁금한 내용을 자세히 적어주세요."
                            className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-xl px-4 py-3 text-[#1F1235] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-colors resize-none leading-relaxed"
                        />
                        <p className="text-right text-[10px] text-[#9CA3AF] mt-1">{form.content.length}/500</p>
                    </div>

                    {/* 잠금 토글 */}
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA]">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-[#9CA3AF]">{form.is_locked ? 'lock' : 'lock_open'}</span>
                            <div>
                                <p className="text-sm font-bold text-[#1F1235]">비공개 게시글</p>
                                <p className="text-[10px] text-[#9CA3AF]">나와 관리자만 볼 수 있어요</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setForm(p => ({ ...p, is_locked: !p.is_locked }))}
                            className={`w-12 h-6 rounded-full transition-all relative ${form.is_locked ? 'bg-[#9333EA]' : 'bg-[#E8E0FA]'}`}
                        >
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${form.is_locked ? 'left-[26px]' : 'left-0.5'}`} />
                        </button>
                    </div>

                    {/* 에러 */}
                    {error && (
                        <p className="text-red-500 text-sm font-bold text-center">{error}</p>
                    )}

                    {/* 제출 */}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-white font-black text-base shadow-lg shadow-[#9333EA]/20 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {submitting ? '등록 중...' : '질문 등록하기'}
                    </button>
                </form>
            </div>
        </div>
    );
};

/* ─── 상세 모달 ─────────────────────────────────────────────── */
const DetailModal = ({ postId, currentUserId, onClose, onDelete }) => {
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQnaPost(postId).then(data => {
            setPost(data);
            setLoading(false);
        });
    }, [postId]);

    if (loading) return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full border-2 border-[#9333EA] border-t-transparent animate-spin" />
        </div>
    );

    if (!post) return null;

    const cat = getCategoryInfo(post.category);
    const isOwner = post.user_id === currentUserId;
    const isLocked = post.is_locked && !isOwner;

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={onClose}>
            <div className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="p-6 pb-4 border-b border-[#E8E0FA] flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-lg text-[10px] font-black" style={{ backgroundColor: cat.bg, color: cat.color }}>
                            {cat.label}
                        </span>
                        {post.is_locked && <span className="material-symbols-outlined text-[14px] text-[#9CA3AF]">lock</span>}
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-[#F8F5FF] border border-[#E8E0FA] flex items-center justify-center text-[#9CA3AF] hover:text-[#1F1235] transition-all">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {isLocked ? (
                        <div className="flex flex-col items-center py-12 gap-3 text-[#9CA3AF]">
                            <span className="material-symbols-outlined text-[48px]">lock</span>
                            <p className="font-bold text-sm">비공개 게시글입니다</p>
                            <p className="text-xs">작성자와 관리자만 열람할 수 있습니다.</p>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-black text-[#1F1235] leading-snug">{post.title}</h2>
                            <div className="flex items-center gap-2 text-[11px] text-[#9CA3AF] font-bold">
                                <span>{post.user_name}</span>
                                <span>·</span>
                                <span>{formatDate(post.created_at)}</span>
                            </div>
                            <div className="h-px bg-[#E8E0FA]" />
                            <p className="text-[#5B4E7A] text-sm leading-relaxed whitespace-pre-wrap font-medium">{post.content}</p>

                            {/* 관리자 답변 */}
                            {post.admin_reply && (
                                <div className="bg-[#F3E8FF] border border-[#9333EA]/20 rounded-2xl p-5 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-xl bg-[#9333EA] flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[14px] text-white">support_agent</span>
                                        </div>
                                        <span className="text-[#7C3AED] font-black text-sm">관리자 답변</span>
                                        {post.replied_at && <span className="text-[10px] text-[#9CA3AF] ml-auto">{formatDate(post.replied_at)}</span>}
                                    </div>
                                    <p className="text-[#5B4E7A] text-sm leading-relaxed whitespace-pre-wrap pl-9">{post.admin_reply}</p>
                                </div>
                            )}

                            {!post.admin_reply && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px] text-amber-500">schedule</span>
                                    <p className="text-amber-700 text-xs font-bold">답변 대기 중입니다. 영업일 기준 1~2일 내 답변드립니다.</p>
                                </div>
                            )}

                            {/* 삭제 버튼 (본인만) */}
                            {isOwner && (
                                <button
                                    onClick={() => { onDelete(post.id); onClose(); }}
                                    className="w-full py-3 rounded-2xl bg-red-50 border border-red-200 text-red-500 text-sm font-bold hover:bg-red-100 transition-colors"
                                >
                                    게시글 삭제
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─── 메인 Q&A 게시판 페이지 ────────────────────────────────── */
const QnABoard = () => {
    const navigate = useNavigate();
    const user = getUser();
    const currentUserId = user?.id || user?.nickname || '';

    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showWrite, setShowWrite] = useState(false);
    const [selectedPostId, setSelectedPostId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        const data = await fetchQnaPosts(selectedCategory);
        setPosts(data);
        setLoading(false);
    }, [selectedCategory]);

    useEffect(() => { load(); }, [load]);

    const handleDelete = async (id) => {
        if (!window.confirm('게시글을 삭제하시겠습니까?')) return;
        await deleteQnaPost(id);
        load();
    };

    return (
        <div className="min-h-screen pb-32" style={{ backgroundColor: 'var(--moca-bg)' }}>

            {/* 헤더 */}
            <div className="relative z-10 px-5 pt-14 pb-4 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-[#F3E8FF] border border-[#E8E0FA] flex items-center justify-center hover:bg-[#EDE8FF] transition-colors flex-shrink-0"
                >
                    <span className="material-symbols-outlined text-[20px] text-[#7C3AED]">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-xl font-black tracking-tight text-[#1F1235]">Q&A 게시판</h1>
                    <p className="text-[#9CA3AF] text-xs mt-0.5">궁금한 점을 남겨주세요. 빠르게 답변드릴게요!</p>
                </div>
            </div>

            <div className="px-5 space-y-4">

                {/* 카테고리 필터 탭 */}
                <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition-all ${selectedCategory === null
                            ? 'bg-[#9333EA] text-white border-[#9333EA] shadow-sm'
                            : 'bg-white text-[#5B4E7A] border-[#E8E0FA] hover:border-[#9333EA]/30'
                            }`}
                    >
                        전체
                    </button>
                    {QNA_CATEGORIES.map(cat => (
                        <button
                            key={cat.value}
                            onClick={() => setSelectedCategory(cat.value)}
                            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold border transition-all ${selectedCategory === cat.value
                                ? 'text-white border-transparent shadow-sm'
                                : 'bg-white text-[#5B4E7A] border-[#E8E0FA] hover:border-[#9333EA]/30'
                                }`}
                            style={selectedCategory === cat.value ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
                        >
                            <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* 게시글 목록 */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 rounded-full border-2 border-[#9333EA] border-t-transparent animate-spin" />
                    </div>
                ) : posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-[#9CA3AF]">
                        <div className="w-20 h-20 rounded-full bg-[#F3E8FF] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[40px] text-[#9333EA]/30">forum</span>
                        </div>
                        <p className="font-bold text-sm">아직 등록된 질문이 없어요</p>
                        <p className="text-xs">첫 번째 질문을 남겨보세요!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {posts.map(post => {
                            const cat = getCategoryInfo(post.category);
                            const isOwner = post.user_id === currentUserId;
                            const isHidden = post.is_locked && !isOwner;
                            return (
                                <button
                                    key={post.id}
                                    onClick={() => setSelectedPostId(post.id)}
                                    className="w-full text-left bg-white border border-[#E8E0FA] rounded-2xl p-4 hover:border-[#9333EA]/30 hover:shadow-sm transition-all active:scale-[0.99]"
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cat.bg }}>
                                            <span className="material-symbols-outlined text-[18px]" style={{ color: cat.color }}>{cat.icon}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: cat.bg, color: cat.color }}>
                                                    {cat.label}
                                                </span>
                                                {post.is_locked && (
                                                    <span className="material-symbols-outlined text-[13px] text-[#9CA3AF]">lock</span>
                                                )}
                                                {post.admin_reply ? (
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#9333EA] text-white ml-auto">답변완료</span>
                                                ) : (
                                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 ml-auto">답변대기</span>
                                                )}
                                            </div>
                                            <p className="text-[#1F1235] font-black text-sm truncate">
                                                {isHidden ? '🔒 비공개 게시글입니다' : post.title}
                                            </p>
                                            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#9CA3AF] font-bold">
                                                <span>{isHidden ? '***' : post.user_name}</span>
                                                <span>·</span>
                                                <span>{formatDate(post.created_at)}</span>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-[18px] text-[#9CA3AF] flex-shrink-0 mt-1">chevron_right</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* FAB 버튼 */}
            <button
                onClick={() => setShowWrite(true)}
                className="fixed bottom-28 right-5 w-14 h-14 bg-gradient-to-br from-[#9333EA] to-[#7C3AED] text-white rounded-full flex items-center justify-center shadow-2xl shadow-[#9333EA]/40 hover:scale-110 active:scale-95 transition-all z-40 border-2 border-white/20"
            >
                <span className="material-symbols-outlined text-[26px]">edit</span>
            </button>

            {/* 작성 모달 */}
            {showWrite && (
                <WriteModal
                    user={user}
                    onClose={() => setShowWrite(false)}
                    onSuccess={() => { setShowWrite(false); load(); }}
                />
            )}

            {/* 상세 모달 */}
            {selectedPostId && (
                <DetailModal
                    postId={selectedPostId}
                    currentUserId={currentUserId}
                    onClose={() => setSelectedPostId(null)}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
};

export default QnABoard;
