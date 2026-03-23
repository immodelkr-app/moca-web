import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';
import {
    fetchCertPosts,
    createCertPost,
    deleteCertPost,
    fetchMyLikedPostIds,
} from '../services/certificationService';
import CertificationUploadModal from './CertificationUploadModal';
import CertificationPostCard from './CertificationPostCard';

const FILTER_TABS = ['전체', '에이전시투어', '광고모델수업'];

const EMPTY_MESSAGES = {
    '전체': '아직 게시물이 없어요!\n첫 번째 투어스타그램을 올려보세요 📸',
    '에이전시투어': '에이전시 투어 게시물이 없어요.\n투어 후 투어스타그램을 올려보세요! 🏢',
    '광고모델수업': '광고모델 수업 게시물이 없어요.\n수업 후 투어스타그램을 남겨보세요! 📚',
};

const CertificationFeed = () => {
    const navigate = useNavigate();
    const user = getUser();
    const myNickname = user?.nickname || user?.name || '익명모카';

    const [posts, setPosts] = useState([]);
    const [likedPostIds, setLikedPostIds] = useState([]);
    const [activeFilter, setActiveFilter] = useState('전체');
    const [isLoading, setIsLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = useCallback(async (filter = activeFilter, showSpinner = true) => {
        if (showSpinner) setIsLoading(true);
        try {
            const [postsData, likesData] = await Promise.all([
                fetchCertPosts(filter),
                fetchMyLikedPostIds(myNickname),
            ]);
            setPosts(postsData);
            setLikedPostIds(likesData);
        } finally {
            setIsLoading(false);
        }
    }, [activeFilter, myNickname]);

    useEffect(() => {
        loadData(activeFilter);
    }, [activeFilter]);

    const handleFilterChange = (tab) => {
        if (tab === activeFilter) return;
        setActiveFilter(tab);
    };

    const handleUploadSuccess = async ({ activityType, tagLabel, caption, imageFile, isMarketingAgreed }) => {
        const { post, error } = await createCertPost({
            userNickname: myNickname,
            activityType,
            tagLabel,
            caption,
            imageFile,
            isMarketingAgreed,
        });
        if (!error && post) {
            setPosts(prev => [post, ...prev]);
        }
    };

    const handleDelete = async (postId) => {
        if (!window.confirm('이 게시물을 삭제할까요?')) return;
        await deleteCertPost(postId);
        setPosts(prev => prev.filter(p => p.id !== postId));
    };

    const handleLikeChange = (postId, isLiked) => {
        setLikedPostIds(prev =>
            isLiked ? [...prev, postId] : prev.filter(id => id !== postId)
        );
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadData(activeFilter, false);
        setIsRefreshing(false);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center justify-between px-4 pt-5 pb-3">
                    <button
                        onClick={() => navigate('/home/dashboard')}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px] text-white/80">arrow_back</span>
                    </button>

                    <div className="text-center">
                        <h1 className="text-white font-black text-[17px] tracking-tight">📸 투어스타그램</h1>
                        <p className="text-white/35 text-[11px] mt-0.5">활동 인증 & 커뮤니티</p>
                    </div>

                    <button
                        onClick={handleRefresh}
                        className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <span className={`material-symbols-outlined text-[20px] text-white/60 ${isRefreshing ? 'animate-spin' : ''}`}>
                            refresh
                        </span>
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
                    {FILTER_TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => handleFilterChange(tab)}
                            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-black transition-all ${activeFilter === tab
                                ? 'bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white shadow-lg shadow-[#6C63FF]/25'
                                : 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </header>

            {/* Feed Content */}
            <div className="flex-1 px-4 py-4 pb-32 space-y-4">
                {isLoading ? (
                    /* Skeleton Loading */
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white/[0.03] border border-white/8 rounded-3xl overflow-hidden animate-pulse">
                                <div className="flex items-center gap-3 px-4 py-4">
                                    <div className="w-9 h-9 rounded-full bg-white/10" />
                                    <div className="space-y-1.5">
                                        <div className="w-24 h-3 bg-white/10 rounded-full" />
                                        <div className="w-16 h-2.5 bg-white/5 rounded-full" />
                                    </div>
                                </div>
                                <div className="w-full aspect-square bg-white/5" />
                                <div className="px-4 py-3 space-y-2">
                                    <div className="w-20 h-3 bg-white/10 rounded-full" />
                                    <div className="w-40 h-2.5 bg-white/5 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : posts.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#6C63FF]/20 to-[#A78BFA]/10 border border-[#6C63FF]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#A78BFA] text-[40px]">photo_camera</span>
                        </div>
                        <p className="text-white/40 text-[15px] text-center leading-relaxed whitespace-pre-line font-medium">
                            {EMPTY_MESSAGES[activeFilter]}
                        </p>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="mt-2 flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black text-[14px] shadow-lg shadow-[#6C63FF]/30 active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                            투어스타그램 작성
                        </button>
                    </div>
                ) : (
                    /* Posts Feed */
                    posts.map(post => (
                        <CertificationPostCard
                            key={post.id}
                            post={post}
                            myNickname={myNickname}
                            likedPostIds={likedPostIds}
                            onLikeChange={handleLikeChange}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>

            {/* FAB - Upload Button */}
            <div className="fixed bottom-32 right-5 z-20">
                <button
                    onClick={() => setShowUploadModal(true)}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#A78BFA] flex items-center justify-center shadow-xl shadow-[#6C63FF]/40 hover:shadow-[#6C63FF]/60 transition-all active:scale-90"
                    style={{
                        animation: 'float 3s ease-in-out infinite',
                    }}
                >
                    <span className="material-symbols-outlined text-white text-[26px]">add_photo_alternate</span>
                </button>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <CertificationUploadModal
                    onClose={() => setShowUploadModal(false)}
                    onSuccess={handleUploadSuccess}
                />
            )}

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-6px); }
                }
            `}</style>
        </div>
    );
};

export default CertificationFeed;
