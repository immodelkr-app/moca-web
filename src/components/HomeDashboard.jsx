import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getUserGrade, syncUserGrade } from '../services/userService';
import { fetchMessagesList } from '../services/messageService';
import ProfileEditModal from './ProfileEditModal';

const TOUR_ITEMS = [
    { icon: 'event_note', label: '투어일지', route: '/home/diary', color: 'text-[#8B5CF6]', bgLight: 'bg-[#F3E8FF]' },
    { icon: 'manage_accounts', label: '프로필 관리', route: '/home/smart-profile', color: 'text-[#8B5CF6]', bgLight: 'bg-[#F3E8FF]' },
    { icon: 'calendar_month', label: '투어 캘린더', route: '/home/calendar', color: 'text-[#8B5CF6]', bgLight: 'bg-[#F3E8FF]' },
    { icon: 'forum', label: 'Q&A 게시판', route: '/home/qna', color: 'text-[#8B5CF6]', bgLight: 'bg-[#F3E8FF]' },
];

const COMMUNITY_ITEMS = [
    { icon: 'school', label: '모카 클래스', route: '/home/class', color: 'text-[#6D28D9]', bgLight: 'bg-[#EDE9FE]' },
    { icon: 'photo_camera', label: '투어 인증샷', route: '/home/cert', color: 'text-[#6D28D9]', bgLight: 'bg-[#EDE9FE]' },
    { icon: 'smart_display', label: '모카TV', route: '/home/tv', color: 'text-[#6D28D9]', bgLight: 'bg-[#EDE9FE]' },
    { icon: 'workspace_premium', label: '등급 신청하기', route: '/upgrade', color: 'text-[#D97706]', bgLight: 'bg-[#FEF3C7]' },
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

    return (
        <div className="min-h-screen flex flex-col pb-24" style={{ backgroundColor: 'var(--moca-bg, #F3F0FF)' }}>

            {/* ── 1. 상단 메인 헤더 (MOCA 브랜드 + 아바타 프로필 & 알림 종) ── */}
            <header className="flex items-center justify-between px-6 pt-7 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-[#1F1235] font-serif">
                    MOCA
                </h1>

                <div className="flex items-center gap-3">
                    {/* 아바타 프로필 버튼 */}
                    <button
                        onClick={() => setIsProfileModalOpen(true)}
                        className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm flex items-center justify-center bg-[#DDD6FE] text-[#6D28D9] font-bold text-sm active:scale-95 transition-transform"
                    >
                        {user?.profile_image ? (
                            <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span>{nickname.slice(0, 1)}</span>
                        )}
                    </button>

                    {/* 알림 종 버튼 */}
                    <button
                        onClick={() => navigate('/home/message')}
                        className="w-9 h-9 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center active:scale-95 transition-transform relative"
                    >
                        <span className="material-symbols-outlined text-[20px]">notifications</span>
                        {ticker && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#EF4444]"></span>}
                    </button>
                </div>
            </header>

            {/* ── 2. 웰컴 타이틀 영역 ── */}
            <section className="px-6 pt-2 pb-4">
                <h2 className="text-2xl font-black text-[#1F1235] tracking-tight mb-1">
                    안녕하세요, {nickname}님!
                </h2>
                <p className="text-sm font-medium text-[#64748B]">
                    오늘도 MOCA와 함께 멋진 하루 보내세요!
                </p>
            </section>

            {/* ── 3. 공지사항 알림 캡슐 바 ── */}
            <div className="px-6 mb-6">
                <div
                    onClick={() => navigate('/home/message')}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#EDE9FE]/70 border border-[#DDD6FE] text-[#6D28D9] shadow-2xs cursor-pointer active:scale-[0.99] transition-all"
                >
                    <div className="w-7 h-7 rounded-full bg-[#C4B5FD] text-[#5B21B6] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[16px]">campaign</span>
                    </div>
                    <p className="text-xs font-bold text-[#5B21B6] flex-1 truncate">
                        {ticker ? `공지: ${ticker}` : '공지: 2024 S/S 오디션 지원 마감일 (~5.31)'}
                    </p>
                    <span className="material-symbols-outlined text-[#8B5CF6] text-[16px]">chevron_right</span>
                </div>
            </div>

            {/* ── 4. 메인 2열 그리드 CTA 카드 (시안 목업 100% 대치) ── */}
            <div className="px-6 mb-8">
                <div className="grid grid-cols-2 gap-4">

                    {/* 카드 1: 에이전시 리스트 */}
                    <button
                        onClick={() => navigate('/agencies')}
                        className="flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-[#F3E8FF] via-[#E9D5FF] to-[#D8B4FE] border border-white/60 shadow-sm active:scale-95 transition-all text-center group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white/70 backdrop-blur-md flex items-center justify-center shadow-inner mb-4 group-hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-[#7C3AED] text-[34px]">folder_managed</span>
                        </div>
                        <h3 className="text-lg font-black text-[#1F1235] mb-1">
                            에이전시 리스트
                        </h3>
                        <p className="text-[11px] font-bold text-[#6D28D9]/80 leading-tight">
                            등록된 모델 &amp;<br />에이전시 확인
                        </p>
                    </button>

                    {/* 카드 2: 프로필 메일발송 */}
                    <button
                        onClick={() => navigate('/home/smart-profile')}
                        className="flex flex-col items-center justify-center p-6 rounded-3xl bg-gradient-to-b from-[#F3E8FF] via-[#E9D5FF] to-[#D8B4FE] border border-white/60 shadow-sm active:scale-95 transition-all text-center group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-white/70 backdrop-blur-md flex items-center justify-center shadow-inner mb-4 group-hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-[#7C3AED] text-[34px]">mark_email_read</span>
                        </div>
                        <h3 className="text-lg font-black text-[#1F1235] mb-1">
                            프로필 메일발송
                        </h3>
                        <p className="text-[11px] font-bold text-[#6D28D9]/80 leading-tight">
                            클라이언트에게<br />바로 발송
                        </p>
                    </button>

                </div>
            </div>

            {/* ── 5. 모델 투어 관리 (정갈한 소프트 파스텔 카드) ── */}
            <div className="px-6 mb-6">
                <h3 className="text-[#1F1235] font-extrabold text-sm mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#8B5CF6] text-[18px]">explore</span>
                    모델 투어 관리
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {TOUR_ITEMS.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.route)}
                            className="flex items-center gap-3 p-3.5 bg-white border border-[#E8E0FA] rounded-2xl shadow-2xs hover:border-[#8B5CF6]/40 active:scale-95 transition-all text-left"
                        >
                            <div className={`w-10 h-10 rounded-xl ${item.bgLight} flex items-center justify-center flex-shrink-0`}>
                                <span className={`material-symbols-outlined text-[20px] ${item.color}`}>{item.icon}</span>
                            </div>
                            <span className="text-[#1F1235] font-bold text-xs leading-snug">{item.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── 6. 커뮤니티 & 활동 ── */}
            <div className="px-6 mb-6">
                <h3 className="text-[#1F1235] font-extrabold text-sm mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#8B5CF6] text-[18px]">diversity_3</span>
                    커뮤니티 &amp; 활동
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    {COMMUNITY_ITEMS.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.route)}
                            className="flex items-center gap-3 p-3.5 bg-white border border-[#E8E0FA] rounded-2xl shadow-2xs hover:border-[#8B5CF6]/40 active:scale-95 transition-all text-left"
                        >
                            <div className={`w-10 h-10 rounded-xl ${item.bgLight} flex items-center justify-center flex-shrink-0`}>
                                <span className={`material-symbols-outlined text-[20px] ${item.color}`}>{item.icon}</span>
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


