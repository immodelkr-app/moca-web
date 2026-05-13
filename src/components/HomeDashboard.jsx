import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getUserGrade, syncUserGrade, GRADE_INFO, GRADE_EMOJI } from '../services/userService';
import { fetchMessagesList } from '../services/messageService';
import ProfileEditModal from './ProfileEditModal';

const HIGHLIGHT_ITEMS = [
    { icon: 'apartment', label: '에이전시 리스트', desc: '나에게 맞는 에이전시 찾기', route: '/agencies', color: 'from-[#9333EA] to-[#C084FC]', glow: 'shadow-[#9333EA]/30' },
    { icon: 'forward_to_inbox', label: '프로필 메일발송', desc: '클릭 한 번으로 지원하기', route: '/home/smart-profile', color: 'from-[#7C3AED] to-[#A78BFA]', glow: 'shadow-[#7C3AED]/30' },
];

const TOUR_ITEMS = [
    { icon: 'event_note', label: '모델 다이어리', route: '/home/diary', color: 'from-[#0EA5E9] to-[#38BDF8]', glow: 'shadow-[#0EA5E9]/20' },
    { icon: 'manage_accounts', label: '프로필 관리', route: '/home/smart-profile', color: 'from-[#059669] to-[#34D399]', glow: 'shadow-[#059669]/20' },
    { icon: 'calendar_month', label: '투어 캘린더', route: '/home/calendar', color: 'from-[#D97706] to-[#FCD34D]', glow: 'shadow-[#D97706]/20' },
    { icon: 'forum', label: 'Q&A 게시판', route: '/home/qna', color: 'from-[#14B8A6] to-[#2DD4BF]', glow: 'shadow-[#14B8A6]/20' },
];

const COMMUNITY_ITEMS = [
    { icon: 'school', label: '모카 클래스', route: '/home/class', color: 'from-[#4F46E5] to-[#818CF8]', glow: 'shadow-[#4F46E5]/20' },
    { icon: 'photo_camera', label: '투어스타그램', route: '/home/cert', color: 'from-[#EC4899] to-[#F9A8D4]', glow: 'shadow-[#EC4899]/20' },
    { icon: 'smart_display', label: '모카TV', route: '/home/tv', color: 'from-[#EF4444] to-[#FCA5A5]', glow: 'shadow-[#EF4444]/20' },
    { icon: 'workspace_premium', label: '등급 신청하기', route: '/upgrade', color: 'from-[#D97706] to-[#FCD34D]', glow: 'shadow-[#D97706]/20' },
];

const HomeDashboard = () => {
    const navigate = useNavigate();
    const user = getUser();
    const [grade, setGrade] = useState(getUserGrade() || 'SILVER');
    const nickname = user?.name || user?.nickname || '모카 회원';

    const [ticker, setTicker] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        // 최신 회원 등급 백그라운드 동기화
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
    const gradeColor = (grade === 'GOLD' || grade === 'VIP' || grade === 'VVIP') ? 'text-[#D97706]' : 'text-[#7C3AED]';
    const gradeBg = (grade === 'GOLD' || grade === 'VIP' || grade === 'VVIP') ? 'bg-amber-50 border-amber-200' : 'bg-[#F3E8FF] border-[#E8E0FA]';

    return (
        <div className="min-h-screen flex flex-col pb-24" style={{ backgroundColor: 'var(--moca-bg)' }}>

            {/* ── 웰컴 헤더 ── */}
            <header className="flex items-start gap-3 px-5 pt-5 pb-4">
                <div className="flex-1 min-w-0">
                    <p className="text-[#9CA3AF] text-[10px] font-black tracking-widest uppercase mb-0.5">Welcome back</p>
                    <h1 className="text-[#1F1235] font-black text-2xl leading-tight">
                        안녕하세요, <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333EA] to-[#C084FC]">
                            {nickname}
                        </span>
                        님! 👋
                    </h1>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {/* 등급 배지 */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm ${gradeBg}`}>
                        <span className="text-sm">{GRADE_EMOJI[grade] || '🤍'}</span>
                        <span className={`font-black text-[11px] tracking-wide ${gradeColor}`}>
                            {gradeInfo.label}
                        </span>
                    </div>
                    {/* 마이페이지 버튼 */}
                    <button
                        onClick={() => setIsProfileModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E8E0FA] hover:bg-[#F8F5FF] shadow-sm transition-all active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[#5B4E7A] text-[14px]">person</span>
                        <span className="text-[#5B4E7A] font-black text-[11px] tracking-wide">마이페이지</span>
                    </button>
                </div>
            </header>

            {/* ── 공지 티커 ── */}
            {ticker && (
                <div
                    className="mx-5 mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-[#E8E0FA] shadow-sm cursor-pointer hover:bg-[#F8F5FF] transition-colors"
                    onClick={() => navigate('/home/message')}
                >
                    <span className="material-symbols-outlined text-[#9333EA] text-[18px] flex-shrink-0 animate-pulse">campaign</span>
                    <p className="text-[#5B4E7A] text-xs font-bold flex-1 truncate">{ticker}</p>
                    <span className="material-symbols-outlined text-[#9CA3AF] text-[16px]">chevron_right</span>
                </div>
            )}

            {/* ── 핵심 기능 (Highlight) ── */}
            <div className="px-5 mb-8 flex flex-col gap-3">
                {HIGHLIGHT_ITEMS.map((item, idx) => (
                    <button
                        key={item.label}
                        onClick={() => navigate(item.route)}
                        className={`relative w-full flex items-center p-5 rounded-[24px] bg-gradient-to-r ${item.color} shadow-lg ${item.glow} hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden`}
                    >
                        {/* Glassmorphism 빛반사 효과 */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        
                        <div className="flex-1 text-left relative z-10">
                            <p className="text-white/80 text-[13px] font-bold mb-1">{item.desc}</p>
                            <h3 className="text-white font-black text-[20px] tracking-tight">{item.label}</h3>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm relative z-10 border border-white/30">
                            <span className="material-symbols-outlined text-white text-[32px]">{item.icon}</span>
                        </div>
                    </button>
                ))}
            </div>

            {/* ── 모델 투어 관리 ── */}
            <div className="px-5 mb-8">
                <h2 className="text-[#1F1235] font-black text-[18px] mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#9333EA] text-[24px]">explore</span>
                    모델 투어 관리
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    {TOUR_ITEMS.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.route)}
                            className="flex items-center gap-3 p-4 bg-white border border-[#E8E0FA] rounded-[20px] shadow-sm hover:border-[#C084FC] hover:shadow-md group active:scale-95 transition-all"
                        >
                            <div className="w-14 h-14 rounded-[16px] flex items-center justify-center relative overflow-hidden flex-shrink-0">
                                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-15`}></div>
                                <span className={`material-symbols-outlined text-[28px] text-[#5B4E7A] group-hover:text-[#9333EA] transition-colors`}>{item.icon}</span>
                            </div>
                            <span className="text-[#1F1235] font-black text-[15px] text-left leading-tight break-keep">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 커뮤니티 & 활동 ── */}
            <div className="px-5 mb-8">
                <h2 className="text-[#1F1235] font-black text-[18px] mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#9333EA] text-[24px]">diversity_3</span>
                    커뮤니티 & 활동
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    {COMMUNITY_ITEMS.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.route)}
                            className="flex items-center gap-3 p-4 bg-white border border-[#E8E0FA] rounded-[20px] shadow-sm hover:border-[#C084FC] hover:shadow-md group active:scale-95 transition-all"
                        >
                            <div className="w-14 h-14 rounded-[16px] flex items-center justify-center relative overflow-hidden flex-shrink-0">
                                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-15`}></div>
                                <span className={`material-symbols-outlined text-[28px] text-[#5B4E7A] group-hover:text-[#9333EA] transition-colors`}>{item.icon}</span>
                            </div>
                            <span className="text-[#1F1235] font-black text-[15px] text-left leading-tight break-keep">{item.label}</span>
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

