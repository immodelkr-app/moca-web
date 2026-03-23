import React, { useState, useCallback } from 'react';
import { toggleLike, fetchComments, addComment, deleteComment } from '../services/certificationService';

const ACTIVITY_CONFIG = {
    '에이전시투어': { color: 'from-[#6C63FF] to-[#A78BFA]', bg: 'bg-[#6C63FF]/15', text: 'text-[#A78BFA]', border: 'border-[#6C63FF]/30', icon: 'apartment' },
    '광고모델수업': { color: 'from-[#14B8A6] to-[#2DD4BF]', bg: 'bg-[#14B8A6]/15', text: 'text-[#2DD4BF]', border: 'border-[#14B8A6]/30', icon: 'school' },
    'BIC시즌이벤트': { color: 'from-[#F59E0B] to-[#FCD34D]', bg: 'bg-[#F59E0B]/15', text: 'text-[#FCD34D]', border: 'border-[#F59E0B]/30', icon: 'local_fire_department' },
};

const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
};

const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const CertificationPostCard = ({ post, myNickname, likedPostIds, onLikeChange, onDelete }) => {
    const [liked, setLiked] = useState(likedPostIds.includes(post.id));
    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentInput, setCommentInput] = useState('');
    const [isLoadingComments, setIsLoadingComments] = useState(false);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    const cfg = ACTIVITY_CONFIG[post.activity_type] || ACTIVITY_CONFIG['에이전시투어'];

    const handleLike = useCallback(async () => {
        const newLiked = !liked;
        const newCount = newLiked ? likesCount + 1 : Math.max(0, likesCount - 1);
        setLiked(newLiked);
        setLikesCount(newCount);

        const result = await toggleLike(post.id, myNickname);
        if (result) {
            setLikesCount(result.newCount);
            setLiked(result.liked);
            onLikeChange?.(post.id, result.liked);
        }
    }, [liked, likesCount, post.id, myNickname, onLikeChange]);

    const handleToggleComments = async () => {
        const next = !showComments;
        setShowComments(next);
        if (next && comments.length === 0) {
            setIsLoadingComments(true);
            const data = await fetchComments(post.id);
            setComments(data);
            setIsLoadingComments(false);
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!commentInput.trim() || isSubmittingComment) return;
        setIsSubmittingComment(true);
        const newComment = await addComment(post.id, myNickname, commentInput.trim());
        setComments(prev => [...prev, newComment]);
        setCommentInput('');
        setIsSubmittingComment(false);
    };

    const handleDeleteComment = async (commentId) => {
        await deleteComment(commentId);
        setComments(prev => prev.filter(c => c.id !== commentId));
    };

    const isMyPost = post.user_nickname === myNickname;

    return (
        <div className="bg-white/[0.03] border border-white/8 rounded-3xl overflow-hidden">
            {/* Post Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${cfg.color} flex items-center justify-center shadow-md flex-shrink-0`}>
                        <span className="text-white font-black text-sm">
                            {post.user_nickname?.charAt(0) || '?'}
                        </span>
                    </div>
                    <div>
                        <p className="text-white font-bold text-[13px] leading-tight">{post.user_nickname}</p>
                        <p className="text-white/35 text-[11px]">{formatDate(post.created_at)}</p>
                    </div>
                </div>

                {/* Activity Badge */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full ${cfg.bg} border ${cfg.border}`}>
                    <span className={`material-symbols-outlined text-[13px] ${cfg.text}`}>{cfg.icon}</span>
                    <span className={`text-[11px] font-black ${cfg.text}`}>{post.activity_type}</span>
                </div>
            </div>

            {/* Image */}
            <div className="w-full aspect-square bg-black/20 overflow-hidden">
                <img
                    src={post.image_url}
                    alt={post.caption || '인증샷'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            </div>

            {/* Action Row */}
            <div className="px-4 pt-3 pb-1 flex items-center gap-4 flex-wrap">
                {/* Like */}
                <button
                    onClick={handleLike}
                    className="flex items-center gap-1.5 transition-transform active:scale-90"
                >
                    <span
                        className={`material-symbols-outlined text-[24px] transition-colors ${liked ? 'text-red-400' : 'text-white/40'}`}
                        style={{ fontVariationSettings: liked ? "'FILL' 1" : "'FILL' 0" }}
                    >
                        favorite
                    </span>
                    <span className={`text-[13px] font-bold ${liked ? 'text-red-400' : 'text-white/40'}`}>
                        {likesCount}
                    </span>
                </button>

                {/* Comment */}
                <button
                    onClick={handleToggleComments}
                    className="flex items-center gap-1.5 transition-transform active:scale-90"
                >
                    <span className={`material-symbols-outlined text-[22px] ${showComments ? 'text-[#A78BFA]' : 'text-white/40'}`}>
                        chat_bubble_outline
                    </span>
                    <span className={`text-[13px] font-bold ${showComments ? 'text-[#A78BFA]' : 'text-white/40'}`}>
                        {comments.length}
                    </span>
                </button>

                {/* Badges row */}
                <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
                    {/* 🔥 HOT 배지 - 좋아요 10개 이상이거나 어드민이 부여한 경우 */}
                    {(likesCount >= 10 || post.is_hot) && (
                        <div className="flex items-center gap-1 bg-orange-500/15 border border-orange-500/30 px-2 py-1 rounded-full animate-pulse">
                            <span className="text-[12px]">🔥</span>
                            <span className="text-[10px] font-black text-orange-400">HOT</span>
                        </div>
                    )}

                    {/* 👑 모카베스트 PICK 배지 */}
                    {post.is_marketing_pick && (
                        <div className="flex items-center gap-1 bg-yellow-500/15 border border-yellow-500/40 px-2 py-1 rounded-full">
                            <span className="text-[12px]">👑</span>
                            <span className="text-[10px] font-black text-yellow-500">모카베스트 PICK</span>
                        </div>
                    )}
                </div>

                {/* Delete (my post) */}
                {isMyPost && (
                    <button
                        onClick={() => onDelete?.(post.id)}
                        className="text-white/20 hover:text-red-400 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">delete_outline</span>
                    </button>
                )}

            </div>

            {/* Tag & Caption */}
            <div className="px-4 pb-3 space-y-1">
                {post.tag_label && (
                    <p className="text-[13px] text-white/60">
                        <span className={`font-bold ${cfg.text}`}>#{post.tag_label}</span>
                    </p>
                )}
                {post.caption && (
                    <p className="text-[14px] text-white/80 leading-relaxed break-words">{post.caption}</p>
                )}
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="border-t border-white/5 px-4 pt-3 pb-4 space-y-3">
                    {isLoadingComments ? (
                        <div className="flex justify-center py-4">
                            <span className="material-symbols-outlined text-white/30 text-[24px] animate-spin">progress_activity</span>
                        </div>
                    ) : (
                        <>
                            {comments.length === 0 && (
                                <p className="text-white/25 text-sm text-center py-2">첫 댓글을 달아보세요 👋</p>
                            )}
                            {comments.map(comment => (
                                <div key={comment.id} className="flex items-start gap-2.5 group">
                                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white/60">
                                        {comment.user_nickname?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-white font-bold text-[12px]">{comment.user_nickname} </span>
                                        <span className="text-white/70 text-[13px] break-words">{comment.content}</span>
                                        <p className="text-white/25 text-[10px] mt-0.5">{formatTime(comment.created_at)}</p>
                                    </div>
                                    {(comment.user_nickname === myNickname || isMyPost) && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </>
                    )}

                    {/* Comment Input */}
                    <form onSubmit={handleSubmitComment} className="flex items-center gap-2.5 pt-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#A78BFA] flex items-center justify-center flex-shrink-0 text-xs font-black text-white">
                            {myNickname?.charAt(0)}
                        </div>
                        <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-full px-3.5 pr-1.5 py-1.5 gap-2">
                            <input
                                type="text"
                                value={commentInput}
                                onChange={e => setCommentInput(e.target.value)}
                                placeholder="댓글 달기..."
                                className="flex-1 bg-transparent border-none outline-none text-white/80 text-[13px] placeholder-white/25"
                            />
                            <button
                                type="submit"
                                disabled={!commentInput.trim() || isSubmittingComment}
                                className="w-7 h-7 rounded-full bg-[#6C63FF] disabled:opacity-30 flex items-center justify-center flex-shrink-0 transition-opacity"
                            >
                                <span className="material-symbols-outlined text-white text-[14px]">send</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CertificationPostCard;
