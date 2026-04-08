import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';

// 카카오 플러스채널 링크
const KAKAO_CHANNEL_URL = 'http://pf.kakao.com/_zlMUxj/chat';

const PLANS = [
    { id: 'gold_1m',  months: 1,  price: 10000,  label: '1개월',  monthly: 10000, popular: false },
    { id: 'gold_3m',  months: 3,  price: 30000,  label: '3개월',  monthly: 10000, popular: false },
    { id: 'gold_6m',  months: 6,  price: 50000,  label: '6개월',  monthly: 8333,  popular: true,  discountPct: 17 },
    { id: 'gold_12m', months: 12, price: 100000, label: '12개월', monthly: 8333,  popular: false, discountPct: 17 },
];

// ── 등급별 혜택 비교 데이터 ──────────────────────────────────────────────────
const FEATURES = [
    { name: '에이전시 조회', silver: '하루 8회', gold: '무제한', icon: 'search' },
    { name: '프로필 등록 & 이메일 발송', silver: true, gold: true, icon: 'forward_to_inbox' },
    { name: '현재모습 사진등록', silver: false, gold: true, icon: 'photo_library' },
    { name: '디지털 멤버십 카드', silver: true, gold: true, icon: 'badge' },
    { name: '모카라운지 · 모카TV', silver: true, gold: true, icon: 'live_tv' },
    { name: '투어 다이어리', silver: true, gold: true, icon: 'auto_stories' },
    { name: '우선 캐스팅 노출', silver: false, gold: true, icon: 'star' },
    { name: '전용 쿠폰 혜택', silver: false, gold: true, icon: 'confirmation_number' },
];

const UpgradePage = () => {
    const navigate = useNavigate();
    const user = getUser();
    const userGrade = user?.grade || 'SILVER';
    const isAlreadyGold = ['GOLD', 'VIP', 'VVIP'].includes(userGrade);

    const [selectedPlan, setSelectedPlan] = useState(PLANS[2]); // 6개월 기본 선택
    const [activeTab, setActiveTab] = useState('compare'); // compare | plans

    // ── 카카오 채널로 신청하기 ────────────────────────────────────────────────
    const handleApply = () => {
        // 선택된 플랜 정보를 카카오 채팅으로 자연스럽게 전달할 수 있도록 안내
        const message = encodeURIComponent(
            `안녕하세요! MOCA 앱에서 GOLD 멤버십 신청합니다.\n선택 플랜: ${selectedPlan.label} (${selectedPlan.price.toLocaleString()}원)`
        );
        // 카카오 플러스친구 채팅 오픈
        window.open(KAKAO_CHANNEL_URL, '_blank');
    };

    return (
        <div className="min-h-screen pb-32 bg-[#F8F5FF]">

            {/* ── 헤더 ── */}
            <div className="relative z-10 px-5 pt-8 pb-2 flex items-center gap-3">
                <button onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-[#F3E8FF] border border-[#E8E0FA] flex items-center justify-center hover:bg-[#EDE8FF] transition-colors flex-shrink-0">
                    <span className="material-symbols-outlined text-[20px] text-[#7C3AED]">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-xl font-black text-[#1F1235] tracking-tight">광고모델 활동 신청</h1>
                    <p className="text-[#9CA3AF] text-xs mt-0.5">GOLD 멤버십으로 광고모델 활동을 시작하세요</p>
                </div>
            </div>

            <div className="relative z-10 px-5 space-y-5">

                {/* ── 현재 등급 배너 ── */}
                <div className={`rounded-2xl p-4 border flex items-center gap-3 ${isAlreadyGold
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-white border-[#E8E0FA]'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAlreadyGold ? 'bg-[#F59E0B]/20' : 'bg-white/10'}`}>
                        <span className="text-xl">{isAlreadyGold ? '👑' : '🤍'}</span>
                    </div>
                    <div>
                        <p className={`text-sm font-black ${isAlreadyGold ? 'text-amber-600' : 'text-[#5B4E7A]'}`}>
                            현재 등급: {userGrade === 'VIP' ? '전속모델' : userGrade}
                        </p>
                        <p className="text-[#9CA3AF] text-xs">
                            {isAlreadyGold ? 'GOLD 멤버십 이용 중입니다 👍' : '지금 신청하면 무제한 에이전시 조회!'}
                        </p>
                    </div>
                </div>

                {/* ── 탭 전환 ── */}
                <div className="flex gap-2 bg-[#F3E8FF] border border-[#E8E0FA] rounded-2xl p-1">
                    {[
                        { id: 'compare', label: '등급별 혜택 비교', icon: 'compare' },
                        { id: 'plans', label: '구독 플랜 신청', icon: 'workspace_premium' },
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab.id
                                    ? 'bg-[#9333EA]/20 text-[#9333EA] border border-[#9333EA]/30'
                                    : 'text-[#5B4E7A] hover:text-[#1F1235]'
                            }`}>
                            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ══ 등급별 혜택 비교 탭 ══ */}
                {activeTab === 'compare' && (
                    <div className="space-y-4 animate-fadeIn">
                        {/* 등급 카드 비교 */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* 실버 카드 */}
                            <div className="bg-white border border-[#E8E0FA] rounded-2xl p-4 text-center">
                                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
                                    <span className="text-2xl">🤍</span>
                                </div>
                                <h3 className="text-[#1F1235] font-black text-base mb-1">SILVER</h3>
                                <p className="text-emerald-400 font-black text-lg">무료</p>
                                <p className="text-[#9CA3AF] text-[10px] mt-1">기본 회원</p>
                            </div>
                            {/* 골드 카드 */}
                            <div className="bg-white border-2 border-[#9333EA] rounded-2xl p-4 text-center relative overflow-hidden shadow-lg shadow-[#9333EA]/10">
                                <div className="absolute top-0 right-0 bg-[#9333EA] text-white text-[9px] font-black px-2.5 py-0.5 rounded-bl-xl">추천</div>
                                <div className="w-12 h-12 mx-auto rounded-full bg-[#F3E8FF] flex items-center justify-center mb-3">
                                    <span className="text-2xl">👑</span>
                                </div>
                                <h3 className="text-[#9333EA] font-black text-base mb-1">GOLD</h3>
                                <p className="text-[#7C3AED] font-black text-lg">월 10,000원~</p>
                                <p className="text-[#9CA3AF] text-[10px] mt-1">광고모델 활동</p>
                            </div>
                        </div>

                        {/* 기능 비교 리스트 */}
                        <div className="bg-white border border-[#E8E0FA] rounded-2xl overflow-hidden">
                            <div className="grid grid-cols-[1fr_70px_70px] px-4 py-3 border-b border-[#E8E0FA] bg-[#F8F5FF]">
                                <span className="text-[#5B4E7A] text-[11px] font-bold">기능</span>
                                <span className="text-[#5B4E7A] text-[11px] font-bold text-center">SILVER</span>
                                <span className="text-[#FCD34D]/50 text-[11px] font-bold text-center">GOLD</span>
                            </div>
                            {FEATURES.map((feat, i) => (
                                <div key={i} className={`grid grid-cols-[1fr_70px_70px] px-4 py-3 items-center ${i < FEATURES.length - 1 ? 'border-b border-[#E8E0FA]' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[14px] text-[#9CA3AF]">{feat.icon}</span>
                                        <span className="text-[#5B4E7A] text-xs font-bold">{feat.name}</span>
                                    </div>
                                    <div className="flex justify-center">
                                        {typeof feat.silver === 'string' ? (
                                            <span className="text-[#9CA3AF] text-[10px] font-black">{feat.silver}</span>
                                        ) : feat.silver ? (
                                            <span className="material-symbols-outlined text-[16px] text-[#10B981]">check_circle</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-[16px] text-[#E8E0FA]">cancel</span>
                                        )}
                                    </div>
                                    <div className="flex justify-center">
                                        {typeof feat.gold === 'string' ? (
                                            <span className="text-[#9333EA] text-[10px] font-black">{feat.gold}</span>
                                        ) : feat.gold ? (
                                            <span className="material-symbols-outlined text-[16px] text-[#9333EA]">check_circle</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-[16px] text-[#E8E0FA]">cancel</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 구독하기 CTA */}
                        {!isAlreadyGold && (
                            <button onClick={() => setActiveTab('plans')}
                                className="w-full py-5 rounded-3xl bg-gradient-to-br from-[#9333EA] to-[#7C3AED] text-white font-black text-base shadow-xl shadow-[#9333EA]/20 hover:opacity-95 active:scale-[0.97] transition-all flex items-center justify-center gap-2">
                                <span className="text-xl">👑</span>
                                GOLD 플랜 신청하기
                            </button>
                        )}
                    </div>
                )}

                {/* ══ 구독 플랜 신청 탭 ══ */}
                {activeTab === 'plans' && (
                    <div className="space-y-4 animate-fadeIn">

                        {/* 신청 안내 배너 */}
                        <div className="bg-[#FFFBEB] border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0">💛</span>
                            <div>
                                <p className="text-amber-700 font-black text-sm">카카오톡으로 간편 신청</p>
                                <p className="text-amber-600 text-xs mt-1 leading-relaxed">
                                    플랜을 선택하고 아래 버튼을 누르면 카카오 채널로 연결됩니다.<br/>
                                    담당자가 결제 링크를 보내드리며, 결제 완료 후 GOLD 등급이 적용됩니다.
                                </p>
                            </div>
                        </div>

                        {/* 플랜 카드들 */}
                        <div className="space-y-3">
                            {PLANS.map(plan => {
                                const isSelected = selectedPlan.id === plan.id;
                                return (
                                    <button key={plan.id} onClick={() => setSelectedPlan(plan)}
                                        className={`w-full relative p-6 rounded-[32px] border-2 transition-all text-left overflow-hidden ${
                                            isSelected
                                                ? 'border-[#9333EA] bg-[#F3E8FF] shadow-lg shadow-[#9333EA]/10'
                                                : 'border-[#E8E0FA] bg-white hover:border-[#9333EA]/30'
                                        }`}>
                                        {plan.popular && (
                                            <span className="absolute -top-0 right-0 bg-gradient-to-br from-[#9333EA] to-[#7C3AED] text-white text-[10px] font-black px-4 py-1 rounded-bl-2xl shadow-sm">
                                                BEST
                                            </span>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isSelected ? 'border-[#9333EA] bg-[#9333EA]' : 'border-[#E8E0FA]'
                                                }`}>
                                                    {isSelected && <span className="material-symbols-outlined text-[16px] text-white font-black">check</span>}
                                                </div>
                                                <div>
                                                    <p className={`text-lg font-black ${isSelected ? 'text-[#9333EA]' : 'text-[#1F1235]'}`}>
                                                        {plan.label}
                                                    </p>
                                                    <p className="text-[#9CA3AF] text-[13px] font-bold mt-0.5">
                                                        월 {plan.monthly.toLocaleString()}원
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-2xl font-black ${isSelected ? 'text-[#9333EA]' : 'text-[#1F1235]'}`}>
                                                    {plan.price.toLocaleString()}원
                                                </p>
                                                {plan.discountPct && (
                                                    <span className="text-[11px] font-black text-[#EC4899] bg-[#EC4899]/10 px-2 py-0.5 rounded-full">
                                                        {plan.discountPct}% 할인
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* 선택된 플랜 요약 + 신청 버튼 */}
                        <div className="bg-white border border-[#E8E0FA] rounded-[32px] p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[#5B4E7A] text-[15px] font-bold">선택한 플랜</span>
                                <span className="text-[#9333EA] font-black text-[15px]">{selectedPlan.label} 구독</span>
                            </div>
                            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#F8F5FF]">
                                <span className="text-[#5B4E7A] text-sm font-medium">신청 금액</span>
                                <span className="text-[#1F1235] font-black text-2xl">{selectedPlan.price.toLocaleString()}원</span>
                            </div>

                            {/* 카카오 신청 버튼 */}
                            {isAlreadyGold ? (
                                <div className="w-full py-5 rounded-[24px] bg-[#F8F5FF] text-[#9CA3AF] font-black text-base text-center border border-[#E8E0FA]">
                                    이미 GOLD 회원입니다 👑
                                </div>
                            ) : (
                                <button onClick={handleApply}
                                    className="w-full py-5 rounded-[24px] font-black text-lg shadow-xl transition-all flex items-center justify-center gap-2.5 active:scale-[0.97]"
                                    style={{ backgroundColor: '#FEE500', color: '#391B1B' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#391B1B">
                                        <path d="M12 3C6.477 3 2 6.477 2 10.818c0 2.756 1.563 5.198 3.938 6.676L4.9 21l4.326-2.358C10.03 18.873 11 19 12 19c5.523 0 10-3.477 10-7.818C22 6.477 17.523 3 12 3z"/>
                                    </svg>
                                    카카오톡으로 신청하기
                                </button>
                            )}
                        </div>

                        {/* 신청 프로세스 안내 */}
                        <div className="bg-white border border-[#E8E0FA] rounded-2xl p-5 space-y-4">
                            <p className="text-[#1F1235] text-sm font-black flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-[#9333EA]">info</span>
                                신청 절차
                            </p>
                            <div className="space-y-3">
                                {[
                                    { step: '1', text: '플랜 선택 후 카카오톡 신청 버튼 클릭', icon: 'touch_app' },
                                    { step: '2', text: '담당자가 결제 링크를 카카오톡으로 전송', icon: 'send' },
                                    { step: '3', text: '링크에서 결제 완료 (블로그페이)', icon: 'payments' },
                                    { step: '4', text: '영업일 1일 이내 GOLD 등급 자동 적용', icon: 'workspace_premium' },
                                ].map(({ step, text, icon }) => (
                                    <div key={step} className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full bg-[#F3E8FF] flex items-center justify-center flex-shrink-0">
                                            <span className="text-[#9333EA] text-xs font-black">{step}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[15px] text-[#9CA3AF]">{icon}</span>
                                            <span className="text-[#5B4E7A] text-xs font-bold">{text}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 안내 */}
                        <div className="bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl p-4 space-y-2">
                            <p className="text-[#5B4E7A] text-[11px] font-bold flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[12px]">info</span>
                                이용 안내
                            </p>
                            <ul className="text-[#9CA3AF] text-[11px] space-y-1 pl-4">
                                <li>• 결제 확인 후 영업일 1일 이내 GOLD 등급이 적용됩니다.</li>
                                <li>• 구독 기간 만료 시 자동으로 SILVER로 변경됩니다.</li>
                                <li>• 환불 문의는 카카오톡 채널로 연락해주세요.</li>
                                <li>• 부가세(VAT) 포함 금액입니다.</li>
                            </ul>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default UpgradePage;
