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

    // Load initial list
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

    // --- Detail View ---
    if (selectedMessage) {
        return (
            <div className="flex flex-col h-full bg-[#0A0A0F] text-white overflow-hidden relative pb-20 lg:pb-0">
                {/* Header */}
                <header className="flex-none flex items-center justify-between px-4 py-4 z-20 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-white/5 sticky top-0">
                    <button
                        onClick={handleBackToList}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px] text-white/80">arrow_back</span>
                    </button>
                    <h1 className="text-xl font-bold tracking-wide">아임모카 공지</h1>
                    <div className="w-10"></div> {/* Spacer */}
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-6 hide-scrollbar flex flex-col">
                    <h2 className="text-2xl font-black mb-3 text-white leading-snug break-words">
                        {selectedMessage.title}
                    </h2>
                    <span className="text-white/40 text-xs mb-6 block font-medium">
                        {formatDate(selectedMessage.created_at)}
                    </span>

                    {selectedMessage.image_url && (
                        <div className="mb-6 rounded-xl overflow-hidden shadow-lg border border-white/5">
                            <img src={selectedMessage.image_url} alt="본문 이미지" className="w-full h-auto object-cover" />
                        </div>
                    )}

                    <div className="text-white/80 text-[15px] leading-loose whitespace-pre-wrap break-words mb-10 pb-4 border-b border-white/5">
                        {selectedMessage.content}
                    </div>

                    {selectedMessage.link_url && (
                        <div className="mb-10 pb-4 border-b border-white/5">
                            <a
                                href={selectedMessage.link_url.startsWith('http') ? selectedMessage.link_url : `https://${selectedMessage.link_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-[18px]">link</span>
                                관련 페이지로 이동하기
                            </a>
                        </div>
                    )}

                    {/* Comments Section */}
                    <div>
                        <h3 className="text-sm font-bold text-white/60 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">chat</span>
                            댓글 {comments.length}
                        </h3>

                        <div className="space-y-4 mb-6">
                            {comments.map(c => (
                                <div key={c.id} className="bg-[#15151A] rounded-2xl p-4 border border-white/5">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-sm text-[#C4B5FD]">{c.user_nickname}</span>
                                        <span className="text-[10px] text-white/30">{formatDate(c.created_at)}</span>
                                    </div>
                                    <p className="text-[14px] text-white/80 leading-relaxed border-t border-white/5 pt-2 mt-2">{c.comment}</p>
                                </div>
                            ))}
                            {comments.length === 0 && (
                                <p className="text-white/30 text-sm text-center py-6">첫 댓글을 남겨보세요!</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Comment Input */}
                <div className="flex-none p-4 pb-6 bg-[#0A0A0F]/95 backdrop-blur-xl border-t border-white/5 mt-auto sticky bottom-0">
                    <form
                        onSubmit={handlePostComment}
                        className="flex flex-row items-center bg-[#1C1C24] border border-white/10 rounded-full h-[52px] pr-2 shadow-inner"
                    >
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="댓글을 남겨주세요..."
                            className="flex-1 bg-transparent border-none outline-none text-[14px] px-5 text-white placeholder-white/30 h-full w-full min-w-0"
                        />
                        <button
                            type="submit"
                            disabled={!newComment.trim() || isSubmitting}
                            className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-[#907FF8] to-[#7B61FF] flex items-center justify-center shrink-0 disabled:opacity-50 transition-all ml-2"
                        >
                            <span className="material-symbols-outlined text-[18px] text-white">edit</span>
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- List View ---
    return (
        <div className="flex flex-col h-full bg-[#0A0A0F] text-white overflow-hidden pb-20 lg:pb-0">
            {/* Header */}
            <header className="flex-none flex items-center justify-between px-4 py-4 z-20 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-white/5 sticky top-0">
                <button
                    onClick={() => navigate('/home')}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px] text-white/80">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold tracking-wide">아임모카 공지</h1>
                <div className="w-10"></div> {/* Spacer */}
            </header>

            {/* Banner/Title Area */}
            <div className="px-5 pt-6 pb-4 border-b border-white/5 bg-gradient-to-b from-[#1C1C24] to-transparent">
                <div className="w-12 h-12 bg-gradient-to-tr from-[#907FF8] to-[#C4B5FD] rounded-full flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(144,127,248,0.3)]">
                    <span className="material-symbols-outlined text-white text-[24px]">local_police</span>
                </div>
                <h2 className="text-xl font-black tracking-tight text-white mb-1">MOCA 특별 공지게시판</h2>
                <p className="text-sm text-white/50">아임모델 대표님이 전하는 최신 정보와 팁</p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-4">
                {isLoading ? (
                    <div className="flex justify-center items-center py-20 text-white/20">로딩 중...</div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-white/20">
                        <span className="material-symbols-outlined text-[48px] mb-2">inbox</span>
                        <p className="text-sm">등록된 메세지가 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                onClick={() => handleSelectMessage(msg.id)}
                                className="group relative bg-[#15151A] rounded-2xl p-5 border border-white/5 hover:border-[#6C63FF]/50 hover:bg-[#1A1A22] cursor-pointer transition-all duration-300 shadow-sm hover:shadow-[0_0_15px_rgba(108,99,255,0.1)]"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            {/* 'New' badge logic could be added here */}
                                            <span className="text-[10px] font-bold text-[#A78BFA] bg-[#A78BFA]/10 px-2 py-0.5 rounded uppercase tracking-wider">공지</span>
                                            <span className="text-xs text-white/30 font-medium">{formatDate(msg.created_at)}</span>
                                        </div>
                                        <h3 className="text-[15px] font-bold text-white group-hover:text-[#E0E7FF] transition-colors leading-snug line-clamp-2 pr-2">
                                            {msg.title}
                                        </h3>
                                    </div>

                                    {/* Thumbnail if image exists */}
                                    {msg.image_url ? (
                                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-white/5">
                                            <img src={msg.image_url} alt="썸네일" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 self-center group-hover:bg-[#6C63FF]/10 transition-colors">
                                            <span className="material-symbols-outlined text-white/30 text-[18px] group-hover:text-[#6C63FF]">chevron_right</span>
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
