import React, { useState } from 'react';
import { findNicknameByNameAndPhone, maskNickname, resetUserPassword } from '../services/userService';

/**
 * 아이디 찾기 / 비밀번호 찾기 통합 모달
 * Props:
 *   mode: 'id' | 'password'
 *   onClose: () => void
 *   onLoginWithNickname: (nickname: string) => void  — 아이디 찾기 후 로그인 모달에 자동 입력
 */
const FindAccountModal = ({ mode, onClose, onLoginWithNickname }) => {
    // ── 아이디 찾기 상태 ──
    const [idName, setIdName] = useState('');
    const [idPhone, setIdPhone] = useState('');
    const [idResult, setIdResult] = useState(null);   // null | { masked, raw }
    const [idError, setIdError] = useState('');
    const [idLoading, setIdLoading] = useState(false);

    // ── 비밀번호 찾기 상태 ──
    const [pwStep, setPwStep] = useState(1);          // 1: 본인확인, 2: 새 비밀번호 설정
    const [pwNickname, setPwNickname] = useState('');
    const [pwPhone, setPwPhone] = useState('');
    const [pwNew, setPwNew] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [pwError, setPwError] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwSuccess, setPwSuccess] = useState(false);

    // ── 아이디 찾기 제출 ──
    const handleFindId = async (e) => {
        e.preventDefault();
        if (!idName.trim() || !idPhone.trim()) {
            setIdError('이름과 연락처를 모두 입력해 주세요.');
            return;
        }
        setIdLoading(true);
        setIdError('');
        setIdResult(null);
        try {
            const { nickname, error } = await findNicknameByNameAndPhone(idName.trim(), idPhone.trim());
            if (error || !nickname) {
                setIdError(error?.message || '일치하는 회원 정보를 찾을 수 없습니다.');
            } else {
                setIdResult({ masked: maskNickname(nickname), raw: nickname });
            }
        } catch {
            setIdError('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setIdLoading(false);
        }
    };

    // ── 비밀번호 찾기 Step1: 본인 확인 ──
    const handleVerify = async (e) => {
        e.preventDefault();
        if (!pwNickname.trim() || !pwPhone.trim()) {
            setPwError('아이디와 연락처를 모두 입력해 주세요.');
            return;
        }
        setPwLoading(true);
        setPwError('');
        // resetUserPassword로 빈 비밀번호 체크 대신, findNicknameByNameAndPhone 방식과 유사하게
        // 닉네임 + 연락처 매칭을 직접 확인 (resetUserPassword는 step2에서 최종 호출)
        try {
            const { supabase, isSupabaseEnabled } = await import('../services/supabaseClient');
            if (isSupabaseEnabled()) {
                const { data, error } = await supabase
                    .from('users')
                    .select('id')
                    .eq('nickname', pwNickname.trim())
                    .eq('phone', pwPhone.trim())
                    .limit(1)
                    .maybeSingle();
                if (error || !data) {
                    setPwError('아이디 또는 연락처가 일치하지 않습니다.');
                    setPwLoading(false);
                    return;
                }
            } else {
                // localStorage fallback
                const usersListRaw = localStorage.getItem('i_model_users_list');
                const usersList = JSON.parse(usersListRaw || '[]');
                const found = usersList.find(u => u.nickname === pwNickname.trim() && u.phone === pwPhone.trim());
                if (!found) {
                    setPwError('아이디 또는 연락처가 일치하지 않습니다.');
                    setPwLoading(false);
                    return;
                }
            }
            setPwStep(2);
        } catch {
            setPwError('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setPwLoading(false);
        }
    };

    // ── 비밀번호 찾기 Step2: 새 비밀번호 설정 ──
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (pwNew.length < 4) {
            setPwError('비밀번호는 4자 이상이어야 합니다.');
            return;
        }
        if (pwNew !== pwConfirm) {
            setPwError('비밀번호가 일치하지 않습니다.');
            return;
        }
        setPwLoading(true);
        setPwError('');
        try {
            const { success, error } = await resetUserPassword(pwNickname.trim(), pwPhone.trim(), pwNew);
            if (!success) {
                setPwError(error?.message || '비밀번호 변경에 실패했습니다.');
            } else {
                setPwSuccess(true);
            }
        } catch {
            setPwError('오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        } finally {
            setPwLoading(false);
        }
    };

    const inputClass = "w-full px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 outline-none font-bold text-[#1F1235] placeholder:text-[#C8C0E0] transition-all text-sm";
    const btnClass = "w-full py-4 rounded-2xl bg-[#9333EA] text-white font-black text-base shadow-moca hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]";

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl w-full max-w-sm shadow-moca-lg border border-[#E8E0FA] overflow-hidden"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'modalSlideUp 0.25s ease-out' }}
            >
                {/* ── 헤더 ── */}
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#F3E8FF]">
                    <div className="flex items-center gap-2">
                        {/* 비밀번호 찾기 step2에서 뒤로 가기 */}
                        {mode === 'password' && pwStep === 2 && !pwSuccess && (
                            <button
                                onClick={() => { setPwStep(1); setPwError(''); setPwNew(''); setPwConfirm(''); }}
                                className="mr-1 text-[#9CA3AF] hover:text-[#9333EA] transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                            </button>
                        )}
                        <span className="material-symbols-outlined text-[#9333EA] text-[22px]">
                            {mode === 'id' ? 'person_search' : 'lock_reset'}
                        </span>
                        <h2 className="text-lg font-black text-[#1F1235]">
                            {mode === 'id' ? '아이디 찾기' : (pwSuccess ? '변경 완료' : pwStep === 1 ? '비밀번호 찾기' : '새 비밀번호 설정')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#1F1235] transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="px-6 py-6">

                    {/* ════════════════════════════════
                        아이디 찾기
                    ════════════════════════════════ */}
                    {mode === 'id' && !idResult && (
                        <form onSubmit={handleFindId} className="space-y-4">
                            <p className="text-xs text-[#5B4E7A] font-medium leading-relaxed mb-2">
                                가입 시 입력하신 <strong>이름(실명)</strong>과 <strong>연락처</strong>를 입력해 주세요.
                            </p>
                            <input
                                type="text"
                                placeholder="성함(실명)"
                                value={idName}
                                onChange={e => setIdName(e.target.value)}
                                className={inputClass}
                                autoFocus
                            />
                            <input
                                type="tel"
                                placeholder="연락처 (예: 01012345678)"
                                value={idPhone}
                                onChange={e => setIdPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                className={inputClass}
                                maxLength={11}
                            />
                            {idError && (
                                <p className="text-red-500 text-xs font-bold text-center whitespace-pre-line bg-red-50 rounded-xl px-3 py-2">
                                    {idError}
                                </p>
                            )}
                            <button type="submit" disabled={idLoading} className={btnClass}>
                                {idLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        조회 중...
                                    </span>
                                ) : '아이디 찾기'}
                            </button>
                        </form>
                    )}

                    {/* 아이디 찾기 — 결과 */}
                    {mode === 'id' && idResult && (
                        <div className="space-y-5">
                            <div className="bg-[#F3E8FF] rounded-2xl px-5 py-5 text-center border border-[#E8E0FA]">
                                <p className="text-xs text-[#9CA3AF] font-bold mb-2">회원님의 아이디</p>
                                <p className="text-2xl font-black text-[#9333EA] tracking-wider">{idResult.masked}</p>
                                <p className="text-[10px] text-[#C8C0E0] mt-2">개인정보 보호를 위해 일부 마스킹 처리됩니다.</p>
                            </div>
                            <button
                                onClick={() => onLoginWithNickname(idResult.raw)}
                                className={btnClass}
                            >
                                이 아이디로 로그인하기
                            </button>
                            <button
                                onClick={() => { setIdResult(null); setIdName(''); setIdPhone(''); }}
                                className="w-full py-3 rounded-2xl border border-[#E8E0FA] text-[#9CA3AF] font-bold text-sm hover:bg-[#F8F5FF] transition-all"
                            >
                                다시 찾기
                            </button>
                        </div>
                    )}

                    {/* ════════════════════════════════
                        비밀번호 찾기 — Step 1: 본인 확인
                    ════════════════════════════════ */}
                    {mode === 'password' && pwStep === 1 && !pwSuccess && (
                        <form onSubmit={handleVerify} className="space-y-4">
                            <p className="text-xs text-[#5B4E7A] font-medium leading-relaxed mb-2">
                                가입 시 입력하신 <strong>아이디</strong>와 <strong>연락처</strong>로 본인 확인을 진행합니다.
                            </p>
                            <input
                                type="text"
                                placeholder="아이디(닉네임)"
                                value={pwNickname}
                                onChange={e => setPwNickname(e.target.value)}
                                className={inputClass}
                                autoFocus
                            />
                            <input
                                type="tel"
                                placeholder="연락처 (예: 01012345678)"
                                value={pwPhone}
                                onChange={e => setPwPhone(e.target.value.replace(/[^0-9]/g, ''))}
                                className={inputClass}
                                maxLength={11}
                            />
                            {pwError && (
                                <p className="text-red-500 text-xs font-bold text-center bg-red-50 rounded-xl px-3 py-2">
                                    {pwError}
                                </p>
                            )}
                            <button type="submit" disabled={pwLoading} className={btnClass}>
                                {pwLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        확인 중...
                                    </span>
                                ) : '본인 확인'}
                            </button>
                        </form>
                    )}

                    {/* 비밀번호 찾기 — Step 2: 새 비밀번호 설정 */}
                    {mode === 'password' && pwStep === 2 && !pwSuccess && (
                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="flex items-center gap-2 bg-[#F3E8FF] rounded-xl px-4 py-3 mb-1">
                                <span className="material-symbols-outlined text-[#9333EA] text-[16px]">check_circle</span>
                                <p className="text-xs font-black text-[#9333EA]">본인 확인 완료 — {pwNickname}</p>
                            </div>
                            <input
                                type="password"
                                placeholder="새 비밀번호 (4자 이상)"
                                value={pwNew}
                                onChange={e => setPwNew(e.target.value)}
                                className={inputClass}
                                autoFocus
                                minLength={4}
                            />
                            <input
                                type="password"
                                placeholder="새 비밀번호 확인"
                                value={pwConfirm}
                                onChange={e => setPwConfirm(e.target.value)}
                                className={inputClass}
                            />
                            {pwError && (
                                <p className="text-red-500 text-xs font-bold text-center bg-red-50 rounded-xl px-3 py-2">
                                    {pwError}
                                </p>
                            )}
                            <button type="submit" disabled={pwLoading} className={btnClass}>
                                {pwLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        변경 중...
                                    </span>
                                ) : '비밀번호 변경 완료'}
                            </button>
                        </form>
                    )}

                    {/* 비밀번호 변경 완료 */}
                    {mode === 'password' && pwSuccess && (
                        <div className="space-y-5 text-center">
                            <div className="flex flex-col items-center gap-3 py-4">
                                <div className="w-16 h-16 rounded-full bg-[#F3E8FF] flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#9333EA] text-[36px]">check_circle</span>
                                </div>
                                <p className="text-base font-black text-[#1F1235]">비밀번호가 변경되었습니다!</p>
                                <p className="text-xs text-[#9CA3AF]">새 비밀번호로 로그인해 주세요.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className={btnClass}
                            >
                                로그인하러 가기
                            </button>
                        </div>
                    )}

                </div>
            </div>

            <style>{`
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
};

export default FindAccountModal;
