import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAgencies } from '../services/agencyService';
import { getUser, getUserGrade, GRADE_INFO, GRADE_EMOJI } from '../services/userService';

import { fetchMessagesList } from '../services/messageService';
import {
    getCastingSends,
    saveCastingSend,
    sendCastingEmail,
    getMonthlyCount,
    getSendInfo,
    SILVER_MONTHLY_LIMIT,
} from '../services/castingService';

import ProfileEditModal from './ProfileEditModal';
import CastingEmailModal from './CastingEmailModal';
import VisitMemoModal from './VisitMemoModal';
import AgencyDetailModal from './AgencyDetailModal';




const AgencyCard = ({ agency, index, onAction, onSend, onDetail, sendInfo }) => {
    const naverMapsUrl = `https://map.naver.com/v5/search/${encodeURIComponent(agency.address || agency.name)}`;

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
        <div
            onClick={() => onDetail(agency)}
            className={`relative rounded-2xl border ${color.border} bg-white p-5 flex flex-col gap-4 hover:scale-[1.01] hover:shadow-md transition-all duration-200 overflow-hidden shadow-sm cursor-pointer group`}
        >
            {/* Number badge */}
            <div className={`absolute top-4 right-4 w-7 h-7 rounded-full ${color.dot} flex items-center justify-center`}>
                <span className="text-white text-[11px] font-black">{index + 1}</span>
            </div>

            {/* Header */}
            <div className="flex items-start gap-3 pr-8">
                <div className={`w-10 h-10 rounded-xl ${color.dot}/15 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform mt-0.5`}>
                    <span className={`material-symbols-outlined text-[20px] ${color.accent}`}>apartment</span>
                </div>
                <div className="flex-1 min-w-0">
                    {/* Line 1: Name + Category Tag */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-[#1F1235] leading-tight group-hover:text-[#7C3AED] transition-colors">{agency.name}</h3>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#F3E8FF] ${color.accent}`}>
                            {agency.category || 'MODEL'}
                        </span>
                    </div>

                    {/* Line 2: Status Badges Row (Visit record + Online reservation status) */}
                    {(timeAgoStr || agency.reservation_url || agency.booking_url) && (
                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                            {timeAgoStr && (
                                <span className="text-[#7C3AED] text-[10px] font-bold bg-[#F3E8FF] py-0.5 px-2.5 rounded-full border border-[#E8E0FA] whitespace-nowrap flex items-center gap-1">
                                    <span>🕒</span>
                                    <span>{timeAgoStr}</span>
                                </span>
                            )}
                            {(agency.reservation_url || agency.booking_url) && (
                                <span className={`text-[10px] font-bold py-0.5 px-2.5 rounded-full border whitespace-nowrap flex items-center gap-1 ${
                                    (agency.reservation_url || agency.booking_url).includes('kakao')
                                        ? 'bg-yellow-50 text-amber-900 border-yellow-200'
                                        : 'bg-[#F5F0FF] text-[#8B5CF6] border-[#E9D5FF]'
                                }`}>
                                    <span className="material-symbols-outlined text-[12px]">
                                        {(agency.reservation_url || agency.booking_url).includes('kakao') ? 'chat' : 'language'}
                                    </span>
                                    <span>{(agency.reservation_url || agency.booking_url).includes('kakao') ? '카카오채널' : '온라인예약'}</span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 text-xs text-[#5B4E7A] leading-relaxed">
                <span className="material-symbols-outlined text-[15px] text-[#9CA3AF] mt-0.5 flex-shrink-0">location_on</span>
                <p className="font-medium">{agency.address}</p>
            </div>

            {/* Phone */}
            {agency.phone && (
                <div className="flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-[15px] text-[#9CA3AF] flex-shrink-0">call</span>
                    <span className={`font-bold ${color.accent}`}>{agency.phone}</span>
                </div>
            )}

            {/* Email (Gold Members Only) */}
            {userGrade === 'GOLD' && agency.email && (
                <div className="flex items-center gap-2 text-xs">
                    <span className="material-symbols-outlined text-[15px] text-[#9CA3AF] flex-shrink-0">mail</span>
                    <span className={`font-bold ${color.accent}`}>{agency.email}</span>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
                {(agency.reservation_url || agency.booking_url) && (
                    <a
                        href={agency.reservation_url || agency.booking_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => onAction(e, agency, agency.reservation_url || agency.booking_url)}
                        className={`flex-1 flex items-center justify-center gap-1 py-2.5 px-2 rounded-full shadow-sm active:scale-[0.97] transition-all cursor-pointer font-black text-[12px] leading-none whitespace-nowrap ${
                            (agency.reservation_url || agency.booking_url).includes('kakao')
                                ? 'bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] shadow-yellow-400/20'
                                : 'bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-purple-400/20'
                        }`}
                    >
                        <span className="material-symbols-outlined text-[14px] shrink-0 -mr-0.5">
                            {(agency.reservation_url || agency.booking_url).includes('kakao') ? 'chat' : 'language'}
                        </span>
                        <span>
                            {(agency.reservation_url || agency.booking_url).includes('kakao') ? '카카오채널' : '온라인예약'}
                        </span>
                    </a>
                )}
                <a
                    href={naverMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => onAction(e, agency, naverMapsUrl)}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 px-2 rounded-full bg-[#F5F0FF] border border-[#E8E0FA] hover:bg-[#EDE5FF] transition-colors cursor-pointer font-black text-[12px] leading-none whitespace-nowrap"
                >
                    <span className="text-[12px] font-black text-[#03C75A] shrink-0">N</span>
                    <span className="text-[#5B4E7A]">지도</span>
                </a>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAction(e, agency, null);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-2.5 px-2 rounded-full bg-[#10B981] hover:bg-[#059669] text-white shadow-md shadow-emerald-500/20 active:scale-[0.97] transition-all cursor-pointer font-black text-[12px] leading-none whitespace-nowrap"
                >
                    <span className="material-symbols-outlined text-[14px] shrink-0 -mr-0.5">edit_note</span>
                    <span>투어일지</span>
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
    const [detailModalAgency, setDetailModalAgency] = useState(null);
    const [memoModalAgency, setMemoModalAgency] = useState(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [sendHistory, setSendHistory] = useState([]);
    const [toast, setToast] = useState(null); // { message, type: 'success'|'error'|'info' }
    const [castingModal, setCastingModal] = useState(null); // { agency }
    const [sending, setSending] = useState(false);

    const user = getUser();
    const userId = user?.nickname || user?.name || 'guest';
    const grade = getUserGrade();




    const [recentMessages, setRecentMessages] = useState([]);
    const [tickerIndex, setTickerIndex] = useState(0);
    const [tickerVisible, setTickerVisible] = useState(true);
    const [activeTab, setActiveTab] = useState('MODEL_SUPPORT'); // 'MODEL_SUPPORT' | 'MOCA_SHOPPING'


    useEffect(() => {
        getCastingSends(userId).then(setSendHistory).catch(() => { });
    }, [userId]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const isUnlimited = grade === 'GOLD' || grade === 'IMODEL' || grade === 'VIP';

    const handleSend = async (agency) => {
        if (sending) return;



        const currentUser = getUser();
        if (!currentUser?.portfolio_link) {
            showToast('먼저 스마트 프로필을 등록해주세요!', 'info');
            setTimeout(() => navigate('/home/smart-profile'), 1200);
            return;
        }

        const monthCount = getMonthlyCount(sendHistory);
        if (!isUnlimited && monthCount >= SILVER_MONTHLY_LIMIT) {
            showToast(`이번달 프로필 발송(${SILVER_MONTHLY_LIMIT}회)을 모두 사용했습니다. GOLD 등급으로 무제한 발송!`, 'error');
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
                console.error('[프로필발송 실패]', { agencyName: agency.name, error });
                // 서버가 보내주는 구체적인 에러 메시지를 우선 표시
                showToast(error || '발송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
                return;
            }

            // 발송 기록 저장
            const record = await saveCastingSend(userId, agency.name);
            
            // 상태 업데이트 (함수형 업데이트 사용으로 최신 상태 보장)
            setSendHistory(prev => {
                const filtered = prev.filter(s => s.agencyName !== agency.name);
                const updated = [...filtered, record];
                
                // 남은 횟수 계산 (메시지 표시용)
                const monthCount = getMonthlyCount(updated);
                const remaining = isUnlimited ? '무제한' : `${SILVER_MONTHLY_LIMIT - monthCount}회 남음`;
                
                showToast(`✅ ${agency.name}에 프로필을 발송했습니다! (이번달 ${remaining})`, 'success');
                return updated;
            });

            setCastingModal(null);
        } catch (err) {
            console.error('[프로필발송 예외]', err);
            // 디테일한 에러 메시지가 있으면 표시, 없으면 공백 포함된 정확한 문구 표시
            const msg = err?.message || '발송 중 오류가 발생했습니다. 다시 시도해 주세요.';
            showToast(msg, 'error');
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
        if (!url) {
            setMemoModalAgency(agency);
        }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{backgroundColor:'var(--moca-bg)',color:'var(--moca-text)'}}>

            {/* User Status Badge (Top Right) */}


            {/* Header */}
            <div className="relative z-10 px-5 lg:px-10 pt-14 pb-4 max-w-7xl mx-auto w-full">
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
                        <span className="text-sm">{GRADE_EMOJI[grade] || '🤍'}</span>
                        <span className="text-[#7C3AED] text-xs font-bold">{GRADE_INFO[grade]?.label || 'SILVER'}</span>
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
                    <div className="relative z-10 px-6 py-5 flex items-center justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                            <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm mb-3">
                                <span className="text-[10px] font-black text-white uppercase tracking-wider">아임모카 공지</span>
                            </div>
                            {/* 롤링 티커 */}
                            {recentMessages.length > 0 ? (
                                <div className="overflow-hidden min-h-[60px] flex items-center pb-1">
                                    <p
                                        key={tickerIndex}
                                        className="text-white font-black text-lg sm:text-xl leading-snug line-clamp-2 transition-all duration-300"
                                        style={{ opacity: tickerVisible ? 1 : 0, transform: tickerVisible ? 'translateY(0)' : 'translateY(-8px)' }}
                                    >
                                        {recentMessages[tickerIndex]?.title}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-white font-black text-lg sm:text-xl leading-snug">생생한 꿀팁 &amp; 시크릿 공지</p>
                            )}
                            <p className="text-white/80 text-xs mt-2 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/70 animate-pulse"></span>
                                최신 {recentMessages.length}개 공지 · 탭하여 전체 보기
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:bg-white group-hover:text-[#5B21B6] text-white transition-colors shadow-lg flex-shrink-0">
                            <span className="material-symbols-outlined text-[20px] ml-0.5">arrow_forward</span>
                        </div>
                    </div>
                </div>



                {/* Search bar (Pill style) */}
                <div className="relative max-w-2xl">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-[#8B5CF6]">search</span>
                    <input
                        type="text"
                        placeholder="에이전시 이름 또는 주소 검색..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-11 pr-10 py-3 rounded-full bg-white border border-[#E8E0FA] text-[#1F1235] text-xs sm:text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/10 transition-all font-semibold shadow-2xs"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                            <span className="material-symbols-outlined text-[16px]">close</span>
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
                ) : (() => {
                    // 실버 회원: 최대 6개 노출 / 골드·VIP: 전체 노출
                    const SILVER_AGENCY_LIMIT = 6;
                    const visibleAgencies = isUnlimited ? filtered : filtered.slice(0, SILVER_AGENCY_LIMIT);
                    const hiddenCount = isUnlimited ? 0 : Math.max(0, filtered.length - SILVER_AGENCY_LIMIT);
                    // 검색 중엔 검색 결과 전체를 보여줌 (필터 결과가 6 이하이면 제한 없음)
                    const isSearching = search.trim().length > 0;
                    const displayAgencies = isSearching ? filtered : visibleAgencies;
                    const showPaywall = !isUnlimited && !isSearching && hiddenCount > 0;

                    return (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {displayAgencies.map((agency, i) => (
                                    <AgencyCard
                                        key={i}
                                        agency={agency}
                                        index={i}
                                        onAction={handleActionClick}
                                        onSend={handleSend}
                                        onDetail={(agency) => setDetailModalAgency(agency)}
                                        sendInfo={getSendInfo(sendHistory, agency.name)}
                                    />
                                ))}
                            </div>

                            {/* 실버 회원 페이월 — 골드 업그레이드 유도 */}
                            {showPaywall && (
                                <div className="mt-6 relative rounded-[32px] overflow-hidden border border-[#FFD700]/30 shadow-xl shadow-[#F9A825]/10">
                                    {/* 블러 배경 */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#FFF9E6] via-[#FFFDE7] to-[#FFF3CD]" />
                                    <div className="absolute inset-0 backdrop-blur-[2px]" />

                                    {/* 자물쇠 장식 */}
                                    <div className="absolute -right-6 -top-6 text-[#FFD700]/10 pointer-events-none">
                                        <span className="material-symbols-outlined text-[120px]">lock</span>
                                    </div>

                                    <div className="relative z-10 px-6 py-8 flex flex-col items-center text-center gap-5">
                                        {/* 아이콘 */}
                                        <div className="w-16 h-16 rounded-2xl bg-[#FFD700]/15 border border-[#FFD700]/30 flex items-center justify-center shadow-inner">
                                            <span className="text-3xl">👑</span>
                                        </div>

                                        {/* 텍스트 */}
                                        <div>
                                            <p className="text-[#1F1235] font-black text-lg leading-tight mb-1.5">
                                                GOLD 등급 전용 에이전시
                                            </p>
                                            <p className="text-[#7C3AED] font-black text-2xl mb-1">
                                                +{hiddenCount}곳 더 있어요
                                            </p>
                                            <p className="text-[#9CA3AF] text-sm font-bold">
                                                실버 회원은 상위 {SILVER_AGENCY_LIMIT}개 에이전시까지 열람 가능합니다
                                            </p>
                                        </div>

                                        {/* 혜택 요약 */}
                                        <div className="w-full max-w-xs flex flex-col gap-2">
                                            {[
                                                { icon: 'apartment', text: `전체 ${agencies.length}개 에이전시 열람` },
                                                { icon: 'forward_to_inbox', text: '프로필 월 무제한 발송' },
                                                { icon: 'mail', text: '에이전시 이메일 주소 공개' },
                                                { icon: 'edit_note', text: '투어일지 무제한 작성' },
                                            ].map((item) => (
                                                <div key={item.text} className="flex items-center gap-3 px-4 py-2.5 bg-white/70 rounded-xl border border-[#FFD700]/20">
                                                    <span className="material-symbols-outlined text-[16px] text-[#F9A825]">{item.icon}</span>
                                                    <span className="text-[#1F1235] text-sm font-bold">{item.text}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* CTA 버튼 */}
                                        <button
                                            onClick={() => navigate('/upgrade')}
                                            className="w-full max-w-xs py-4 rounded-[20px] bg-gradient-to-r from-[#FFD700] to-[#F9A825] text-[#1F1235] font-black text-base shadow-lg shadow-[#FFD700]/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            GOLD 등급 업그레이드
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>



            {/* 에이전시 상세 모달 */}
            {detailModalAgency && (
                <AgencyDetailModal
                    agency={detailModalAgency}
                    sendInfo={getSendInfo(sendHistory, detailModalAgency.name)}
                    onClose={() => setDetailModalAgency(null)}
                    onWriteMemo={(agency) => setMemoModalAgency(agency)}
                    onSendProfile={(agency) => handleSend(agency)}
                />
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

            {/* 투어일지 (방문 일지) 모달 */}
            {memoModalAgency && (
                <VisitMemoModal
                    agency={memoModalAgency}
                    onClose={() => setMemoModalAgency(null)}
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


        </div >
    );
};

export default AgencyDirectory;
