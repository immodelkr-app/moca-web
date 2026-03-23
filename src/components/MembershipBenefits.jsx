import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getUserGrade } from '../services/userService';
import { verifyPartnerPin, recordPartnerVisit } from '../services/adminService';
import BenefitList from './Membership/BenefitList';

const MembershipBenefits = () => {
    const navigate = useNavigate();
    const grade = getUserGrade();
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
        <div className="min-h-[100dvh] bg-gradient-to-br from-[#3A0C5C] via-[#1C0A35] to-[#0A0514] text-white flex flex-col items-center pb-20">

            {/* Top Navigation / Header */}
            <header className="w-full flex items-center justify-between p-4 z-10 sticky top-0">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors backdrop-blur-sm"
                >
                    <span className="material-symbols-outlined text-[20px] text-white/80">arrow_back</span>
                </button>
            </header>

            {/* MOCA Logo Header */}
            <div className="flex flex-col items-center justify-center mb-8 z-10 w-full px-6 text-center">
                <h1 className="text-4xl font-light tracking-[0.2em] mb-2 text-white/90" style={{ letterSpacing: '0.25em' }}>MOCA</h1>
                <p className="text-[9px] font-bold text-white/40 uppercase" style={{ letterSpacing: '0.15em' }}>Premium Modeling Agency</p>
            </div>

            {/* Digital ID Container */}
            <div className="relative w-[90%] max-w-[360px] bg-[#050505] rounded-[32px] p-6 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col z-10">

                {/* Glow behind the card */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent rounded-[32px] pointer-events-none" />

                {/* ID Header */}
                <div className="mb-2 relative z-10">
                    <h2 className="text-2xl font-black bg-gradient-to-r from-[#9B8AFB] to-[#6052FF] bg-clip-text text-transparent tracking-tight">MOCA</h2>
                    <p className="text-[10px] font-bold tracking-[0.2em] text-white/30 mt-1">DIGITAL ID</p>
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
                        <div className="absolute w-20 h-20 bg-[#1D996D]/30 blur-[30px] rounded-full animate-pulse" />
                        <span className="material-symbols-outlined text-[48px] text-[#1D996D] drop-shadow-[0_0_15px_rgba(29,153,109,0.8)]">
                            local_police
                        </span>
                    </div>
                </div>

                {/* Verified Badge → 업체 확인하기 버튼 (클릭 가능) */}
                <div className="relative z-10 flex justify-center mb-8">
                    <button
                        onClick={openPinModal}
                        className="bg-[#1D996D] hover:bg-[#17806]  active:bg-[#16705C] rounded-[24px] px-8 py-3.5 flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(29,153,109,0.5)] border border-[#1D996D]/50 w-full max-w-[280px] transition-all"
                    >
                        <span className="material-symbols-outlined text-white text-[22px]">storefront</span>
                        <div className="flex flex-col text-center leading-tight">
                            <span className="text-white font-black text-[13px] tracking-widest uppercase">업체 확인하기</span>
                            <span className="text-white/70 font-medium text-[10px] tracking-wide">업체 전용</span>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    </button>
                </div>

                {/* User Info Card */}
                <div className="bg-[#0a0a0f] rounded-[20px] p-5 border border-white/5 relative z-10 shadow-inner">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-4">
                            {/* Grade Badge */}
                            <div className={`w-[52px] h-[52px] rounded-full bg-gradient-to-br ${badgeColors} flex items-center justify-center shadow-lg border border-white/10 relative overflow-hidden`}>
                                {/* Shine effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent -translate-x-[100%] hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                                <span className="font-black text-[11px] tracking-tight">{grade}</span>
                            </div>
                            {/* Name & Title */}
                            <div className="flex flex-col justify-center gap-0.5">
                                <h3 className="text-lg font-black text-white">{userName}</h3>
                                <p className="text-[11px] font-medium text-white/50">{isGold ? '모카 골드멤버' : '모카 실버멤버'}</p>
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
                    <div className="flex items-center border-t border-white/[0.03] pt-4">
                        <div className="flex items-center gap-1.5 text-[#1D996D]">
                            <span className="material-symbols-outlined text-[13px]">schedule</span>
                            <span className="text-[10px] font-mono tracking-wider font-bold">{currentTime}</span>
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
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={closePinModal}>
                    <div className="bg-[#1a1a24] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button className="absolute top-4 right-4 text-white/40 hover:text-white" onClick={closePinModal}>
                            <span className="material-symbols-outlined">close</span>
                        </button>

                        {!verifiedPartner ? (
                            <>
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-[#1D996D]/20 text-[#1D996D] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-3xl">storefront</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">업체 제휴 확인</h4>
                                    <p className="text-sm text-white/60">
                                        직원에게 <span className="text-[#1D996D] font-bold">인증코드</span>를 받아 입력해 주세요.
                                    </p>
                                </div>
                                <div className="mb-4">
                                    <input
                                        type="password"
                                        value={pinInput}
                                        onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                                        placeholder="인증코드 입력"
                                        className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-white/20 focus:outline-none focus:border-[#1D996D] transition-colors"
                                        maxLength={6}
                                        autoFocus
                                    />
                                    {pinError && (
                                        <p className="text-red-400 text-sm mt-2 text-center animate-pulse">{pinError}</p>
                                    )}
                                </div>
                                <button
                                    onClick={handlePinSubmit}
                                    disabled={isVerifying || !pinInput.trim()}
                                    className="w-full bg-gradient-to-r from-[#1D996D] to-[#34D399] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-green-500/25 transition-all text-lg disabled:opacity-50"
                                >
                                    {isVerifying ? '확인 중...' : '확인하기'}
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <div className="w-20 h-20 bg-[#1D996D]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-[48px] text-[#1D996D]">check_circle</span>
                                </div>
                                <h4 className="text-2xl font-black text-white mb-1">인증 완료!</h4>
                                <p className="text-[#1D996D] font-bold text-lg mb-4">{verifiedPartner.name}</p>
                                <p className="text-white/50 text-sm mb-6">
                                    {verifiedPartner.discount || '제휴 할인 혜택이 적용됩니다.'}
                                </p>
                                <button
                                    onClick={closePinModal}
                                    className="w-full bg-gradient-to-r from-[#1D996D] to-[#34D399] text-white font-bold py-3 rounded-xl"
                                >
                                    닫기
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
