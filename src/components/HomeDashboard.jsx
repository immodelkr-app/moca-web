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

    const [notices, setNotices] = useState([]);

    useEffect(() => {
        syncUserGrade().then(() => {
            setGrade(getUserGrade() || 'SILVER');
        });

        fetchMessagesList().then(data => {
            if (data && data.length > 0) {
                setNotices(data.slice(0, 2));
                setTicker(data[0]?.title || data[0]?.content?.slice(0, 40) || '');
            }
        }).catch(() => { });
    }, []);

    return (
        <div className="min-h-screen flex flex-col pb-24" style={{ backgroundColor: 'var(--moca-bg, #F3F0FF)' }}>

            {/* ── 1. 상단 메인 헤더 (MOCA 브랜드 + 아바타 프로필 & 알림 종) ── */}
            <header className="flex items-center justify-between px-6 pt-7 pb-4">
                <h1 className="text-3xl moca-brand-logo tracking-tight leading-none text-[#1F1235]">
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

            {/* ── 3. 주요 공지사항 (옵션 A: 미니 카드형 최근 공지 2개) ── */}
            <div className="px-6 mb-7">
                <div className="bg-white border border-[#E8E0FA] rounded-2xl p-4.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-3 border-b border-[#F3E8FF] pb-2.5">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED] text-[11px] font-black flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">campaign</span>
                                MOCA 공지사항
                            </span>
                        </div>
                        <button
                            onClick={() => navigate('/home/message')}
                            className="text-[11px] font-bold text-[#8B5CF6] hover:text-[#7C3AED] flex items-center gap-0.5 active:scale-95 transition-transform"
                        >
                            전체보기
                            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        {notices.length > 0 ? (
                            notices.map((n, idx) => (
                                <div
                                    key={n.id || idx}
                                    onClick={() => navigate('/home/message')}
                                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F8F5FF] cursor-pointer transition-colors active:scale-[0.99]"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] flex-shrink-0" />
                                    <p className="text-xs font-bold text-[#1F1235] truncate flex-1 leading-snug">
                                        {n.title || n.content}
                                    </p>
                                    <span className="text-[10px] font-bold text-[#9CA3AF] flex-shrink-0">
                                        {n.created_at ? new Date(n.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : 'NEW'}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <>
                                <div
                                    onClick={() => navigate('/home/message')}
                                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F8F5FF] cursor-pointer transition-colors active:scale-[0.99]"
                                >
                                    <span className="w-2 h-2 rounded-full bg-[#8B5CF6] flex-shrink-0" />
                                    <p className="text-xs font-bold text-[#1F1235] truncate flex-1 leading-snug">
                                        📢 [안내] 프로필 관리 PPT 마이박스 및 구글드라이브 공유 방법
                                    </p>
                                    <span className="text-[10px] font-bold text-[#7C3AED] bg-[#EDE9FE] px-1.5 py-0.5 rounded-md flex-shrink-0">
                                        필독
                                    </span>
                                </div>
                                <div
                                    onClick={() => navigate('/home/message')}
                                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-[#F8F5FF] cursor-pointer transition-colors active:scale-[0.99]"
                                >
                                    <span className="w-2 h-2 rounded-full bg-[#C084FC] flex-shrink-0" />
                                    <p className="text-xs font-bold text-[#5B4E7A] truncate flex-1 leading-snug">
                                        🎬 2026 S/S 브랜드 광고모델 오디션 수시 지원 공지
                                    </p>
                                    <span className="text-[10px] font-bold text-[#64748B] flex-shrink-0">
                                        NEW
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
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
                            광고전문<br />에이전시 확인
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
                            에이전시에<br />프로필 발송
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


