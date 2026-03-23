import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logoutUser, getUser } from '../services/userService';

const navGroups = [
    {
        title: '전체 홈',
        items: [
            { to: '/home/dashboard', icon: 'home', label: '대시보드 홈' }
        ]
    },
    {
        title: '모델 활동지원',
        items: [
            { to: '/agencies', icon: 'apartment', label: '에이전시 리스트' },
            { to: '/home/smart-profile', icon: 'forward_to_inbox', label: '나의 프로필 관리' },
            { to: '/home/cert', icon: 'photo_camera', label: '투어스타그램' },
            { to: '/home/diary', icon: 'event_note', label: '투어일지 모아보기' },
            { to: '/home/calendar', icon: 'calendar_month', label: '투어 캘린더' },
            { to: '/home/tv', icon: 'smart_display', label: '모카TV 시청' }
        ]
    },
    {
        title: '모카 혜택 & 쇼핑',
        items: [
            { to: '/home/membership', icon: 'star', label: '모카 멤버십 카드' },
            { to: '/home/coupons', icon: 'local_activity', label: '모델 할인쿠폰' },
            { to: '/home/content', icon: 'shopping_bag', label: '모카 제휴혜택' },
            { to: '/home/shop', icon: 'local_fire_department', label: '모카 에디트' },
            { to: '/home/benefits', icon: 'diamond', label: '혜택 & 쇼핑' }
        ]
    },
    {
        title: '소식',
        items: [
            { to: '/home/message', icon: 'local_post_office', label: '아임모카 공지' }
        ]
    }
];

const Layout = () => {
    const navigate = useNavigate();
    const user = getUser();
    const userGrade = user?.grade || 'BASIC';
    const userId = user?.nickname || user?.name || '';

    const handleLogout = () => {
        logoutUser();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex text-white overflow-x-hidden w-full max-w-[100vw]">

            {/* ── PC 사이드 네비게이션 (lg 이상) ── */}
            <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-[#0a0a0f] border-r border-white/10 fixed left-0 top-0 z-50">
                {/* Logo & Login Status */}
                <div className="px-6 py-8 border-b border-white/10 flex flex-col items-center text-center">
                    <span className="bg-gradient-to-r from-[#9B8AFB] to-[#6052FF] bg-clip-text text-transparent text-4xl font-black tracking-tighter pb-1">MOCA</span>
                    <p className="text-[10px] text-white/30 mt-1 font-bold pl-1 space-x-1 uppercase tracking-widest mb-4">
                        <span>아임모델</span> <span>에이전시</span>
                    </p>
                    {userId && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 w-full justify-center">
                            <span className={`font-bold text-[11px] ${userGrade === 'GOLD' ? 'text-[#D4AF37]' : 'text-slate-300'}`}>
                                {userGrade === 'GOLD' ? '골드모카' : '실버모카'}
                            </span>
                            <span className="text-white font-bold text-[11px]">{userId}</span>
                        </div>
                    )}
                </div>

                {/* Nav links */}
                <nav className="flex-1 px-4 py-4 overflow-y-auto hide-scrollbar">
                    {navGroups.map((group, idx) => (
                        <div key={group.title} className={idx > 0 ? "mt-5" : ""}>
                            <h3 className="px-4 text-[10px] font-black text-[#818CF8] tracking-widest mb-2 uppercase">
                                {group.title}
                            </h3>
                            <div className="space-y-1">
                                {group.items.map(({ to, icon, label }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        end={to === '/'}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all
                                            ${isActive
                                                ? 'bg-[#6C63FF]/20 text-[#818CF8]'
                                                : 'text-white/40 hover:bg-white/5 hover:text-white'
                                            }`
                                        }
                                    >
                                        <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                        {label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Bottom info & Logout */}
                <div className="px-6 py-5 border-t border-white/10 flex flex-col gap-4">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        <span className="text-xs font-bold tracking-widest">로그아웃</span>
                    </button>
                    <p className="text-[10px] text-white/20 tracking-widest uppercase">© 2026 I'M MODEL</p>
                </div>
            </aside>

            {/* ── 메인 콘텐츠 영역 ── */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen relative w-full max-w-full overflow-x-hidden">
                {/* ── Mobile Top Header & Floating Logout Button (lg 미만) ── */}
                <header className="lg:hidden flex items-center justify-between px-5 pt-6 pb-4 bg-[#0a0a0f] border-b border-white/5 z-[100] sticky top-0 w-full">
                    <div className="flex items-center gap-2">
                        <span className="bg-gradient-to-r from-[#9B8AFB] to-[#6052FF] bg-clip-text text-transparent text-2xl font-black tracking-tighter">MOCA</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {userId && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10">
                                <span className={`font-bold text-[10px] ${userGrade === 'GOLD' ? 'text-[#D4AF37]' : 'text-slate-300'}`}>
                                    {userGrade === 'GOLD' ? '골드모카' : '실버모카'}
                                </span>
                                <span className="text-white font-bold text-[10px]">{userId}</span>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full backdrop-blur-md transition-all"
                        >
                            <span className="text-[10px] font-bold text-white/60 whitespace-nowrap">로그아웃</span>
                            <span className="material-symbols-outlined text-[14px] text-white/60">logout</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-28 lg:pb-8 w-full">
                    <Outlet />

                    {/* ── Footer ── */}
                    <footer className="w-full border-t border-white/20 bg-[#07070d] px-6 py-8 mt-8">
                        <div className="max-w-4xl mx-auto space-y-3">
                            <p className="text-white/80 text-sm font-black tracking-widest uppercase">글로벌아임</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-white/55 text-[12px]">
                                <span>서울시 영등포구 영중로 159, 7층</span>
                                <span className="text-white/20">|</span>
                                <span>사업자등록번호 : 365-22-00947</span>
                                <span className="text-white/20">|</span>
                                <span>카카오상담 : @immodel</span>
                                <span className="text-white/20">|</span>
                                <span>E-MAIL : immodelent@gmail.com</span>
                            </div>
                            <p className="text-white/35 text-[11px] tracking-widest pt-1">
                                © 2026 Copyright by Global IM Model. All rights reserved.
                            </p>
                        </div>
                    </footer>
                </main>

                {/* ── 모바일 하단 네비게이션 (lg 미만) ── */}
                <nav className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[390px] h-20 bg-[#1a1a24]/90 backdrop-blur-xl rounded-full border border-white/10 flex items-center z-[100] shadow-2xl shadow-black/50">

                    {/* 왼쪽 — 뒤로 가기 */}
                    <div className="flex flex-1 items-center justify-center pr-8">
                        <button
                            onClick={() => window.history.back()}
                            className="flex flex-col items-center gap-1 text-white/30 hover:text-white/80 active:scale-90 transition-all"
                        >
                            <span className="material-symbols-outlined text-[28px]">arrow_back_ios</span>
                            <span className="text-[10px] font-bold tracking-widest whitespace-nowrap">뒤로가기</span>
                        </button>
                    </div>

                    {/* 중앙 홈 버튼 (절대 위치 고정) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <NavLink to="/home/dashboard">
                            <button className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6C63FF] to-[#A78BFA] flex items-center justify-center text-white shadow-lg shadow-[#6C63FF]/40 border-[3px] border-[#1a1a24] active:scale-95 transition-transform">
                                <span className="material-symbols-outlined text-[24px] font-bold">home</span>
                            </button>
                        </NavLink>
                    </div>

                    {/* 오른쪽 — 앞으로 가기 */}
                    <div className="flex flex-1 items-center justify-center pl-8">
                        <button
                            onClick={() => window.history.forward()}
                            className="flex flex-col items-center gap-1 text-white/30 hover:text-white/80 active:scale-90 transition-all"
                        >
                            <span className="material-symbols-outlined text-[28px]">arrow_forward_ios</span>
                            <span className="text-[10px] font-bold tracking-widest whitespace-nowrap">앞으로가기</span>
                        </button>
                    </div>
                </nav>
            </div>
        </div>
    );
};

export default Layout;
