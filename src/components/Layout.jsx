import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { logoutUser, getUser, GRADE_INFO, GRADE_EMOJI } from '../services/userService';

/* ── 환불 정책 모달 (A-Plan 색상 적용) ── */
const RefundPolicyModal = ({ onClose }) => (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white border border-[#E8E0FA] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-moca-lg" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#E8E0FA] px-5 py-4 flex items-center justify-between">
                <h2 className="text-[#1F1235] font-black text-base">교환 · 반품 · 취소 · 환불 정책</h2>
                <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#1F1235] transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div className="px-5 py-5 space-y-5 text-xs text-[#5B4E7A] leading-relaxed">
                <div>
                    <p className="text-blue-600 font-bold mb-2">🚫 결제 취소</p>
                    <ul className="space-y-1.5 list-none">
                        <li>① 배송 시작 전(배송 준비 전)까지 100% 전액 취소 가능합니다.</li>
                        <li>② 이용약관 신청 후 회사로부터 상담이 미제공된 경우 취소 가능합니다.</li>
                        <li>③ 취소 신청: immodelkr@gmail.com (주문번호 포함)</li>
                    </ul>
                </div>
                <hr className="border-[#E8E0FA]" />
                <div>
                    <p className="text-emerald-600 font-bold mb-2">🔄 반품 · 교환</p>
                    <ul className="space-y-1.5 list-none">
                        <li>① 상품 수령 후 <strong className="text-[#1F1235]">3일 이내</strong> 반품·교환 신청 가능</li>
                        <li>② 단순 변심: 미개봉·미사용 상태 한정, 왕복 배송비 고객 부담</li>
                        <li>③ 상품 하자·오배송: 3일 이내 사진 첨부 접수 시 배송비 회사 부담으로 교환·환불</li>
                        <li>④ 개봉 후 사용 상품은 단순 변심 반품 불가</li>
                    </ul>
                </div>
                <hr className="border-[#E8E0FA]" />
                <div>
                    <p className="text-yellow-600 font-bold mb-2">💰 환불 정책</p>
                    <p className="text-[#9CA3AF] text-[11px] font-bold mb-1">📦 실물 상품</p>
                    <ul className="space-y-1 mb-3 list-none">
                        <li>① 배송 전 취소: 100% 전액 환불</li>
                        <li>② 수령 후 3일 이내·미사용: 환불 가능 (왕복 배송비 고객 부담)</li>
                        <li>③ 상품 하자·오배송: 수령 후 3일 이내 100% 환불</li>
                    </ul>
                    <p className="text-[#9CA3AF] text-[11px] font-bold mb-1">👑 멤버십 구독</p>
                    <ul className="space-y-1 list-none">
                        <li>① 정기결제: 이용일수 제외 일할 계산 환불 (결제 후 24시간 이후 ~ 15일까지)</li>
                        <li>② 연간결제: 전체 연간금액 ÷ 12 × 잔여개월 기준 환불</li>
                        <li>③ 프로필카드 2회 이상 수령 시 위약금 10% 제외 후 부분 환불</li>
                        <li>④ 회사 귀책사유(오류·서비스 중단): 전액 환불</li>
                    </ul>
                </div>
                <hr className="border-[#E8E0FA]" />
                <div>
                    <p className="text-red-500 font-bold mb-2">🚫 환불 불가 항목</p>
                    <ul className="space-y-1 list-none">
                        <li>• 멤버십 결제 후 7일 초과</li>
                        <li>• 상품 수령 후 3일 초과</li>
                        <li>• 콘텐츠 다운로드·실질 이용 후</li>
                        <li>• 고객 사용·훼손으로 가치 감소</li>
                        <li>• 개봉 후 사용 상품의 단순 변심</li>
                    </ul>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mt-2">
                    <p className="text-orange-600 font-bold">📞 문의: immodelkr@gmail.com</p>
                    <p className="text-[#9CA3AF] mt-1">주문번호, 결제일자, 사유를 포함해 주세요. (영업일 1~2일 내 답변)</p>
                </div>
            </div>
        </div>
    </div>
);

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
            { to: '/home/calendar', icon: 'calendar_month', label: '투어 캘린더' },
            { to: '/home/diary', icon: 'event_note', label: '투어일지' },
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
        ]
    },
    {
        title: '혜택 & 쇼핑',
        icon: 'diamond',
        items: [
            { to: '/home/membership', icon: 'star', label: '멤버십 카드' },
            { to: '/upgrade', icon: 'workspace_premium', label: '멤버십 구독' },
            { to: '/home/coupons', icon: 'local_activity', label: '모델 쿠폰' },
            { to: '/home/content', icon: 'shopping_bag', label: '제휴혜택' },
            { to: '/home/shop', icon: 'local_fire_department', label: '모카 에디트' },
            { to: '/home/benefits', icon: 'diamond', label: '혜택 허브' },
        ]
    },
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
    { to: '/home/smart-profile', icon: 'forward_to_inbox', label: '프로필' },
    { to: '/home/benefits', icon: 'diamond', label: '혜택' },
];

/* ── 더보기 메뉴 항목 ── */
const moreMenuItems = [
    { to: '/home/calendar',   icon: 'calendar_month',       label: '투어 캘린더' },
    { to: '/home/diary',      icon: 'event_note',           label: '투어일지' },
    { to: '/home/cert',       icon: 'photo_camera',         label: '투어스타그램' },
    { to: '/home/tv',         icon: 'smart_display',        label: '모카TV' },
    { to: '/home/message',    icon: 'local_post_office',    label: '공지사항' },
    { to: '/home/lounge',     icon: 'forum',                label: '모카 라운지' },
    { to: '/home/class',      icon: 'school',               label: '모카 클래스' },
    { to: '/home/membership', icon: 'star',                 label: '멤버십 카드' },
    { to: '/upgrade',         icon: 'workspace_premium',    label: '멤버십 구독' },
    { to: '/home/coupons',    icon: 'local_activity',       label: '모델 쿠폰' },
    { to: '/home/content',    icon: 'shopping_bag',         label: '제휴혜택' },
    { to: '/home/shop',       icon: 'local_fire_department',label: '모카 에디트' },
];

const Layout = () => {
    const [showRefundPolicy, setShowRefundPolicy] = useState(false);
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

    const handleLogout = () => {
        logoutUser();
        navigate('/');
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
                <header className="lg:hidden flex items-center justify-between px-5 pt-5 pb-3 bg-white border-b border-[#E8E0FA] z-[100] sticky top-0 w-full shadow-sm">
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
                <main className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar pb-28 lg:pb-8 w-full max-w-[430px] mx-auto">
                    <Outlet />

                    {/* ── Footer ── */}
                    <footer className="w-full border-t border-[#E8E0FA] bg-[#F8F5FF] px-6 py-10 mt-8">
                        <div className="w-full flex flex-col items-center text-center space-y-5">
                            {/* 정책 링크 */}
                            <div className="flex items-center justify-center gap-4 flex-wrap">
                                <a href="/privacy" className="text-[#5B4E7A] text-xs font-bold hover:text-[#9333EA] transition-colors">개인정보처리방침</a>
                                <span className="text-[#C8C0E0] text-xs">|</span>
                                <a href="/terms" className="text-[#5B4E7A] text-xs font-bold hover:text-[#9333EA] transition-colors">서비스 이용약관</a>
                                <span className="text-[#C8C0E0] text-xs">|</span>
                                <button onClick={() => setShowRefundPolicy(true)} className="text-orange-500 text-xs font-bold hover:text-orange-600 transition-colors">교환·반품·환불 정책</button>
                            </div>
                            {showRefundPolicy && <RefundPolicyModal onClose={() => setShowRefundPolicy(false)} />}
                            {/* 회사명 */}
                            <p className="text-[#1F1235] text-sm font-black">글로벌아임</p>
                            {/* 회사 정보 */}
                            <div className="text-[#9CA3AF] text-[11px] leading-7">
                                <p>대표 : 김대희 | 사업자등록번호 : 365-22-00947</p>
                                <p>통신판매업 신고번호 : 제2021-서울강남-05756호</p>
                                <p>주소 : 서울시 영등포구 영중로 159, 7층 글로벌아임</p>
                                <p>이메일 : immodelkr@gmail.com</p>
                                <p>호스팅서비스 : Vercel Inc.</p>
                            </div>
                            {/* 저작권 */}
                            <p className="text-[#9CA3AF] text-[11px] pt-1">
                                © 2026 글로벌아임(IMMOCA). All rights reserved.
                            </p>
                        </div>
                    </footer>
                </main>

                {/* ── 모바일 5탭 하단 내비게이션 ── */}
                <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-[#E8E0FA] shadow-moca-lg pb-[env(safe-area-inset-bottom,0)]">
                    <div className="flex items-center justify-around h-16 max-w-[430px] mx-auto px-2">
                        {/* 4개 주요 탭 */}
                        {bottomTabs.map(({ to, icon, label }) => {
                            const isActive = location.pathname === to || location.pathname.startsWith(to + '/') && to !== '/home/dashboard'
                                || (to === '/home/dashboard' && location.pathname === '/home/dashboard');
                            return (
                                <NavLink
                                    key={to}
                                    to={to}
                                    className="flex flex-col items-center gap-0.5 flex-1 py-2 transition-all"
                                    onClick={() => setShowMoreMenu(false)}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <span className={`material-symbols-outlined text-[26px] transition-all ${isActive ? 'fill-1 text-[#9333EA]' : 'text-[#9CA3AF]'}`}>
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
                            className="flex flex-col items-center gap-0.5 flex-1 py-2 transition-all"
                            onClick={() => setShowMoreMenu(prev => !prev)}
                        >
                            <span className={`material-symbols-outlined text-[26px] transition-all ${showMoreMenu ? 'text-[#9333EA]' : 'text-[#9CA3AF]'}`}>
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
                            className="lg:hidden fixed inset-0 z-[99] bg-black/20 backdrop-blur-sm"
                            onClick={() => setShowMoreMenu(false)}
                        />
                        {/* 패널 */}
                        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-[100] bg-white border-t border-[#E8E0FA] rounded-t-3xl shadow-moca-lg max-h-[65vh] overflow-y-auto pb-[env(safe-area-inset-bottom,16px)]">
                            <div className="w-10 h-1 bg-[#E8E0FA] rounded-full mx-auto mt-3 mb-4" />
                            <p className="text-center text-[11px] font-black text-[#9CA3AF] uppercase tracking-widest mb-4">전체 메뉴</p>
                            <div className="grid grid-cols-3 gap-3 px-5 pb-6">
                                {moreMenuItems.map(({ to, icon, label }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        onClick={() => setShowMoreMenu(false)}
                                        className={({ isActive }) =>
                                            `flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border transition-all text-center
                                            ${isActive
                                                ? 'bg-[#F3E8FF] border-[#9333EA]/30 text-[#7C3AED]'
                                                : 'bg-[#F8F5FF] border-[#E8E0FA] text-[#5B4E7A] hover:bg-[#F3E8FF] hover:text-[#9333EA]'
                                            }`
                                        }
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <span className={`material-symbols-outlined text-[24px] ${isActive ? 'fill-1' : ''}`}>{icon}</span>
                                                <span className="text-[10px] font-black leading-tight">{label}</span>
                                            </>
                                        )}
                                    </NavLink>
                                ))}
                            </div>
                            {/* 로그아웃 */}
                            <div className="border-t border-[#E8E0FA] mx-5 pt-4 pb-6">
                                <button
                                    onClick={() => { setShowMoreMenu(false); handleLogout(); }}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] text-[#9CA3AF] font-bold text-sm hover:bg-[#F3E8FF] hover:text-[#9333EA] transition-all"
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
