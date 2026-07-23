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

    const [noticesList, setNoticesList] = useState([
        '📢 [필독] 프로필 관리 PPT 마이박스 & 구글 공유 설정 방법',
        '🎬 [오디션] 2026 S/S 브랜드 광고모델 수시 지원 채용 공지',
        '💡 [꿀팁] 에이전시 피드백 채팅을 통한 프로필 합격률 높이기',
    ]);
    const [noticeIdx, setNoticeIdx] = useState(0);
    const [ticker, setTicker] = useState('');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    useEffect(() => {
        syncUserGrade().then(() => {
            setGrade(getUserGrade() || 'SILVER');
        });

        fetchMessagesList().then(data => {
            if (data && data.length > 0) {
                const titles = data.map(d => d.title || d.content?.slice(0, 45)).filter(Boolean);
                if (titles.length > 0) {
                    setNoticesList(titles);
                    setTicker(titles[0]);
                }
            }
        }).catch(() => { });
    }, []);

    // 공지 롤링 타이머 (3.5초마다 슬라이딩 전환)
    useEffect(() => {
        if (noticesList.length <= 1) return;
        const timer = setInterval(() => {
            setNoticeIdx(prev => (prev + 1) % noticesList.length);
        }, 3500);
        return () => clearInterval(timer);
    }, [noticesList]);

    return (
        <div className="min-h-screen flex flex-col pb-24" style={{ backgroundColor: 'var(--moca-bg, #F3F0FF)' }}>

            {/* ── 1. 웰컴 타이틀 & 프로필/알림 헤더 (중복 MOCA 로고 제거) ── */}
            <section className="px-6 pt-6 pb-3 flex items-start justify-between">
                <div>
                    <h2 className="text-2xl tracking-tight mb-1 flex items-baseline">
                        <span className="font-serif italic font-bold text-[#8B5CF6] text-2.5xl mr-1.5">Hello,</span>
                        <span className="font-black text-[#1F1235]">{nickname}모델님!</span>
                    </h2>
                    <p className="text-sm font-medium text-[#64748B]">
                        오늘도 MOCA와 함께 멋진 하루 보내세요!
                    </p>
                </div>

                <div className="flex items-center gap-2.5 pt-0.5">
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
            </section>

            {/* ── 3. 옵션 B: 확대된 소프트 캡슐 공지바 (자동 롤링 애니메이션) ── */}
            <div className="px-6 mb-6">
                <div
                    onClick={() => navigate('/home/message')}
                    className="flex items-center gap-3 pl-5 pr-4 py-3.5 rounded-full bg-white/95 border border-[#DDD6FE] text-[#6D28D9] shadow-2xs cursor-pointer active:scale-[0.99] transition-all overflow-hidden"
                >
                    <div className="w-7.5 h-7.5 rounded-full bg-[#EDE9FE] text-[#7C3AED] flex items-center justify-center flex-shrink-0 shadow-2xs ml-0.5">
                        <span className="material-symbols-outlined text-[17px]">campaign</span>
                    </div>

                    <div className="flex-1 h-5 overflow-hidden relative">
                        <div
                            className="transition-transform duration-500 ease-in-out"
                            style={{ transform: `translateY(-${noticeIdx * 20}px)` }}
                        >
                            {noticesList.map((item, i) => (
                                <p key={i} className="h-5 text-xs font-black text-[#1F1235] truncate flex items-center gap-1.5 leading-none">
                                    <span className="px-1.5 py-0.5 rounded bg-[#EDE9FE] text-[#7C3AED] text-[10px] font-black flex-shrink-0">공지</span>
                                    <span className="truncate">{item}</span>
                                </p>
                            ))}
                        </div>
                    </div>

                    <span className="material-symbols-outlined text-[#8B5CF6] text-[18px] flex-shrink-0 mr-0.5">chevron_right</span>
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


