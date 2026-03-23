import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getUser } from '../../services/userService';
import { verifyPartnerPin, recordPartnerVisit } from '../../services/adminService';

const DigitalCard = () => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showPinModal, setShowPinModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [pinError, setPinError] = useState('');
    const [verifiedPartner, setVerifiedPartner] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const user = getUser();
    const userGrade = user?.grade || 'BASIC';
    const userId = user?.nickname || user?.name || '홍길동';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');
        return `${yyyy}.${mm}.${dd} ${hh}:${min}:${ss}`;
    };

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

        // 방문 기록
        await recordPartnerVisit(userId, partner.id);
        setVerifiedPartner(partner);
    };

    return (
        <>
            <div className="relative w-full max-w-sm mx-auto bg-gradient-to-br from-[#818CF8] via-[#C084FC] to-[#F472B6] rounded-3xl p-6 shadow-2xl shadow-purple-500/20 overflow-hidden isolation-auto border border-white/40">
                {/* Hologram Effect (Decorative) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-60 mix-blend-overlay pointer-events-none hologram-anim"></div>

                {/* Logo Row */}
                <div className="flex justify-between items-start relative z-10">
                    <div className="flex flex-col">
                        <span className="bg-gradient-to-r from-[#9B8AFB] to-[#6052FF] bg-clip-text text-transparent text-2xl font-black tracking-tighter">MOCA</span>
                        <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Digital ID</span>
                    </div>
                </div>

                {/* Main Centerpiece: Verified Member */}
                <div className="flex flex-col items-center justify-center my-6 relative z-10 w-full">
                    <div className="w-24 h-24 bg-gradient-to-tr from-[#1E1B4B] to-[#312E81] rounded-full border-[6px] border-[#A78BFA] flex items-center justify-center shadow-[0_0_40px_rgba(167,139,250,0.5)] mb-5 relative">
                        <span className="w-full h-full absolute rounded-full border-4 border-[#A78BFA] animate-ping opacity-20"></span>
                        <span className="material-symbols-outlined text-[60px] text-[#A78BFA]">gpp_good</span>
                    </div>

                    {/* Verified Button/Badge */}
                    <div className="bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] px-6 py-2.5 rounded-full flex gap-2 items-center shadow-[0_8px_30px_rgba(139,92,246,0.4)] border border-[#A78BFA] w-full max-w-[240px] justify-center">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                        <h2 className="text-xl font-black text-white tracking-widest uppercase shadow-sm">
                            Verified Member
                        </h2>
                    </div>
                </div>

                {/* Profile Info & Security Footer */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20 relative shadow-inner z-10 flex flex-col gap-4">
                    {/* Profile Row */}
                    <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-full border-2 overflow-hidden flex-shrink-0 flex items-center justify-center flex-col shadow-lg backdrop-blur-md ${userGrade === 'GOLD' ? 'border-[#FDE047] bg-gradient-to-br from-[#FEF08A] to-[#EAB308]' : 'border-slate-200 bg-gradient-to-br from-[#F8FAFC] to-[#CBD5E1]'}`}>
                            <span className="text-[9px] font-black text-slate-900 leading-tight tracking-tighter drop-shadow-sm">{userGrade === 'GOLD' ? '골드' : '실버'}</span>
                            <span className="text-[9px] font-black text-slate-900 leading-tight tracking-tighter drop-shadow-sm">모카</span>
                        </div>
                        {/* Name, Grade, and QR Code */}
                        <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-white tracking-tight">{userId}</h2>
                                {/* Tiny Decorative QR Code */}
                                <div className="bg-white p-1 rounded min-w-[32px] min-h-[32px] flex items-center justify-center opacity-90 shadow-sm ml-auto">
                                    <QRCodeSVG
                                        value={`MOCA-ID-${formatTime(currentTime)}`}
                                        size={24}
                                        level="L"
                                        includeMargin={false}
                                    />
                                </div>
                            </div>
                            <p className="text-xs font-bold text-white/70">모카 모델 1기</p>
                        </div>
                    </div>

                    {/* Clock & Security Row */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-3">
                        <div className="text-[#C4B5FD] font-mono text-sm font-black tracking-widest tabular-nums flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>
                            {formatTime(currentTime)}
                        </div>
                        <div className="text-[9px] text-white/50 text-right font-bold leading-tight">
                            캡처화면<br />사용불가
                        </div>
                    </div>
                </div>

                {/* CSS for hologram animation */}
                <style jsx>{`
                    .hologram-anim {
                        background-size: 200% 200%;
                        animation: hologramMove 3s ease infinite;
                    }
                    @keyframes hologramMove {
                        0% { background-position: 0% 50%; opacity: 0.2; }
                        50% { background-position: 100% 50%; opacity: 0.6; }
                        100% { background-position: 0% 50%; opacity: 0.2; }
                    }
                `}</style>
            </div>

            {/* 업체 확인하기 버튼 (카드 바깥으로 완전히 분리하여 절대 짤리지 않게 강조) */}
            <div className="w-full max-w-sm mx-auto mt-8 mb-4 relative z-20">
                <button
                    onClick={openPinModal}
                    className="w-full bg-[#1a1a24] border border-[#A78BFA] hover:bg-[#A78BFA]/10 py-5 rounded-2xl flex items-center justify-center gap-2 text-[#A78BFA] font-black transition-all shadow-[0_0_20px_rgba(167,139,250,0.15)] text-lg"
                >
                    <span className="material-symbols-outlined text-[28px]">storefront</span>
                    직원 전용: 업체 제휴 확인
                </button>
                <p className="text-center text-white/40 text-[11px] mt-3 font-medium px-4">
                    결제 전 매장 직원이 위 버튼을 눌러 PIN 번호를 입력하면 제휴 할인이 자동 적용됩니다.
                </p>
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
                                    <div className="w-16 h-16 bg-[#818CF8]/20 text-[#818CF8] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-3xl">storefront</span>
                                    </div>
                                    <h4 className="text-xl font-bold text-white mb-2">업체 제휴 확인</h4>
                                    <p className="text-sm text-white/60">
                                        직원에게 <span className="text-[#818CF8] font-bold">인증코드</span>를 받아 입력해 주세요.
                                    </p>
                                </div>

                                <div className="mb-4">
                                    <input
                                        type="password"
                                        value={pinInput}
                                        onChange={(e) => { setPinInput(e.target.value); setPinError(''); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                                        placeholder="인증코드 입력"
                                        className="w-full bg-black/50 border border-white/20 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-white/20 focus:outline-none focus:border-[#818CF8] transition-colors"
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
                                    className="w-full bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all text-lg disabled:opacity-50"
                                >
                                    {isVerifying ? '확인 중...' : '확인하기'}
                                </button>
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <div className="w-20 h-20 bg-[#818CF8]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-[48px] text-[#A78BFA]">check_circle</span>
                                </div>
                                <h4 className="text-2xl font-black text-white mb-1">인증 완료!</h4>
                                <p className="text-[#A78BFA] font-bold text-lg mb-4">{verifiedPartner.name}</p>
                                <p className="text-white/50 text-sm mb-6">
                                    {verifiedPartner.discount || '제휴 할인 혜택이 적용됩니다.'}
                                </p>
                                <button
                                    onClick={closePinModal}
                                    className="w-full bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-bold py-3 rounded-xl"
                                >
                                    닫기
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default DigitalCard;
