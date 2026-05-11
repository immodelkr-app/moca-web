import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { logoutUser, getUser, GRADE_INFO, GRADE_EMOJI } from '../services/userService';



/* ── PC 사이드바 대분류/중분류 구조 ── */
const navGroups = [
    {
        title: '홈',
        icon: 'home',
        items: [
            { to: '/home/dashboard', icon: 'home', label: '대시보드 홈' },
        ]
    },
    {
        title: '모델 활동',
        icon: 'apartment',
        items: [
            { to: '/agencies', icon: 'apartment', label: '에이전시 목록' },
            { to: '/home/smart-profile', icon: 'forward_to_inbox', label: '나의 프로필 관리' },
            { to: '/upgrade', icon: 'workspace_premium', label: '모델활동 신청' }, // 광고모델 활동 핵심
            { to: '/home/calendar', icon: 'calendar_month', label: '투어 캘린더' },
            { to: '/home/diary', icon: 'event_note', label: '모델 다이어리' },
            { to: '/home/cert', icon: 'photo_camera', label: '투어스타그램' },
            { to: '/home/class', icon: 'school', label: '모카 클래스' },
        ]
    },
    {
        title: '콘텐츠 & 소식',
        icon: 'smart_display',
        items: [
            { to: '/home/tv', icon: 'smart_display', label: '모카TV' },
            { to: '/home/message', icon: 'local_post_office', label: '공지사항' },
            { to: '/home/lounge', icon: 'forum', label: '모카 라운지' },
            { to: '/home/qna', icon: 'forum', label: 'Q&A 게시판' },
        ]
    },
    // ── HIDDEN: 혜택 & 쇼핑 그룹 – Phase 2에서 복원 예정 ────────────────────

    {
        title: 'MY 서비스',
        icon: 'contract',
        items: [
            { to: '/home/contract', icon: 'contract', label: '전속계약 요청' },
        ]
    },
];

/* ── 모바일 5탭 ── */
const bottomTabs = [
    { to: '/home/dashboard', icon: 'home', label: '홈' },
    { to: '/agencies', icon: 'apartment', label: '에이전시' },
    { to: '/home/diary', icon: 'event_note', label: '모델다이어리' },
    { to: '/home/calendar', icon: 'calendar_month', label: '캘린더' },
];

/* ── 더보기 메뉴 항목 ── */
const moreMenuItems = [
    { to: '/upgrade',         icon: 'workspace_premium',    label: '등급 업그레이드' },
    { to: '/home/smart-profile', icon: 'forward_to_inbox',  label: '프로필 관리' },
    { to: '/home/cert',       icon: 'photo_camera',         label: '투어스타그램' },
    { to: '/home/tv',         icon: 'smart_display',        label: '모카TV' },
    { to: '/home/message',    icon: 'local_post_office',    label: '공지사항' },
    { to: '/home/lounge',     icon: 'forum',                label: '모카 라운지' },
    { to: '/home/class',      icon: 'school',               label: '모카 클래스' },
    { to: '/home/qna',        icon: 'forum',                label: 'Q&A 게시판' },

];

const Layout = () => {
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [userGrade, setUserGrade] = useState(getUser()?.grade || 'BASIC');
    const navigate = useNavigate();
    const location = useLocation();
    
    const user = getUser();
    const userId = user?.nickname || user?.name || '';

    React.useEffect(() => {
        // 레이아웃 차원에서 유저 정보(특히 등급) 동기화 수행
        const performSync = async () => {
            const { syncUserGrade } = await import('../services/userService');
            await syncUserGrade();
            const updatedUser = getUser();
            if (updatedUser) {
                setUserGrade(updatedUser.grade || 'BASIC');
            }
        };
        performSync();
    }, [location.pathname]); // 경로 이동 시마다 혹시 모를 변경 체크 (선택)

    const gradeInfo = GRADE_INFO[userGrade] || GRADE_INFO.SILVER;
    const gradeColor = (userGrade === 'GOLD' || userGrade === 'VIP' || userGrade === 'VVIP')
        ? 'text-[#D97706]' : 'text-[#7C3AED]';
    const gradeLabel = gradeInfo.label;
    const gradeEmoji = GRADE_EMOJI[userGrade] || '🤍';

    const handleLogout = async () => {
        try {
            await logoutUser(); // Supabase signOut() 완료까지 대기
        } catch (error) {
            console.error('[Layout] Logout failed:', error);
        } finally {
            window.location.href = '/'; // 성공/실패 관계없이 메인으로
        }
    };

    return (
        <div className="min-h-screen flex overflow-x-hidden w-full max-w-[100vw]" style={{ backgroundColor: 'var(--moca-bg)' }}>

            {/* ── PC 사이드바 (lg 이상) ── */}
            <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r border-[#E8E0FA] fixed left-0 top-0 z-50 shadow-moca">
                {/* 로고 & 유저 */}
                <div className="px-6 py-7 border-b border-[#E8E0FA] flex flex-col items-center text-center">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-4xl font-black tracking-tighter pb-1">MOCA</span>
                    <p className="text-[10px] text-[#9CA3AF] mt-1 font-bold uppercase tracking-widest mb-4">아임모델 에이전시</p>
                    {userId && (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#F3E8FF] border border-[#E8E0FA] w-full justify-center">
                            <span className="text-[14px]">{gradeEmoji}</span>
                            <span className={`font-black text-[11px] ${gradeColor}`}>{gradeLabel}</span>
                            <span className="text-[#1F1235] font-bold text-[11px]">{userId}님</span>
                        </div>
                    )}
                </div>

                {/* 사이드 메뉴 */}
                <nav className="flex-1 px-3 py-4 overflow-y-auto hide-scrollbar">
                    {navGroups.map((group, idx) => (
                        <div key={group.title} className={idx > 0 ? 'mt-5' : ''}>
                            <h3 className="px-3 text-[10px] font-black text-[#9333EA] tracking-widest mb-2 uppercase flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">{group.icon}</span>
                                {group.title}
                            </h3>
                            <div className="space-y-0.5">
                                {group.items.map(({ to, icon, label }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        end={to === '/home/dashboard'}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all
                                            ${isActive
                                                ? 'bg-[#F3E8FF] text-[#7C3AED] shadow-sm'
                                                : 'text-[#5B4E7A] hover:bg-[#F8F5FF] hover:text-[#7C3AED]'
                                            }`
                                        }
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                                        {label}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* 하단 로그아웃 */}
                <div className="px-6 py-5 border-t border-[#E8E0FA] flex flex-col gap-3">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-[#9CA3AF] hover:text-[#9333EA] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        <span className="text-xs font-bold tracking-widest">로그아웃</span>
                    </button>
                    <p className="text-[10px] text-[#9CA3AF] tracking-widest uppercase">© 2026 I'M MODEL</p>
                </div>
            </aside>

            {/* ── 메인 콘텐츠 ── */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen relative w-full max-w-full overflow-x-hidden">

                {/* ── 모바일 탑 헤더 ── */}
                <header className="lg:hidden flex items-center justify-between px-5 pb-3 bg-white border-b border-[#E8E0FA] z-[100] sticky top-0 w-full shadow-sm" style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-2xl font-black tracking-tighter">MOCA</span>
                    <div className="flex items-center gap-2">
                        {userId && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#F3E8FF] border border-[#E8E0FA]">
                            <span className="text-[13px]">{gradeEmoji}</span>
                            <span className={`font-black text-[10px] tracking-wide ${gradeColor}`}>{gradeLabel}</span>
                            <span className="text-[#1F1235] font-bold text-[11px]">{userId}님</span>
                        </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#F8F5FF] hover:bg-[#F3E8FF] border border-[#E8E0FA] rounded-full transition-all"
                        >
                            <span className="text-[10px] font-bold text-[#9CA3AF] whitespace-nowrap">로그아웃</span>
                            <span className="material-symbols-outlined text-[13px] text-[#9CA3AF]">logout</span>
                        </button>
                    </div>
                </header>

                {/* ── 콘텐츠 + 푸터 ── */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-28 lg:pb-8 w-full max-w-[430px] lg:max-w-none mx-auto lg:px-0 bg-[#F3F0FF]">
                    <div className="w-full lg:max-w-5xl lg:mx-auto">
                        <Outlet />
                    </div>

                    {/* ── Footer ── */}
                    <footer className="w-full border-t border-[#E8E0FA] bg-[#F8F5FF] px-6 py-10 mt-8">
                        <div className="w-full flex flex-col items-center text-center space-y-5">
                            {/* 정책 링크 */}
                            <div className="flex items-center justify-center gap-4 flex-wrap">
                                <a href="/privacy" className="text-[#5B4E7A] text-xs font-bold hover:text-[#9333EA] transition-colors">개인정보처리방침</a>
                                <span className="text-[#C8C0E0] text-xs">|</span>
                                <a href="/terms" className="text-[#5B4E7A] text-xs font-bold hover:text-[#9333EA] transition-colors">서비스 이용약관</a>
                            </div>
                            {/* 회사명 */}
                            <p className="text-[#1F1235] text-sm font-black">글로벌 아임</p>
                            {/* 회사 정보 */}
                            <div className="text-[#9CA3AF] text-[11px] leading-7">
                                <p>대표 : 김대희 | 사업자등록번호 : 365-22-00947</p>
                                <p>통신판매업 신고번호 : 제2021-서울강남-05756호</p>
                                <p>주소 : 서울시 영등포구 영중로 159, 7층 글로벌 아임</p>
                                <p>이메일 : immodelkr@gmail.com</p>
                                <p>호스팅서비스 : Vercel Inc.</p>
                            </div>
                            {/* 저작권 */}
                            <p className="text-[#9CA3AF] text-[11px] pt-1">
                                © 2026 글로벌 아임(IMMOCA). All rights reserved.
                            </p>
                        </div>
                    </footer>
                </main>

                {/* ── 모바일 5탭 하단 내비게이션 ── */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-[#E8E0FA] shadow-moca-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                    <div className="flex items-center justify-around h-16 max-w-[430px] mx-auto px-2">
                        {/* 4개 주요 탭 */}
                        {bottomTabs.map(({ to, icon, label }) => {
                            const isActive = location.pathname === to || location.pathname.startsWith(to + '/') && to !== '/home/dashboard'
                                || (to === '/home/dashboard' && location.pathname === '/home/dashboard');
                            return (
                                <NavLink
                                    key={to}
                                    to={to}
                                    className="flex flex-col items-center gap-0.5 flex-1 py-2 transition-all active:scale-95"
                                    onClick={() => setShowMoreMenu(false)}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <span className={`material-symbols-outlined text-[26px] transition-all duration-300 ${isActive ? 'fill-1 text-[#9333EA] drop-shadow-md scale-110' : 'text-[#9CA3AF]'}`}>
                                                {icon}
                                            </span>
                                            <span className={`text-[10px] font-black transition-all ${isActive ? 'text-[#9333EA]' : 'text-[#9CA3AF]'}`}>
                                                {label}
                                            </span>
                                        </>
                                    )}
                                </NavLink>
                            );
                        })}

                        {/* 더보기 탭 */}
                        <button
                            className="flex flex-col items-center gap-0.5 flex-1 py-2 transition-all active:scale-95"
                            onClick={() => setShowMoreMenu(prev => !prev)}
                        >
                            <span className={`material-symbols-outlined text-[26px] transition-all duration-300 ${showMoreMenu ? 'text-[#9333EA] drop-shadow-md scale-110' : 'text-[#9CA3AF]'}`}>
                                more_horiz
                            </span>
                            <span className={`text-[10px] font-black transition-all ${showMoreMenu ? 'text-[#9333EA]' : 'text-[#9CA3AF]'}`}>
                                더보기
                            </span>
                        </button>
                    </div>
                </nav>

                {/* ── 더보기 슬라이드업 패널 ── */}
                {showMoreMenu && (
                    <>
                        {/* 딤 배경 */}
                        <div
                            className="lg:hidden fixed inset-0 z-[99] bg-black/20 backdrop-blur-sm transition-opacity"
                            onClick={() => setShowMoreMenu(false)}
                        />
                        {/* 패널 */}
                        <div className="lg:hidden fixed left-0 right-0 z-[100] bg-[#F8F5FF] border-t border-[#E8E0FA] rounded-t-[32px] shadow-2xl max-h-[75vh] overflow-y-auto transition-transform" style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))', paddingBottom: '16px' }}>
                            <div className="sticky top-0 bg-[#F8F5FF] z-10 pt-3 pb-2 flex flex-col items-center">
                                <div className="w-12 h-1.5 bg-[#D1C5EC] rounded-full mb-3" />
                                <p className="text-center text-[11px] font-black text-[#7C3AED] uppercase tracking-widest">전체 메뉴</p>
                            </div>
                            <div className="grid grid-cols-4 gap-2 px-4 pb-6 mt-2">
                                {moreMenuItems.map(({ to, icon, label }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        onClick={() => setShowMoreMenu(false)}
                                        className={({ isActive }) =>
                                            `flex flex-col items-center gap-1.5 py-3 px-1 rounded-[20px] transition-all text-center
                                            ${isActive
                                                ? 'bg-gradient-to-b from-[#F3E8FF] to-white border border-[#C084FC]/40 text-[#7C3AED] shadow-sm scale-95'
                                                : 'bg-white border border-transparent text-[#5B4E7A] hover:bg-[#F3E8FF] hover:border-[#E8E0FA] active:scale-95'
                                            }`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-[#9333EA]/10' : 'bg-[#F3F0FF]'}`}>
                                                    <span className={`material-symbols-outlined text-[22px] ${isActive ? 'fill-1 text-[#9333EA]' : 'text-[#7C3AED]'}`}>{icon}</span>
                                                </div>
                                                <span className="text-[10px] font-black leading-tight break-keep">{label}</span>
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </div>
                            {/* 로그아웃 */}
                            <div className="border-t border-[#E8E0FA]/50 mx-5 pt-4 pb-4">
                                <button
                                    onClick={() => { setShowMoreMenu(false); handleLogout(); }}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-[#E8E0FA] text-[#9CA3AF] font-bold text-sm hover:bg-[#FFF] hover:text-[#EF4444] hover:border-[#FCA5A5] transition-all active:scale-95 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-[18px]">logout</span>
                                    로그아웃
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Layout;
