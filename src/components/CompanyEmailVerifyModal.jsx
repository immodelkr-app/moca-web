import React, { useState } from 'react';
import { sendVerificationCode, verifyCode } from '../services/emailVerificationService';

const CompanyEmailVerifyModal = ({ email, onClose, onVerified }) => {
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [codeInput, setCodeInput] = useState('');
    const [checking, setChecking] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);

    const handleSend = async () => {
        setSending(true);
        setMessage('');
        try {
            const { success, error } = await sendVerificationCode(email);
            if (success) {
                setSent(true);
                setIsError(false);
                setMessage('인증번호를 발송했습니다. 메일함을 확인해 주세요.');
            } else {
                setIsError(true);
                setMessage(error || '인증번호 발송에 실패했습니다.');
            }
        } finally {
            setSending(false);
        }
    };

    const handleVerify = async () => {
        if (!codeInput) {
            setIsError(true);
            setMessage('인증번호를 입력해 주세요.');
            return;
        }
        setChecking(true);
        setMessage('');
        try {
            const { success, error } = await verifyCode(email, codeInput);
            if (success) {
                onVerified();
            } else {
                setIsError(true);
                setMessage(error || '인증번호가 일치하지 않습니다.');
            }
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl z-10 overflow-hidden animate-slideUp px-7 pt-8 pb-[6vh] sm:pb-8">
                <h3 className="text-lg font-black text-[#1F1235] mb-1">이메일 인증</h3>
                <p className="text-[12px] text-[#9CA3AF] font-bold mb-5 break-all">{email}</p>

                {!sent ? (
                    <>
                        <p className="text-[12px] text-[#5B4E7A] font-bold leading-relaxed mb-6">
                            위 이메일로 인증번호를 보내드려요.<br />지원자 프로필을 받을 주소가 맞는지 확인해 주세요.
                        </p>
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="w-full py-3.5 rounded-2xl bg-[#9333EA] text-white font-black text-sm hover:opacity-90 active:scale-95 disabled:opacity-60 transition-all"
                        >
                            {sending ? '발송 중...' : '인증번호 발송'}
                        </button>
                    </>
                ) : (
                    <>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="인증번호 6자리"
                                value={codeInput}
                                onChange={(e) => setCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                                className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold text-sm focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                            />
                            <button
                                onClick={handleVerify}
                                disabled={checking}
                                className="px-5 py-3 rounded-2xl bg-[#9333EA] text-white font-black text-xs whitespace-nowrap hover:opacity-90 transition-all disabled:opacity-50"
                            >
                                {checking ? '확인 중...' : '확인'}
                            </button>
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={sending}
                            className="text-[11px] font-bold text-[#7C3AED] hover:underline disabled:opacity-50"
                        >
                            {sending ? '재발송 중...' : '인증번호 재발송'}
                        </button>
                    </>
                )}

                {message && (
                    <p className={`text-[11px] font-bold mt-4 ${isError ? 'text-red-500' : 'text-[#9CA3AF]'}`}>{message}</p>
                )}

                <button
                    onClick={onClose}
                    className="w-full mt-5 py-3 rounded-2xl border border-[#E8E0FA] text-[#9CA3AF] font-black text-sm hover:bg-[#FAF8FF] transition-all"
                >
                    나중에 하기
                </button>
            </div>
        </div>
    );
};

export default CompanyEmailVerifyModal;
