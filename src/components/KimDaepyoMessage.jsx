import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchMessagesList, fetchMessageDetail, fetchComments, postComment } from '../services/messageService';
import { getUser } from '../services/userService';

const KimDaepyoMessage = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const user = getUser();
    const myNickname = user?.nickname || user?.name || '익명모카';

    useEffect(() => {
        const loadMessages = async () => {
            setIsLoading(true);
            const data = await fetchMessagesList();
            setMessages(data || []);
            setIsLoading(false);
        };
        loadMessages();
    }, []);

    const handleSelectMessage = async (id) => {
        setIsLoading(true);
        const detail = await fetchMessageDetail(id);
        if (detail) {
            setSelectedMessage(detail);
            const commentsData = await fetchComments(id);
            setComments(commentsData || []);
        }
        setIsLoading(false);
    };

    const handleBackToList = () => {
        setSelectedMessage(null);
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting || !selectedMessage) return;

        setIsSubmitting(true);
        try {
            await postComment(selectedMessage.id, myNickname, newComment.trim());
            setNewComment('');
            const commentsData = await fetchComments(selectedMessage.id);
            setComments(commentsData || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
    };

    // ── 상세 뷰 ──────────────────────────────────────────────────────────────
    if (selectedMessage) {
        return (
            <div className="flex flex-col h-full overflow-hidden" style={{ backgroundColor: 'var(--moca-bg)' }}>
                {/* 헤더 */}
                <header className="flex-none flex items-center justify-between px-4 py-4 z-20 bg-white/90 backdrop-blur-md border-b border-[#E8E0FA] sticky top-0 shadow-sm">
                    <button
                        onClick={handleBackToList}
                        className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center border border-[#E8E0FA] hover:bg-[#EDE8FF] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px] text-[#9333EA]">arrow_back</span>
                    </button>
                    <h1 className="text-[#1F1235] font-black text-base tracking-tight">공지 상세</h1>
                    <div className="w-10" />
                </header>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto px-5 py-6 hide-scrollbar flex flex-col pb-24">
                    {/* 뱃지 + 날짜 */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] font-black text-[#9333EA] bg-[#F3E8FF] px-2.5 py-1 rounded-full border border-[#E8E0FA] uppercase tracking-wider">공지</span>
                        <span className="text-xs text-[#9CA3AF] font-medium">{formatDate(selectedMessage.created_at)}</span>
                    </div>

                    <h2 className="text-[#1F1235] text-2xl font-black mb-5 leading-snug break-words">
                        {selectedMessage.title}
                    </h2>

                    {selectedMessage.image_url && (
                        <div className="mb-6 rounded-2xl overflow-hidden shadow-md border border-[#E8E0FA]">
                            <img src={selectedMessage.image_url} alt="본문 이미지" className="w-full h-auto object-cover" />
                        </div>
                    )}

                    <div className="text-[#5B4E7A] text-[15px] leading-loose whitespace-pre-wrap break-words mb-8 pb-6 border-b border-[#E8E0FA]">
                        {selectedMessage.content}
                    </div>

                    {selectedMessage.link_url && (
                        <div className="mb-8 pb-6 border-b border-[#E8E0FA]">
                            <a
                                href={selectedMessage.link_url.startsWith('http') ? selectedMessage.link_url : `https://${selectedMessage.link_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-white font-bold text-sm shadow-lg shadow-[#9333EA]/25 hover:opacity-90 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-[18px]">link</span>
                                관련 페이지로 이동하기
                            </a>
                        </div>
                    )}

                    {/* 댓글 섹션 */}
                    <div>
                        <h3 className="text-sm font-black text-[#1F1235] mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-[#9333EA]">chat</span>
                            댓글 {comments.length}
                        </h3>

                        <div className="space-y-3 mb-6">
                            {comments.map(c => (
                                <div key={c.id} className="bg-white rounded-2xl p-4 border border-[#E8E0FA] shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-black text-sm text-[#7C3AED]">{c.user_nickname}</span>
                                        <span className="text-[10px] text-[#9CA3AF]">{formatDate(c.created_at)}</span>
                                    </div>
                                    <p className="text-[14px] text-[#5B4E7A] leading-relaxed border-t border-[#E8E0FA] pt-2 mt-1">{c.comment}</p>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <div className="text-center py-8">
                                    <span className="material-symbols-outlined text-[32px] text-[#C084FC]/40 mb-2 block">chat_bubble</span>
                                    <p className="text-[#9CA3AF] text-sm">첫 댓글을 남겨보세요!</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 댓글 입력 */}
                <div className="flex-none p-4 pb-6 bg-white/95 backdrop-blur-xl border-t border-[#E8E0FA] sticky bottom-0">
                    <form
                        onSubmit={handlePostComment}
                        className="flex flex-row items-center bg-[#F8F5FF] border border-[#E8E0FA] rounded-full h-[52px] pr-2 shadow-inner group focus-within:border-[#9333EA]/30 transition-all"
                    >
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="댓글을 남겨주세요..."
                            className="flex-1 bg-transparent border-none outline-none text-[14px] px-5 text-[#1F1235] placeholder-[#9CA3AF] h-full w-full min-w-0 font-medium"
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isSubmitting}
                            className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-[#9333EA] to-[#C084FC] flex items-center justify-center shrink-0 disabled:opacity-40 transition-all ml-2 shadow-md shadow-[#9333EA]/20 active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[18px] text-white">edit</span>
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ── 목록 뷰 ──────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col min-h-screen" style={{ backgroundColor: 'var(--moca-bg)' }}>

            {/* 상단 헤더 배너 */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#EDE8FF] via-[#F3F0FF] to-[#E8F0FF] border-b border-[#E8E0FA] px-5 pt-14 pb-5">
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-[#9333EA]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#C084FC]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-[22px] text-[#9333EA]">campaign</span>
                            <h1 className="text-xl font-black text-[#1F1235] tracking-tight">공지사항</h1>
                        </div>
                        <p className="text-xs text-[#9CA3AF] font-medium pl-7">아임모델 대표님의 최신 소식</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-[#9333EA] to-[#C084FC] rounded-2xl flex items-center justify-center shadow-lg shadow-[#9333EA]/25">
                        <span className="material-symbols-outlined text-white text-[22px]">local_police</span>
                    </div>
                </div>
            </div>

            {/* 공지 목록 */}
            <div className="flex-1 px-4 pt-5 pb-8">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl border border-[#E8E0FA] h-20 animate-pulse shadow-sm" />
                        ))}
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-[#F3E8FF] rounded-full flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-[#C084FC] text-[32px]">inbox</span>
                        </div>
                        <p className="text-[#5B4E7A] font-bold text-sm">등록된 공지사항이 없습니다.</p>
                        <p className="text-[#9CA3AF] text-xs mt-1">새로운 소식이 곧 올라올 예정이에요!</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                onClick={() => handleSelectMessage(msg.id)}
                                className="group bg-white rounded-2xl p-4 border border-[#E8E0FA] hover:border-[#9333EA]/30 hover:shadow-md hover:shadow-[#9333EA]/8 cursor-pointer transition-all duration-200 shadow-sm"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-black text-[#9333EA] bg-[#F3E8FF] px-2 py-0.5 rounded-full border border-[#E8E0FA] uppercase tracking-wider">공지</span>
                                            <span className="text-xs text-[#9CA3AF]">{formatDate(msg.created_at)}</span>
                                        </div>
                                        <h3 className="text-[15px] font-black text-[#1F1235] group-hover:text-[#7C3AED] transition-colors leading-snug line-clamp-2 pr-2">
                                            {msg.title}
                                        </h3>
                                    </div>

                                    {msg.image_url ? (
                                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#E8E0FA] shrink-0 bg-[#F8F5FF]">
                                            <img src={msg.image_url} alt="썸네일" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-[#F3E8FF] border border-[#E8E0FA] flex items-center justify-center shrink-0 self-center group-hover:bg-[#EDE8FF] transition-colors">
                                            <span className="material-symbols-outlined text-[#9333EA] text-[18px]">chevron_right</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KimDaepyoMessage;
