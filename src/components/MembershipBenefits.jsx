import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getUserGrade, syncUserGrade } from '../services/userService';
import { verifyPartnerPin, recordPartnerVisit } from '../services/adminService';
import BenefitList from './Membership/BenefitList';

const MembershipBenefits = () => {
    const navigate = useNavigate();
    const [grade, setGrade] = useState(getUserGrade());
    const user = getUser();
    const userName = user?.name || user?.nickname || '회원';

    // PIN modal state
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [verifiedPartner, setVerifiedPartner] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Live clock state
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        // DB 최신 등급 동기화
        syncUserGrade().then(() => {
            setGrade(getUserGrade());
        });
        
        const updateClock = () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            setCurrentTime(`${year}.${month}.${day} ${hours}:${minutes}:${seconds}`);
        };

        updateClock(); // Initial call
        const timerId = setInterval(updateClock, 1000);
        return () => clearInterval(timerId);
    }, []);


    const isGold = grade === 'GOLD';
    const badgeColors = isGold
        ? 'from-[#D4AF37] to-[#8C7322] text-[#5A4A16]' // Gold
        : 'from-[#E2E8F0] to-[#94A3B8] text-[#334155]'; // Silver

    const openPinModal = () => {
        setPinInput('');
        setPinError('');
        setVerifiedPartner(null);
        setShowPinModal(true);
    };

    const closePinModal = () => {
        setShowPinModal(false);
        setPinInput('');
        setPinError('');
        setVerifiedPartner(null);
        setIsVerifying(false);
    };

    const handlePinSubmit = async () => {
        if (!pinInput.trim()) return;
        setIsVerifying(true);
        setPinError('');
        const { partner, error } = await verifyPartnerPin(pinInput.trim());
        setIsVerifying(false);
        if (error || !partner) {
            setPinError('잘못된 인증코드입니다. 직원에게 다시 확인해 주세요.');
            return;
        }
        await recordPartnerVisit(userName, partner.id);
        setVerifiedPartner(partner);
    };

    return (
        <div className="min-h-[100dvh] bg-[#F8F5FF] text-[#1F1235] flex flex-col items-center pb-20">

            {/* Top Navigation / Header */}
            <header className="w-full flex items-center justify-between p-4 z-10 sticky top-0">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-white/80 border border-[#E8E0FA] flex items-center justify-center hover:bg-white transition-colors backdrop-blur-sm shadow-sm"
                >
                    <span className="material-symbols-outlined text-[20px] text-[#9333EA]">arrow_back</span>
                </button>
            </header>

            {/* MOCA Logo Header */}
            <div className="flex flex-col items-center justify-center mb-10 z-10 w-full px-6 text-center">
                <h1 className="text-4xl font-black tracking-[0.2em] mb-2 text-[#1F1235]" style={{ letterSpacing: '0.25em' }}>MOCA</h1>
                <p className="text-[10px] font-black text-[#9333EA] uppercase tracking-widest">Premium Modeling Agency</p>
            </div>

            {/* Digital ID Container */}
            <div className="relative w-[92%] max-w-[380px] bg-white rounded-[48px] p-8 border border-[#E8E0FA] shadow-[0_30px_60px_rgba(147,51,234,0.12)] flex flex-col z-10 overflow-hidden">

                {/* Background Pattern */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#9333EA]/5 blur-[60px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#00D4FF]/5 blur-[60px] rounded-full pointer-events-none" />

                {/* ID Header */}
                <div className="mb-4 relative z-10">
                    <h2 className="text-2xl font-black bg-gradient-to-r from-[#9333EA] to-[#7C3AED] bg-clip-text text-transparent tracking-tight">MOCA</h2>
                    <p className="text-[10px] font-black tracking-[0.2em] text-[#9CA3AF] mt-1">DIGITAL ID</p>
                </div>

                {/* Center Graphic: Glowing Shield */}
                <div className="relative flex-1 flex items-center justify-center min-h-[260px] my-4">
                    {/* Concentric Circles */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[120px] h-[120px] rounded-full border border-white-[0.03]" />
                        <div className="absolute w-[180px] h-[180px] rounded-full border border-white-[0.02]" />
                        <div className="absolute w-[240px] h-[240px] rounded-full border border-white-[0.01]" />
                    </div>
                    {/* Glowing Center */}
                    <div className="relative z-10 flex items-center justify-center">
                        <div className="absolute w-24 h-24 bg-[#10B981]/15 blur-[40px] rounded-full animate-pulse" />
                        <span className="material-symbols-outlined text-[64px] text-[#10B981] drop-shadow-sm">
                            local_police
                        </span>
                    </div>
                </div>

                {/* Verified Badge → 업체 확인하기 버튼 (클릭 가능) */}
                <div className="relative z-10 flex justify-center mb-10">
                    <button
                        onClick={openPinModal}
                        className="bg-[#10B981] hover:bg-[#059669] active:scale-[0.98] rounded-[24px] px-8 py-4.5 flex items-center justify-center gap-4 shadow-xl shadow-[#10B981]/25 border border-[#10B981]/20 w-full transition-all"
                    >
                        <span className="material-symbols-outlined text-white text-[24px]">storefront</span>
                        <div className="flex flex-col text-left leading-tight">
                            <span className="text-white font-black text-[14px] tracking-widest uppercase">업체 확인하기</span>
                            <span className="text-white/80 font-bold text-[10px] tracking-wide">직원 전용 인증 서비스</span>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-white/90 animate-pulse ml-auto" />
                    </button>
                </div>

                {/* User Info Card */}
                <div className="bg-[#F8F5FF] rounded-[28px] p-6 border border-[#E8E0FA] relative z-10 shadow-inner">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-5">
                            {/* Grade Badge */}
                            <div className={`w-[60px] h-[60px] rounded-full bg-gradient-to-br ${badgeColors} flex items-center justify-center shadow-lg border-2 border-white relative overflow-hidden`}>
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                                <span className="font-black text-[12px] tracking-tight">{grade}</span>
                            </div>
                            {/* Name & Title */}
                            <div className="flex flex-col justify-center gap-1">
                                <h3 className="text-xl font-black text-[#1F1235]">{userName}</h3>
                                <p className="text-[12px] font-bold text-[#5B4E7A]">{isGold ? 'GOLD' : 'SILVER'}</p>
                            </div>
                        </div>

                        {/* Placeholder for QR Code styling from image */}
                        <div className="w-10 h-10 bg-[#1D996D]/10 rounded-lg border border-[#1D996D]/30 flex flex-col items-center justify-center gap-0.5 opacity-50">
                            <div className="flex gap-0.5">
                                <div className="w-1.5 h-1.5 bg-[#1D996D] rounded-sm" />
                                <div className="w-1.5 h-1.5 bg-[#1D996D] rounded-sm" />
                            </div>
                            <div className="flex gap-0.5">
                                <div className="w-1.5 h-1.5 bg-[#1D996D] rounded-sm" />
                                <div className="w-1.5 h-1.5 bg-[#1D996D] rounded-sm" />
                            </div>
                        </div>
                    </div>

                    {/* Footer: Live Clock */}
                    <div className="flex items-center border-t border-[#E8E0FA] pt-5">
                        <div className="flex items-center gap-2 text-[#10B981]">
                            <span className="material-symbols-outlined text-[15px]">schedule</span>
                            <span className="text-[12px] font-black tracking-widest">{currentTime}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Benefits Content */}
            <div className="w-full max-w-lg mt-12 px-6 flex flex-col gap-10 z-10 pb-10">
                <BenefitList />
            </div>

            {/* PIN 인증 모달 */}
            {showPinModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={closePinModal}>
                    <div className="bg-white border border-[#E8E0FA] rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button className="absolute top-5 right-5 text-[#9CA3AF] hover:text-[#9333EA] transition-colors" onClick={closePinModal}>
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        {!verifiedPartner ? (
                            <>
                                <div className="text-center mb-8">
                                    <div className="w-20 h-20 bg-[#10B981]/10 text-[#10B981] rounded-full flex items-center justify-center mx-auto mb-5">
                                        <span className="material-symbols-outlined text-4xl">storefront</span>
                                    </div>
                                    <h4 className="text-2xl font-black text-[#1F1235] mb-2 tracking-tight">업체 제휴 확인</h4>
                                    <p className="text-sm text-[#5B4E7A] font-medium leading-relaxed">
                                        직원에게 <span className="text-[#10B981] font-black">인증코드</span>를 받아<br />입력해 주세요.
                                    </p>
                                </div>
                                <div className="mb-6">
                                    <input
                                        type="password"
                                        value={pinInput}
                                        onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                                        placeholder="인증코드"
                                        className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-4 text-center text-3xl tracking-[0.5em] text-[#1F1235] placeholder-[#9CA3AF]/30 focus:outline-none focus:border-[#10B981] transition-all font-black"
                                        maxLength={6}
                                        autoFocus
                                    />
                                    {pinError && (
                                        <p className="text-red-500 text-sm mt-3 text-center font-bold animate-pulse">{pinError}</p>
                                    )}
                                </div>
                                <button
                                    onClick={handlePinSubmit}
                                    disabled={isVerifying || !pinInput.trim()}
                                    className="w-full bg-[#10B981] text-white font-black py-4.5 rounded-[20px] shadow-xl shadow-[#10B981]/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-lg disabled:opacity-30"
                                >
                                    {isVerifying ? '인증 진행 중...' : '인증하기'}
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <div className="w-24 h-24 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <span className="material-symbols-outlined text-[56px] text-[#10B981]">check_circle</span>
                                </div>
                                <h4 className="text-2xl font-black text-[#1F1235] mb-2">인증 완료!</h4>
                                <p className="text-[#10B981] font-black text-xl mb-4">{verifiedPartner.name}</p>
                                <p className="text-[#5B4E7A] font-medium text-sm mb-8 leading-relaxed">
                                    {verifiedPartner.discount || '제휴 할인 혜택이 즉시 적용됩니다.'}
                                </p>
                                <button
                                    onClick={closePinModal}
                                    className="w-full bg-[#F8F5FF] border border-[#E8E0FA] text-[#9333EA] font-black py-4 rounded-2xl hover:bg-[#F3E8FF] transition-colors"
                                >
                                    확인
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MembershipBenefits;
