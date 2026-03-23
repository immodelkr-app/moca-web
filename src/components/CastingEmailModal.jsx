import React, { useState } from 'react';

/**
 * 에이전시 이메일이 DB에 없을 때 직접 입력받는 모달
 */
const CastingEmailModal = ({ agency, onConfirm, onClose, sending }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSubmit = () => {
        if (!email) { setError('이메일을 입력해주세요.'); return; }
        if (!isValid) { setError('올바른 이메일 형식을 입력해주세요.'); return; }
        setError('');
        onConfirm(email);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={(e) => { if (e.target === e.currentTarget && !sending) onClose(); }}>
            <div className="bg-[#1a1a24] border border-white/10 rounded-t-3xl w-full max-w-lg p-6 pb-10 shadow-2xl">

                {/* 핸들 */}
                <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />

                {/* 헤더 */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#10B981]/20 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[20px] text-[#34D399]">forward_to_inbox</span>
                    </div>
                    <div>
                        <h2 className="text-white font-black text-base">{agency.name}</h2>
                        <p className="text-white/40 text-xs mt-0.5">이메일 주소를 직접 입력해주세요</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto text-white/30 hover:text-white/60 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[22px]">close</span>
                    </button>
                </div>

                {/* 안내 */}
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-[#6C63FF]/10 border border-[#6C63FF]/20 mb-5">
                    <span className="material-symbols-outlined text-[16px] text-[#818CF8] mt-0.5 flex-shrink-0">info</span>
                    <p className="text-white/60 text-xs leading-relaxed">
                        이 에이전시의 이메일이 아직 등록되지 않았습니다.<br />
                        직접 입력하면 즉시 발송되며, 다음 번엔 자동으로 저장됩니다.
                    </p>
                </div>

                {/* 이메일 입력 */}
                <div className="space-y-2 mb-5">
                    <label className="text-white/50 text-xs font-bold ml-1">에이전시 이메일 주소</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        placeholder="casting@agency.com"
                        autoFocus
                        className={`w-full bg-white/5 border rounded-xl px-4 py-3.5 text-white text-sm placeholder-white/20 focus:outline-none transition-colors ${error ? 'border-red-500/40' : isValid && email ? 'border-emerald-500/40' : 'border-white/10 focus:border-[#6C63FF]'}`}
                    />
                    {error && (
                        <p className="text-red-400 text-xs font-bold ml-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">error</span>
                            {error}
                        </p>
                    )}
                    {isValid && email && !error && (
                        <p className="text-emerald-400 text-xs font-bold ml-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">check_circle</span>
                            유효한 이메일입니다
                        </p>
                    )}
                </div>

                {/* 버튼 */}
                <button
                    onClick={handleSubmit}
                    disabled={sending || !email}
                    className={`w-full py-4 rounded-2xl text-white font-black text-base transition-all active:scale-[0.98] ${sending
                        ? 'bg-[#10B981]/50 cursor-not-allowed'
                        : !email
                            ? 'bg-white/10 cursor-not-allowed text-white/40'
                            : 'bg-gradient-to-r from-[#10B981] to-[#34D399] shadow-lg shadow-[#10B981]/30 hover:opacity-90'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <span className={`material-symbols-outlined text-[20px] ${sending ? 'animate-spin' : ''}`}>
                            {sending ? 'sync' : 'send'}
                        </span>
                        {sending ? '발송 중...' : '이력서 발송하기 📩'}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default CastingEmailModal;
