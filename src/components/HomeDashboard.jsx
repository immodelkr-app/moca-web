import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getUserGrade, syncUserGrade, GRADE_INFO, GRADE_EMOJI } from '../services/userService';
import { fetchMessagesList } from '../services/messageService';
import ProfileEditModal from './ProfileEditModal';

const HIGHLIGHT_ITEMS = [
    { icon: 'apartment', label: '에이전시 리스트', desc: '나에게 맞는 에이전시 찾기', route: '/agencies', color: 'from-[#8B5CF6] to-[#6D28D9]', glow: 'shadow-[#8B5CF6]/20' },
    { icon: 'forward_to_inbox', label: '프로필 메일발송', desc: '클릭 한 번으로 지원하기', route: '/home/smart-profile', color: 'from-[#7C3AED] to-[#5B21B6]', glow: 'shadow-[#7C3AED]/20' },
];

const TOUR_ITEMS = [
    { icon: 'event_note', label: '투어일지', route: '/home/diary', color: 'from-[#0EA5E9] to-[#0284C7]', bgLight: 'bg-sky-50', textCol: 'text-sky-600' },
    { icon: 'manage_accounts', label: '프로필 관리', route: '/home/smart-profile', color: 'from-[#10B981] to-[#059669]', bgLight: 'bg-emerald-50', textCol: 'text-emerald-600' },
    { icon: 'calendar_month', label: '투어 캘린더', route: '/home/calendar', color: 'from-[#F59E0B] to-[#D97706]', bgLight: 'bg-amber-50', textCol: 'text-amber-600' },
    { icon: 'forum', label: 'Q&A 게시판', route: '/home/qna', color: 'from-[#14B8A6] to-[#0D9488]', bgLight: 'bg-teal-50', textCol: 'text-teal-600' },
];

const COMMUNITY_ITEMS = [
    { icon: 'school', label: '모카 클래스', route: '/home/class', color: 'from-[#6366F1] to-[#4F46E5]', bgLight: 'bg-indigo-50', textCol: 'text-indigo-600' },
    { icon: 'photo_camera', label: '투어 인증샷', route: '/home/cert', color: 'from-[#EC4899] to-[#DB2777]', bgLight: 'bg-pink-50', textCol: 'text-pink-600' },
    { icon: 'smart_display', label: '모카TV', route: '/home/tv', color: 'from-[#EF4444] to-[#DC2626]', bgLight: 'bg-red-50', textCol: 'text-red-600' },
    { icon: 'workspace_premium', label: '등급 신청하기', route: '/upgrade', color: 'from-[#D97706] to-[#B45309]', bgLight: 'bg-amber-50', textCol: 'text-amber-700' },
];

const HomeDashboard = () => {
    const navigate = useNavigate();
    const user = getUser();
    const [grade, setGrade] = useState(getUserGrade() || 'SILVER');
    const nickname = user?.name || user?.nickname || '모카 회원';

    const [ticker, setTicker] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        syncUserGrade().then(() => {
            setGrade(getUserGrade() || 'SILVER');
        });

        fetchMessagesList().then(data => {
            if (data && data.length > 0) {
                setTicker(data[0]?.title || data[0]?.content?.slice(0, 40) || '');
            }
        }).catch(() => { });
    }, []);

    const gradeInfo = GRADE_INFO[grade] || GRADE_INFO.SILVER;

    return (
        <div className="min-h-screen flex flex-col pb-24" style={{ backgroundColor: 'var(--moca-bg)' }}>

            {/* ── 웰컴 헤더 (모바일 가독성 최적화) ── */}
            <header className="flex items-center justify-between px-5 pt-6 pb-3">
                <div>
                    <span className="text-[#8B5CF6] text-[11px] font-bold tracking-wider uppercase block mb-0.5">
                        Welcome Back
                    </span>
                    <h1 className="text-[#1F1235] font-bold text-xl leading-snug">
                        안녕하세요,{' '}
                        <span className="text-[#7C3AED] font-extrabold">
                            {nickname}
                        </span>
                        님! 👋
                    </h1>
                </div>

                {/* 마이페이지 버튼 하나로 정갈하게 통합 */}
                <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E8E0FA] hover:border-[#7C3AED]/40 shadow-2xs active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined text-[#7C3AED] text-[16px]">account_circle</span>
                    <span className="text-[#5B4E7A] font-bold text-xs">마이페이지</span>
                </button>
            </header>

            {/* ── 공지사항 캡슐 알림 바 ── */}
            {ticker && (
                <div className="px-5 mb-5">
                    <div
                        className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-white border border-[#E8E0FA] shadow-2xs cursor-pointer hover:bg-[#F8F5FF] transition-all"
                        onClick={() => navigate('/home/message')}
                    >
                        <span className="material-symbols-outlined text-[#8B5CF6] text-[16px] flex-shrink-0 animate-pulse">campaign</span>
                        <p className="text-[#4C3E6D] text-xs font-semibold flex-1 truncate">{ticker}</p>
                        <span className="material-symbols-outlined text-[#9CA3AF] text-[15px]">chevron_right</span>
                    </div>
                </div>
            )}

            {/* ── 메인 핵심 기능 CTA 카카오/iOS 스타일 ── */}
            <div className="px-5 mb-6 flex flex-col gap-3">
                {HIGHLIGHT_ITEMS.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => navigate(item.route)}
                        className={`relative w-full flex items-center px-5 py-4 rounded-2xl bg-gradient-to-r ${item.color} shadow-md ${item.glow} active:scale-[0.98] transition-all overflow-hidden text-left`}
                    >
                        <div className="flex-1 min-w-0 pr-2">
                            <span className="text-white/80 text-[11px] font-semibold block mb-0.5">{item.desc}</span>
                            <h3 className="text-white font-black text-lg tracking-tight leading-tight">{item.label}</h3>
                        </div>
                        <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 flex-shrink-0">
                            <span className="material-symbols-outlined text-white text-[24px]">{item.icon}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* ── 모델 투어 관리 ── */}
            <div className="px-5 mb-6">
                <h2 className="text-[#1F1235] font-extrabold text-sm mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#8B5CF6] text-[20px]">explore</span>
                    모델 투어 관리
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {TOUR_ITEMS.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.route)}
                            className="flex items-center gap-3 p-3.5 bg-white border border-[#E8E0FA] rounded-2xl shadow-2xs hover:border-[#8B5CF6]/40 group active:scale-95 transition-all text-left"
                        >
                            <div className={`w-10 h-10 rounded-xl ${item.bgLight} flex items-center justify-center flex-shrink-0`}>
                                <span className={`material-symbols-outlined text-[20px] ${item.textCol}`}>{item.icon}</span>
                            </div>
                            <span className="text-[#1F1235] font-bold text-xs leading-snug">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 커뮤니티 & 활동 ── */}
            <div className="px-5 mb-6">
                <h2 className="text-[#1F1235] font-extrabold text-sm mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#8B5CF6] text-[20px]">diversity_3</span>
                    커뮤니티 &amp; 활동
                </h2>
                <div className="grid grid-cols-2 gap-3">
                    {COMMUNITY_ITEMS.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.route)}
                            className="flex items-center gap-3 p-3.5 bg-white border border-[#E8E0FA] rounded-2xl shadow-2xs hover:border-[#8B5CF6]/40 group active:scale-95 transition-all text-left"
                        >
                            <div className={`w-10 h-10 rounded-xl ${item.bgLight} flex items-center justify-center flex-shrink-0`}>
                                <span className={`material-symbols-outlined text-[20px] ${item.textCol}`}>{item.icon}</span>
                            </div>
                            <span className="text-[#1F1235] font-bold text-xs leading-snug">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Profile Edit Modal */}
            {isProfileModalOpen && (
                <ProfileEditModal
                    onClose={() => setIsProfileModalOpen(false)}
                    onUpdateSuccess={() => {
                        setIsProfileModalOpen(false);
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
};

export default HomeDashboard;


