import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAgencies } from '../services/agencyService';
import { getUser, getUserGrade } from '../services/userService';

import { fetchMessagesList } from '../services/messageService';
import {
    getCastingSends,
    saveCastingSend,
    sendCastingEmail,
    getMonthlyCount,
    getSendInfo,
    SILVER_MONTHLY_LIMIT,
} from '../services/castingService';
import VisitMemoModal from './VisitMemoModal';
import ProfileEditModal from './ProfileEditModal';
import AgencyMap from './AgencyMap';
import CastingEmailModal from './CastingEmailModal';
import SilverLimitModal from './SilverLimitModal';

// ── 실버 멤버 하루 8회 / 3일 쿨다운 로직 ──────────────────────────
const SILVER_DAILY_LIMIT = 8;
const SILVER_BLOCK_DAYS = 3;
const silverKey = (userId) => `silver_daily_limit_${userId}`;

const getSilverStatus = (userId) => {
    try {
        const raw = localStorage.getItem(silverKey(userId));
        if (!raw) return { blocked: false, count: 0, daysLeft: 0 };
        const data = JSON.parse(raw);

        if (data.blockedUntil) {
            const blockedUntil = new Date(data.blockedUntil);
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            if (now < blockedUntil) {
                const daysLeft = Math.ceil((blockedUntil - now) / (1000 * 60 * 60 * 24));
                return { blocked: true, count: data.count || 0, daysLeft };
            }
        }

        const today = new Date().toLocaleDateString('ko-KR');
        if (data.date === today) return { blocked: false, count: data.count || 0, daysLeft: 0 };
        return { blocked: false, count: 0, daysLeft: 0 };
    } catch {
        return { blocked: false, count: 0, daysLeft: 0 };
    }
};

const incrementSilverCount = (userId) => {
    const today = new Date().toLocaleDateString('ko-KR');
    const status = getSilverStatus(userId);
    const newCount = status.count + 1;
    const data = { date: today, count: newCount };

    if (newCount >= SILVER_DAILY_LIMIT) {
        const blockedUntil = new Date();
        blockedUntil.setDate(blockedUntil.getDate() + SILVER_BLOCK_DAYS);
        blockedUntil.setHours(0, 0, 0, 0);
        data.blockedUntil = blockedUntil.toISOString();
    }

    localStorage.setItem(silverKey(userId), JSON.stringify(data));
    return { newCount, hitLimit: newCount >= SILVER_DAILY_LIMIT };
};

const AgencyCard = ({ agency, index, onAction, onSend, sendInfo }) => {
    const naverMapsUrl = `https://map.naver.com/v5/search/${encodeURIComponent(agency.address || agency.name)}`;
    const kakaoMapsUrl = `https://map.kakao.com/link/map/${agency.name},${agency.lat},${agency.lng}`;

    const colors = [
        { bg: 'from-[#6C63FF]/10 to-[#A78BFA]/5', border: 'border-[#6C63FF]/20', accent: 'text-[#818CF8]', dot: 'bg-[#6C63FF]' },
        { bg: 'from-[#EC4899]/10 to-[#F472B6]/5', border: 'border-[#EC4899]/20', accent: 'text-[#F472B6]', dot: 'bg-[#EC4899]' },
        { bg: 'from-[#14B8A6]/10 to-[#2DD4BF]/5', border: 'border-[#14B8A6]/20', accent: 'text-[#2DD4BF]', dot: 'bg-[#14B8A6]' },
        { bg: 'from-[#F59E0B]/10 to-[#FCD34D]/5', border: 'border-[#F59E0B]/20', accent: 'text-[#FCD34D]', dot: 'bg-[#F59E0B]' },
        { bg: 'from-[#3B82F6]/10 to-[#60A5FA]/5', border: 'border-[#3B82F6]/20', accent: 'text-[#60A5FA]', dot: 'bg-[#3B82F6]' },
    ];
    const color = colors[index % colors.length];

    // Read memo date
    let timeAgoStr = '';
    try {
        const memosRaw = localStorage.getItem(`agency_memo_${agency.name}`);
        if (memosRaw) {
            const memos = JSON.parse(memosRaw);
            if (memos.length > 0) {
                const newest = memos.reduce((latest, current) => {
                    return new Date(current.date) > new Date(latest.date) ? current : latest;
                });
                const recentMemoDate = new Date(newest.date);
                const today = new Date();

                // Set the time part to 0 for exact day diff calculation
                recentMemoDate.setHours(0, 0, 0, 0);
                const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

                const diffTime = todayDate - recentMemoDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const diffMonths = (todayDate.getFullYear() - recentMemoDate.getFullYear()) * 12 + (todayDate.getMonth() - recentMemoDate.getMonth());

                if (diffMonths >= 1) {
                    timeAgoStr = `${diffMonths}개월 전 방문`;
                } else if (diffDays > 0) {
                    timeAgoStr = `${diffDays}일 전 방문`;
                } else if (diffDays === 0) {
                    timeAgoStr = '오늘 방문';
                }
            }
        }
    } catch (e) {
        // Ignore
    }

    // Define user grade inside the card
    const userGrade = getUserGrade();

    return (
        <div className={`relative rounded-2xl border ${color.border} bg-white p-5 flex flex-col gap-4 hover:scale-[1.01] hover:shadow-md transition-all duration-200 overflow-hidden shadow-sm`}>
            {/* Number badge */}
            <div className={`absolute top-4 right-4 w-7 h-7 rounded-full ${color.dot} flex items-center justify-center`}>
                <span className="text-white text-[11px] font-black">{index + 1}</span>
            </div>

            {/* Header */}
            <div className="flex items-start gap-3 pr-8">
                <div className={`w-10 h-10 rounded-xl ${color.dot}/20 flex items-center justify-center flex-shrink-0`}>
                    <span className={`material-symbols-outlined text-[20px] ${color.accent}`}>apartment</span>
                </div>
                <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="font-black text-base text-[#1F1235] leading-tight">{agency.name}</h3>
                        {timeAgoStr && (
                            <span className="text-white/85 text-xs font-semibold bg-white/10 py-0.5 px-2 rounded-md border border-white/15 whitespace-nowrap">
                                🕒 {timeAgoStr}
                            </span>
                        )}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${color.accent}`}>{agency.category}</span>
                </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[16px] text-[#9CA3AF] mt-0.5 flex-shrink-0">location_on</span>
                <p className="text-[#1F1235] text-sm leading-relaxed">{agency.address}</p>
            </div>

            {/* Phone */}
            {agency.phone && (
                <a href={`tel:${agency.phone}`} className="flex items-center gap-2.5 group">
                    <span className="material-symbols-outlined text-[16px] text-[#9CA3AF] flex-shrink-0">call</span>
                    <span className={`text-sm font-bold ${color.accent} group-hover:underline`}>{agency.phone}</span>
                </a>
            )}

            {/* Email (Gold Members Only) */}
            {userGrade === 'GOLD' && agency.email && (
                <a href={`mailto:${agency.email}`} className="flex items-center gap-2.5 group">
                    <span className="material-symbols-outlined text-[16px] text-[#9CA3AF] flex-shrink-0">mail</span>
                    <span className={`text-sm font-bold ${color.accent} group-hover:underline`}>{agency.email}</span>
                </a>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 mt-1">
                <div className="flex gap-2">
                    <a
                        href={naverMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => onAction(e, agency, naverMapsUrl)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F8F5FF] border border-[#E8E0FA] hover:bg-[#EDE8FF] transition-colors cursor-pointer"
                    >
                        <span className="text-[13px] font-black text-[#03C75A]">N</span>
                        <span className="text-[#5B4E7A] text-[11px] font-bold">네이버 지도</span>
                    </a>
                    <a
                        href={kakaoMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => onAction(e, agency, kakaoMapsUrl)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#F8F5FF] border border-[#E8E0FA] hover:bg-[#EDE8FF] transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-[16px] text-yellow-400">map</span>
                        <span className="text-[#5B4E7A] text-[11px] font-bold">카카오 지도</span>
                    </a>
                </div>
                <button
                    onClick={(e) => onAction(e, agency, null)}
                    className="w-full flex items-center justify-center gap-2 py-3 mt-1 rounded-xl bg-[#6C63FF]/15 hover:bg-[#6C63FF]/25 border border-[#9B8AFB]/35 transition-colors cursor-pointer text-[#9B8AFB] font-bold text-[13px]"
                >
                    <span className="material-symbols-outlined text-[18px]">edit_note</span>
                    에이전시 투어 일지
                </button>
                {/* 이력서 쏘기 버튼 */}
                <button
                    onClick={() => onSend(agency)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all cursor-pointer font-bold text-[13px] active:scale-[0.97] bg-[#10B981]/10 hover:bg-[#10B981]/20 border-[#10B981]/30 text-[#34D399]"
                >
                    <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                    프로필발송
                </button>
            </div>
        </div>
    );
};


const AgencyDirectory = () => {
    const navigate = useNavigate();
    const [agencies, setAgencies] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedAgency, setSelectedAgency] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [sendHistory, setSendHistory] = useState([]);
    const [toast, setToast] = useState(null); // { message, type: 'success'|'error'|'info' }
    const [castingModal, setCastingModal] = useState(null); // { agency }
    const [sending, setSending] = useState(false);

    const user = getUser();
    const userId = user?.nickname || user?.name || 'guest';
    const grade = getUserGrade();


    const GRADE_EMOJI = {
        'SILVER': '🤍',
        'GOLD': '👑',
        'VIP': '💎'
    };

    const [recentMessages, setRecentMessages] = useState([]);
    const [tickerIndex, setTickerIndex] = useState(0);
    const [tickerVisible, setTickerVisible] = useState(true);
    const [activeTab, setActiveTab] = useState('MODEL_SUPPORT'); // 'MODEL_SUPPORT' | 'MOCA_SHOPPING'
    const [silverLimitModal, setSilverLimitModal] = useState(null); // { isAlreadyBlocked, daysLeft }

    useEffect(() => {
        getCastingSends(userId).then(setSendHistory).catch(() => { });
    }, [userId]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const handleSend = async (agency) => {
        if (sending) return;

        // 실버 멤버 하루 한도 체크
        if (grade !== 'GOLD') {
            const status = getSilverStatus(userId);
            if (status.blocked) {
                setSilverLimitModal({ isAlreadyBlocked: true, daysLeft: status.daysLeft });
                return;
            }
            const { hitLimit } = incrementSilverCount(userId);
            if (hitLimit) {
                setSilverLimitModal({ isAlreadyBlocked: false, daysLeft: SILVER_BLOCK_DAYS });
                return;
            }
        }

        const currentUser = getUser();
        if (!currentUser?.portfolio_link) {
            showToast('먼저 스마트 프로필을 등록해주세요!', 'info');
            setTimeout(() => navigate('/home/smart-profile'), 1200);
            return;
        }

        const monthCount = getMonthlyCount(sendHistory);
        if (grade !== 'GOLD' && monthCount >= SILVER_MONTHLY_LIMIT) {
            showToast(`이번 달 무료 발송(${SILVER_MONTHLY_LIMIT}회)을 모두 사용했습니다. 골드 멤버십으로 무제한 발송!`, 'error');
            setTimeout(() => navigate('/upgrade'), 1800);
            return;
        }

        // 에이전시 이메일 있으면 바로 발송, 없으면 입력 모달
        if (agency.email) {
            await executeSend(agency, agency.email);
        } else {
            setCastingModal({ agency });
        }
    };

    const executeSend = async (agency, agencyEmail) => {
        setSending(true);
        const currentUser = getUser();

        try {
            const { success, error } = await sendCastingEmail({
                modelData: currentUser,
                agencyName: agency.name,
                agencyEmail,
                currentPhotoUrls: [],  // 현재모습 사진 미첨부
            });

            if (!success) {
                console.error('[프로필발송 오류]', error);
                showToast(error || '발송 중 오류가 발생했습니다.', 'error');
                return;
            }

            // 발송 기록 저장
            const record = await saveCastingSend(userId, agency.name);
            setSendHistory(prev => [...prev.filter(s => s.agencyName !== agency.name), record]);

            const newHistory = [...sendHistory.filter(s => s.agencyName !== agency.name), record];
            const remaining = grade === 'GOLD'
                ? '무제한'
                : `${SILVER_MONTHLY_LIMIT - getMonthlyCount(newHistory)}회 남음`;

            showToast(`✅ ${agency.name}에 프로필을 발송했습니다! (이번 달 ${remaining})`, 'success');
            setCastingModal(null);
        } catch (err) {
            console.error('[프로필발송 예외]', err);
            showToast('발송 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
        } finally {
            setSending(false);
        }
    };

    useEffect(() => {
        fetchAgencies().then(data => {
            setAgencies(data.filter(a => a.name && a.address));
            setLoading(false);
        }).catch(() => setLoading(false));

        fetchMessagesList().then(data => {
            if (data && data.length > 0) setRecentMessages(data.slice(0, 3));
        }).catch(() => { });
    }, []);

    // 티커 자동 롤링 (3초마다 제목 교체, fade 효과)
    useEffect(() => {
        if (recentMessages.length < 2) return;
        const interval = setInterval(() => {
            setTickerVisible(false);
            setTimeout(() => {
                setTickerIndex(prev => (prev + 1) % recentMessages.length);
                setTickerVisible(true);
            }, 350);
        }, 3000);
        return () => clearInterval(interval);
    }, [recentMessages]);

    const filtered = agencies.filter(a =>
        a.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.address?.toLowerCase().includes(search.toLowerCase())
    );

    const handleActionClick = (e, agency, url) => {
        const currentGrade = getUserGrade();

        // GOLD 모카는 무제한 패스
        if (currentGrade === 'GOLD') {
            if (!url) setSelectedAgency(agency);
            return;
        }

        // 실버 멤버 하루 한도 체크
        const status = getSilverStatus(userId);
        if (status.blocked) {
            e.preventDefault();
            setSilverLimitModal({ isAlreadyBlocked: true, daysLeft: status.daysLeft });
            return;
        }

        const { hitLimit } = incrementSilverCount(userId);
        if (hitLimit) {
            e.preventDefault();
            setSilverLimitModal({ isAlreadyBlocked: false, daysLeft: SILVER_BLOCK_DAYS });
            return;
        }

        if (!url) {
            setSelectedAgency(agency);
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{backgroundColor:'var(--moca-bg)',color:'var(--moca-text)'}}>

            {/* User Status Badge (Top Right) */}


            {/* Header */}
            <div className="relative z-10 px-5 lg:px-10 pt-8 pb-4 max-w-7xl mx-auto w-full">
                {/* Title row with grade badge */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#6C63FF] to-[#A78BFA]" />
                        <div>
                            <h1 className="text-xl lg:text-2xl font-black text-[#1F1235] tracking-tight">에이전시 리스트</h1>
                            <p className="text-[#9CA3AF] text-xs mt-0.5">총 {agencies.length}개 에이전시 등록됨</p>
                        </div>
                    </div>
                    {/* Grade Badge */}
                    <div className="flex items-center gap-1.5 bg-[#F3E8FF] border border-[#E8E0FA] rounded-full px-3 py-1.5">
                        <span className="text-sm">{GRADE_EMOJI[grade] || '🌱'}</span>
                        <span className="text-[#7C3AED] text-xs font-bold">{grade || 'BASIC'}</span>
                    </div>
                </div>

                {/* Hero Banner — 아임모카 공지 CTA */}
                <div
                    onClick={() => navigate('/home/message')}
                    className="relative w-full rounded-[32px] overflow-hidden mb-6 cursor-pointer group shadow-lg shadow-[#9333EA]/10 border border-[#E8E0FA]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-[#9333EA] via-[#A855F7] to-[#C084FC] opacity-95" />
                    <div className="absolute -right-8 -top-8 text-white/10 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                        <span className="material-symbols-outlined text-[140px]">campaign</span>
                    </div>
                    <div className="relative z-10 px-5 py-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-1.5 mb-2">
                                <span className="material-symbols-outlined text-white text-[16px]">local_police</span>
                                <span className="text-xs font-black text-white/80 tracking-widest uppercase">아임모카 공지</span>
                            </div>
                            {/* 롤링 티커 */}
                            {recentMessages.length > 0 ? (
                                <div className="overflow-hidden h-[44px]">
                                    <p
                                        key={tickerIndex}
                                        className="text-white font-black text-[15px] leading-snug line-clamp-2 transition-all duration-300"
                                        style={{ opacity: tickerVisible ? 1 : 0, transform: tickerVisible ? 'translateY(0)' : 'translateY(-8px)' }}
                                    >
                                        {recentMessages[tickerIndex]?.title}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-white font-black text-[15px] leading-tight">생생한 꿀팁 &amp; 시크릿 공지</p>
                            )}
                            <p className="text-white/60 text-[10px] mt-1.5 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse"></span>
                                최신 {recentMessages.length}개 공지 · 탭하여 전체 보기
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:bg-white group-hover:text-[#5B21B6] text-white transition-colors shadow-lg flex-shrink-0">
                            <span className="material-symbols-outlined text-[20px] ml-0.5">arrow_forward</span>
                        </div>
                    </div>
                </div>

                {/* 이력서 발송 현황 배너 */}
                {grade !== 'GOLD' && (
                    <div
                        className="flex items-center gap-4 px-6 py-4 rounded-3xl bg-white border border-[#E8E0FA] mb-6 cursor-pointer hover:bg-[#F8F5FF] transition-all shadow-sm group"
                        onClick={() => navigate('/home/smart-profile')}
                    >
                        <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-[24px] text-[#10B981]">forward_to_inbox</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[#1F1235] font-black text-[15px]">
                                이번 달 이력서 발송: <span className="text-[#10B981]">{getMonthlyCount(sendHistory)}</span>/{SILVER_MONTHLY_LIMIT}회 사용
                            </p>
                            <p className="text-[#9CA3AF] text-[12px] mt-0.5 font-bold">골드 멤버십 → 무제한 · 탭하여 내 프로필 설정</p>
                        </div>
                        <span className="material-symbols-outlined text-[20px] text-[#E8E0FA] group-hover:text-[#9333EA] transition-colors">chevron_right</span>
                    </div>
                )}

                {/* Search bar */}
                <div className="relative max-w-2xl">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-[#9CA3AF]">search</span>
                    <input
                        type="text"
                        placeholder="에이전시 이름 또는 주소 검색..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-[#E8E0FA] text-[#1F1235] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA]/50 focus:ring-2 focus:ring-[#9333EA]/10 transition-all font-medium shadow-sm"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Cards Grid — 반응형: 모바일 1열 / 태블릿 2열 / PC 3열 */}
            <div className="relative z-10 flex-1 px-5 lg:px-10 pb-10 max-w-7xl mx-auto w-full">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                        <p className="text-white/30 text-sm">불러오는 중...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <span className="material-symbols-outlined text-[48px] text-white/20">search_off</span>
                        <p className="text-white/30 text-sm">검색 결과가 없습니다</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map((agency, i) => (
                            <AgencyCard
                                key={i}
                                agency={agency}
                                index={i}
                                onAction={handleActionClick}
                                onSend={handleSend}
                                sendInfo={getSendInfo(sendHistory, agency.name)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* 전체 에이전시 지도 (하단) */}
            {!loading && agencies.length > 0 && (
                <AgencyMap agencies={agencies} />
            )}

            {/* 에이전시 이메일 직접 입력 모달 */}
            {castingModal && (
                <CastingEmailModal
                    agency={castingModal.agency}
                    sending={sending}
                    onConfirm={(email) => executeSend(castingModal.agency, email)}
                    onClose={() => setCastingModal(null)}
                />
            )}

            {/* Toast 알림 */}
            {toast && (
                <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-[320px] w-[90%] border transition-all ${toast.type === 'success'
                    ? 'bg-white border-emerald-300'
                    : toast.type === 'error'
                        ? 'bg-white border-red-300'
                        : 'bg-white border-[#E8E0FA]'
                    }`}>
                    <span className={`material-symbols-outlined text-[20px] flex-shrink-0 ${toast.type === 'success' ? 'text-emerald-500' : toast.type === 'error' ? 'text-red-500' : 'text-[#9333EA]'}`}>
                        {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
                    </span>
                    <p className="text-[#1F1235] text-sm font-bold leading-snug">{toast.message}</p>
                </div>
            )}

            {/* Visit Memo Modal */}
            {
                selectedAgency && (
                    <VisitMemoModal
                        agency={selectedAgency}
                        onClose={() => setSelectedAgency(null)}
                    />
                )
            }

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

            {/* 실버 멤버 한도 도달 모달 */}
            {silverLimitModal && (
                <SilverLimitModal
                    isAlreadyBlocked={silverLimitModal.isAlreadyBlocked}
                    daysLeft={silverLimitModal.daysLeft}
                    onClose={() => setSilverLimitModal(null)}
                />
            )}
        </div >
    );
};

export default AgencyDirectory;
