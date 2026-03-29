import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getUserGrade } from '../services/userService';
import { fetchMessagesList } from '../services/messageService';
import ProfileEditModal from './ProfileEditModal';

const GRADE_EMOJI = { 'SILVER': '🤍', 'GOLD': '👑', 'VIP': '💎', 'VVIP': '💎', 'BASIC': '⭐' };
const GRADE_LABEL = { 'SILVER': '실버 모카', 'GOLD': '골드 모카', 'VIP': '전속모델', 'VVIP': 'VVIP', 'BASIC': '모카 회원' };

const MODEL_SUPPORT_ITEMS = [
    { icon: 'apartment',       label: '에이전시 리스트',  route: '/agencies',           color: 'from-[#9333EA] to-[#C084FC]', glow: 'shadow-[#9333EA]/25' },
    { icon: 'event_note',      label: '투어일지',         route: '/home/diary',         color: 'from-[#0EA5E9] to-[#38BDF8]', glow: 'shadow-[#0EA5E9]/25' },
    { icon: 'manage_accounts', label: '모델프로필 관리',   route: '/home/smart-profile', color: 'from-[#7C3AED] to-[#A78BFA]', glow: 'shadow-[#7C3AED]/25', badge: 'NEW' },
    { icon: 'school',          label: '모카 클래스',     route: '/home/class',         color: 'from-[#4F46E5] to-[#818CF8]', glow: 'shadow-[#4F46E5]/25', badge: 'NEW' },
    { icon: 'forward_to_inbox',label: '프로필 메일발송',   route: '/home/smart-profile', color: 'from-[#059669] to-[#34D399]', glow: 'shadow-[#059669]/25' },
    { icon: 'calendar_month',  label: '투어 캘린더',      route: '/home/calendar',      color: 'from-[#D97706] to-[#FCD34D]', glow: 'shadow-[#D97706]/25' },
    { icon: 'photo_camera',    label: '투어스타그램',      route: '/home/cert',          color: 'from-[#EC4899] to-[#F9A8D4]', glow: 'shadow-[#EC4899]/25' },
    { icon: 'smart_display',   label: '모카TV',           route: '/home/tv',            color: 'from-[#EF4444] to-[#FCA5A5]', glow: 'shadow-[#EF4444]/25' },
];

const MOCA_BENEFITS_ITEMS = [
    { icon: 'star',                label: '멤버십 카드',   route: '/home/membership', color: 'from-[#9333EA] to-[#C084FC]', glow: 'shadow-[#9333EA]/25' },
    { icon: 'local_fire_department',label: '모카 에디트',   route: '/home/shop',       color: 'from-[#D97706] to-[#FCD34D]', glow: 'shadow-[#D97706]/25' },
    { icon: 'diamond',             label: '혜택 모아보기',  route: '/home/benefits',   color: 'from-[#3B82F6] to-[#93C5FD]', glow: 'shadow-[#3B82F6]/25' },
    { icon: 'local_activity',      label: '할인쿠폰',      route: '/home/coupons',    color: 'from-[#EC4899] to-[#F9A8D4]', glow: 'shadow-[#EC4899]/25' },
    { icon: 'shopping_bag',        label: '제휴혜택',      route: '/home/content',    color: 'from-[#F43F5E] to-[#FCA5A5]', glow: 'shadow-[#F43F5E]/25' },
];

const HomeDashboard = () => {
    const navigate = useNavigate();
    const user = getUser();
    const grade = getUserGrade() || 'SILVER';
    const nickname = user?.name || user?.nickname || '모카 회원';

    const [activeTab, setActiveTab] = useState('MODEL_SUPPORT');
    const [ticker, setTicker] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [animKey, setAnimKey] = useState(0);

    useEffect(() => {
        fetchMessagesList().then(data => {
            if (data && data.length > 0) {
                setTicker(data[0]?.title || data[0]?.content?.slice(0, 40) || '');
            }
        }).catch(() => { });
    }, []);

    const handleTabChange = (tab) => {
        if (tab === activeTab) return;
        setActiveTab(tab);
        setAnimKey(k => k + 1);
    };

    const currentItems = activeTab === 'MODEL_SUPPORT' ? MODEL_SUPPORT_ITEMS : MOCA_BENEFITS_ITEMS;

    const gradeColor = grade === 'GOLD' || grade === 'VIP' || grade === 'VVIP' ? 'text-[#D97706]' : 'text-[#7C3AED]';
    const gradeBg    = grade === 'GOLD' || grade === 'VIP' || grade === 'VVIP' ? 'bg-amber-50 border-amber-200' : 'bg-[#F3E8FF] border-[#E8E0FA]';

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--moca-bg)' }}>

            {/* ── 웰컴 헤더 ── */}
            <header className="flex items-start gap-3 px-5 pt-5 pb-4">
                <div className="flex-1 min-w-0">
                    <p className="text-[#9CA3AF] text-[10px] font-bold tracking-widest uppercase mb-0.5">Welcome back</p>
                    <h1 className="text-[#1F1235] font-black text-xl leading-tight">
                        안녕하세요,{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333EA] to-[#C084FC]">
                            {nickname}
                        </span>
                        님! 👋
                    </h1>
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {/* 등급 배지 */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${gradeBg}`}>
                        <span className="text-sm">{GRADE_EMOJI[grade] || '⭐'}</span>
                        <span className={`font-black text-[11px] tracking-wide ${gradeColor}`}>
                            {GRADE_LABEL[grade] || '모카 회원'}
                        </span>
                    </div>
                    {/* 마이페이지 버튼 */}
                    <button
                        onClick={() => setIsProfileModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F3E8FF] border border-[#E8E0FA] hover:bg-[#EDE8FF] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[#9333EA] text-[14px]">person</span>
                        <span className="text-[#7C3AED] font-black text-[11px] tracking-wide">마이페이지</span>
                    </button>
                </div>
            </header>

            {/* ── 공지 티커 ── */}
            {ticker && (
                <div
                    className="mx-5 mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#F3E8FF] border border-[#E8E0FA] cursor-pointer hover:bg-[#EDE8FF] transition-colors"
                    onClick={() => navigate('/home/message')}
                >
                    <span className="material-symbols-outlined text-[#9333EA] text-[18px] flex-shrink-0">campaign</span>
                    <p className="text-[#5B4E7A] text-sm font-medium flex-1 truncate">{ticker}</p>
                    <span className="material-symbols-outlined text-[#9CA3AF] text-[16px]">chevron_right</span>
                </div>
            )}

            {/* ── 탭 토글 ── */}
            <div className="px-5 mb-6">
                <div className="relative flex bg-[#F3E8FF] border border-[#E8E0FA] p-1 rounded-full overflow-hidden">
                    {/* 슬라이딩 배경 */}
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-lg
                        ${activeTab === 'MODEL_SUPPORT'
                            ? 'left-1 bg-gradient-to-r from-[#9333EA] to-[#C084FC] shadow-[#9333EA]/30'
                            : 'left-[calc(50%+2px)] bg-gradient-to-r from-[#EC4899] to-[#F9A8D4] shadow-[#EC4899]/30'
                        }`}
                    />
                    <button
                        onClick={() => handleTabChange('MODEL_SUPPORT')}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-black transition-all z-10
                        ${activeTab === 'MODEL_SUPPORT' ? 'text-white' : 'text-[#9CA3AF]'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                        광고모델 활동
                    </button>
                    <button
                        onClick={() => handleTabChange('MOCA_SHOPPING')}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-black transition-all z-10
                        ${activeTab === 'MOCA_SHOPPING' ? 'text-white' : 'text-[#9CA3AF]'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                        모카 모델 혜택
                    </button>
                </div>
            </div>

            {/* ── 2열 아이콘 그리드 ── */}
            <div className="px-5 pb-32 grid grid-cols-2 gap-3.5">
                {currentItems.map((item, idx) => (
                    <button
                        key={`${animKey}-${item.label}`}
                        onClick={() => navigate(item.route)}
                        className="relative flex flex-col items-center justify-center gap-2.5 w-full bg-white border border-[#E8E0FA] hover:border-[#C084FC]/50 hover:shadow-moca rounded-3xl py-5 transition-all active:scale-95"
                        style={{ animationDelay: `${idx * 0.06}s` }}
                    >
                        {item.badge && (
                            <span className="absolute top-3 right-3 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-black tracking-wide">
                                {item.badge}
                            </span>
                        )}
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-xl ${item.glow}`}>
                            <span className="material-symbols-outlined text-white text-[30px]">{item.icon}</span>
                        </div>
                        <span className="text-[#1F1235] font-black text-[14px] tracking-tight text-center break-keep leading-tight px-2">
                            {item.label}
                        </span>
                    </button>
                ))}
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
