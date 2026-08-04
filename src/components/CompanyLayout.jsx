import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logoutUser, getUser } from '../services/userService';

/**
 * 업체 계정 전용 경량 레이아웃 (모델용 Layout과 분리)
 * - 하단 5탭 등 모델 전용 내비게이션 없음
 */
const CompanyLayout = () => {
    const navigate = useNavigate();
    const user = getUser();

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch (error) {
            console.error('[CompanyLayout] Logout failed:', error);
        } finally {
            window.location.href = '/';
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--moca-bg)' }}>
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E8E0FA] px-5 py-3.5 flex items-center justify-between" style={{ paddingTop: 'calc(0.85rem + env(safe-area-inset-top, 0px))' }}>
                <div className="flex items-center gap-2.5">
                    <span className="text-2xl moca-brand-logo text-[#1F1235] tracking-tight">MOCA</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#7C3AED] text-[10px] font-black tracking-wider">BUSINESS</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[#5B4E7A] text-xs font-bold hidden sm:inline">{user?.name || user?.nickname}님</span>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1 px-3 py-1.5 bg-[#F8F5FF] hover:bg-[#F3E8FF] border border-[#E8E0FA] rounded-full transition-all active:scale-95"
                    >
                        <span className="text-[11px] font-bold text-[#7C3AED]">로그아웃</span>
                    </button>
                </div>
            </header>

            <nav className="bg-white border-b border-[#E8E0FA] px-5 flex items-center gap-1">
                {[
                    { to: '/company/castings', label: '내 모델캐스팅' },
                ].map(({ to, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                            `px-4 py-3 text-sm font-black border-b-2 transition-all ${
                                isActive ? 'border-[#9333EA] text-[#9333EA]' : 'border-transparent text-[#9CA3AF] hover:text-[#7C3AED]'
                            }`
                        }
                    >
                        {label}
                    </NavLink>
                ))}
            </nav>

            <main className="flex-1 w-full max-w-2xl mx-auto px-5 py-6">
                <Outlet />
            </main>
        </div>
    );
};

export default CompanyLayout;
