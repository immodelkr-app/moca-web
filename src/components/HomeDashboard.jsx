import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getUserGrade, logoutUser } from '../services/userService';
import { fetchMessagesList } from '../services/messageService';
import ProfileEditModal from './ProfileEditModal';

const GRADE_EMOJI = {
    'SILVER': '🤍',
    'GOLD': '👑',
    'VIP': '💎',
    'BASIC': '⭐',
};

const GRADE_LABEL = {
    'SILVER': '실버 모카',
    'GOLD': '골드 모카',
    'VIP': '전속모델',
    'BASIC': '모카 회원',
};

const GRADE_COLOR = {
    'SILVER': 'from-slate-400 to-slate-300',
    'GOLD': 'from-yellow-400 to-amber-300',
    'VIP': 'from-purple-400 to-fuchsia-300',
    'BASIC': 'from-blue-400 to-cyan-300',
};

const MODEL_SUPPORT_ITEMS = [
    { icon: 'apartment', label: '에이전시 리스트', route: '/agencies', color: 'from-[#6C63FF] to-[#A78BFA]', glow: 'shadow-[#6C63FF]/30' },
    { icon: 'event_note', label: '투어일지', route: '/home/diary', color: 'from-[#14B8A6] to-[#2DD4BF]', glow: 'shadow-[#14B8A6]/30' },
    { icon: 'forward_to_inbox', label: '프로필 메일발송', route: '/home/smart-profile', color: 'from-[#10B981] to-[#34D399]', glow: 'shadow-[#10B981]/30' },
    { icon: 'calendar_month', label: '투어 캘린더', route: '/home/calendar', color: 'from-[#F59E0B] to-[#FCD34D]', glow: 'shadow-[#F59E0B]/30' },
    { icon: 'photo_camera', label: '투어스타그램', route: '/home/cert', color: 'from-[#EC4899] to-[#F472B6]', glow: 'shadow-[#EC4899]/30' },
    { icon: 'smart_display', label: '모카TV', route: '/home/tv', color: 'from-[#EF4444] to-[#F87171]', glow: 'shadow-[#EF4444]/30' },
];

const MOCA_BENEFITS_ITEMS = [
    { icon: 'star', label: '멤버십 카드', route: '/home/membership', color: 'from-[#8B5CF6] to-[#C4B5FD]', glow: 'shadow-[#8B5CF6]/30' },
    { icon: 'local_fire_department', label: '모카 에디트', route: '/home/shop', color: 'from-[#F59E0B] to-[#FCD34D]', glow: 'shadow-[#F59E0B]/30' },
    { icon: 'diamond', label: '혜택 모아보기', route: '/home/benefits', color: 'from-[#3B82F6] to-[#60A5FA]', glow: 'shadow-[#3B82F6]/30' },
    { icon: 'local_activity', label: '할인쿠폰', route: '/home/coupons', color: 'from-[#EC4899] to-[#F472B6]', glow: 'shadow-[#EC4899]/30' },
    { icon: 'shopping_bag', label: '제휴사', route: '/home/content', color: 'from-[#F43F5E] to-[#FB7185]', glow: 'shadow-[#F43F5E]/30' },
];

const HomeDashboard = () => {
    const navigate = useNavigate();
    const user = getUser();
    const grade = getUserGrade() || 'SILVER';
    const nickname = user?.nickname || user?.name || '모카 회원';

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

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

            {/* ── Top Header ── */}
            <header className="flex items-start gap-3 px-5 pt-8 pb-4">
                {/* 인사말 - 넓게 */}
                <div className="flex-1 min-w-0">
                    <p className="text-white/40 text-xs font-bold tracking-widest uppercase mb-1">Welcome back</p>
                    <h1 className="text-white font-black text-xl leading-tight">
                        안녕하세요,{' '}
                        <span className="bg-gradient-to-r from-[#C4B5FD] to-[#818CF8] bg-clip-text text-transparent">
                            {nickname}
                        </span>
                        님! 👋
                    </h1>
                </div>
                {/* 우측 영역 - 세로 배치 */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {/* Grade Badge — 다크 배경 + 컬러 텍스트로 가독성 확보 */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border ${grade === 'GOLD' ? 'border-[#D4AF37]/50' :
                        grade === 'VIP' ? 'border-purple-400/50' : 'border-white/15'
                        }`}>
                        <span className="text-sm">{GRADE_EMOJI[grade] || '⭐'}</span>
                        <span className={`font-black text-[11px] tracking-wide ${grade === 'GOLD' ? 'text-[#D4AF37]' :
                            grade === 'VIP' ? 'text-purple-300' :
                                grade === 'SILVER' ? 'text-slate-300' : 'text-blue-300'
                            }`}>
                            {GRADE_LABEL[grade] || '모카 회원'}
                        </span>
                    </div>
                    {/* 마이페이지 버튼 */}
                    <button
                        onClick={() => setIsProfileModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#6C63FF]/15 border border-[#6C63FF]/30 hover:bg-[#6C63FF]/25 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[#A78BFA] text-[14px]">person</span>
                        <span className="text-[#A78BFA] font-black text-[11px] tracking-wide">마이페이지</span>
                    </button>
                </div>
            </header>

            {/* ── Announcement Ticker ── */}
            {ticker && (
                <div
                    className="mx-5 mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#6C63FF]/10 border border-[#6C63FF]/20 cursor-pointer hover:bg-[#6C63FF]/15 transition-colors"
                    onClick={() => navigate('/home/message')}
                >
                    <span className="material-symbols-outlined text-[#818CF8] text-[18px] flex-shrink-0">campaign</span>
                    <p className="text-white/80 text-sm font-medium flex-1 truncate">{ticker}</p>
                    <span className="material-symbols-outlined text-white/30 text-[16px]">chevron_right</span>
                </div>
            )}

            {/* ── Pill Toggle Switch ── */}
            <div className="px-5 mb-6">
                <div className="relative flex bg-white/5 border border-white/10 p-1 rounded-full overflow-hidden">
                    {/* Sliding Background */}
                    <div
                        className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${activeTab === 'MODEL_SUPPORT'
                            ? 'left-1 bg-gradient-to-r from-[#6C63FF] to-[#818CF8] shadow-lg shadow-[#6C63FF]/30'
                            : 'left-[calc(50%+2px)] bg-gradient-to-r from-[#EC4899] to-[#F472B6] shadow-lg shadow-[#EC4899]/30'
                            }`}
                    />
                    <button
                        onClick={() => handleTabChange('MODEL_SUPPORT')}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-black transition-all z-10 ${activeTab === 'MODEL_SUPPORT' ? 'text-white' : 'text-white/40'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                        모카 광고모델 지원
                    </button>
                    <button
                        onClick={() => handleTabChange('MOCA_SHOPPING')}
                        className={`relative flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full text-sm font-black transition-all z-10 ${activeTab === 'MOCA_SHOPPING' ? 'text-white' : 'text-white/40'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
                        모카 모델 혜택
                    </button>
                </div>
            </div>

            {/* ── 2-Column Icon Grid ── */}
            <div className="px-5 pb-32 grid grid-cols-2 gap-3.5">
                {currentItems.map((item, idx) => (
                    <button
                        key={`${animKey}-${item.route}`}
                        onClick={() => navigate(item.route)}
                        className="animate-slideUp relative flex flex-col items-center justify-center gap-3.5 w-full bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] rounded-3xl py-7 transition-transform active:scale-95"
                        style={{ animationDelay: `${idx * 0.06}s`, animationFillMode: 'both' }}
                    >
                        {item.badge && (
                            <span className="absolute top-3 right-3 px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[9px] font-black tracking-wide">
                                {item.badge}
                            </span>
                        )}
                        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-xl ${item.glow}`}>
                            <span className="material-symbols-outlined text-white text-[30px]">{item.icon}</span>
                        </div>
                        <span className="text-white/90 font-black text-[15px] tracking-tight text-center break-keep leading-tight px-2">
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
