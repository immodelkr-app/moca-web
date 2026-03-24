import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DaumPostcode from 'react-daum-postcode';
import { fetchAgencies } from '../services/agencyService';
import { saveUser, getUser, logoutUser, saveUserToSupabase, GRADE_EMOJI, loginUser, resetUserPassword } from '../services/userService';
import ProfileEditModal from './ProfileEditModal';
import TermsModal, { TERMS } from './shop/TermsModal';
import { sendAlimtalk } from '../services/aligoService';
const AgencyLanding = () => {
    const navigate = useNavigate();
    const [agencyCount, setAgencyCount] = useState(0);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        fetchAgencies().then(data => {
            setAgencyCount(data.length);
            setTimeout(() => setLoaded(true), 100);
        }).catch(() => setLoaded(true));
    }, []);

    const agencyNames = ['에스모델', '레디엔터', '플래티늄', '온에어', '유나스'];

    // ── Auth State ──
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userId, setUserId] = useState('');
    const [userGrade, setUserGrade] = useState('BASIC');
    const [showSignup, setShowSignup] = useState(false);
    const [signupLoading, setSignupLoading] = useState(false);
    const [signupError, setSignupError] = useState('');
    const [signupForm, setSignupForm] = useState({
        nickname: '',
        password: '',
        confirmPassword: '',
        name: '',
        phone: '',
        email: '',
        address: '',
        detailAddress: '',
        referralSource: [],
        agreed: { service: false, privacy: false, third_party: false, marketing: false },
    });
    const [expandedTerm, setExpandedTerm] = useState(null);

    const [showPostcode, setShowPostcode] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [showTerms, setShowTerms] = useState(false);

    const [showLogin, setShowLogin] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginForm, setLoginForm] = useState({
        nickname: '',
        password: '',
    });

    // ── Password Reset State ──
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetError, setResetError] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');
    const [resetForm, setResetForm] = useState({
        nickname: '',
        phone: '',
        newPassword: '',
        confirmNewPassword: '',
    });

    const REFERRAL_OPTIONS = [
        { value: 'sns', label: 'SNS' },
        { value: 'friend', label: '지인소개' },
        { value: 'youtube', label: '유튜브' },
        { value: 'blog', label: '블로그' },
        { value: 'other', label: '기타' },
    ];

    useEffect(() => {
        const storedUser = getUser();
        if (storedUser) {
            setIsLoggedIn(true);
            setUserId(storedUser.nickname || storedUser.name);
            setUserGrade(storedUser.grade || 'BASIC');
        }
    }, []);

    const handleLoginClick = () => {
        setLoginError('');
        setShowLogin(true);
    };

    const handleProtectedNavigation = (path) => {
        if (isLoggedIn) {
            navigate(path);
        } else {
            handleLoginClick();
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginError('');

        if (!loginForm.nickname || !loginForm.password) {
            setLoginError('닉네임과 비밀번호를 모두 입력해 주세요.');
            return;
        }

        setLoginLoading(true);
        try {
            const { user, error } = await loginUser(loginForm.nickname, loginForm.password);
            if (error) {
                setLoginError(error.message);
                return;
            }

            // localStorage (로컬 세션) 에 저장
            saveUser(user);
            setShowLogin(false);
            setIsLoggedIn(true);
            setUserId(user.nickname || user.name);
            setUserGrade(user.grade || 'BASIC');
            navigate('/home/dashboard');
        } catch (err) {
            setLoginError('로그인 중 오류가 발생했습니다.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLoginInputChange = (e) => {
        const { name, value } = e.target;
        setLoginForm(prev => ({ ...prev, [name]: value }));
    };

    const handleResetInputChange = (e) => {
        const { name, value } = e.target;
        setResetForm(prev => ({ ...prev, [name]: value }));
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setResetError('');
        setResetSuccess('');

        if (!resetForm.nickname || !resetForm.phone || !resetForm.newPassword || !resetForm.confirmNewPassword) {
            setResetError('모든 정보를 입력해 주세요.');
            return;
        }

        if (resetForm.newPassword !== resetForm.confirmNewPassword) {
            setResetError('새 비밀번호가 일치하지 않습니다.');
            return;
        }

        if (resetForm.newPassword.length < 6) {
            setResetError('새 비밀번호는 6자리 이상 입력해 주세요.');
            return;
        }

        setResetLoading(true);
        try {
            const { success, error } = await resetUserPassword(resetForm.nickname, resetForm.phone, resetForm.newPassword);
            if (success) {
                setResetSuccess('비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해 주세요.');
                setTimeout(() => {
                    setShowResetModal(false);
                    setShowLogin(true);
                    setResetForm({ nickname: '', phone: '', newPassword: '', confirmNewPassword: '' });
                    setResetSuccess('');
                }, 2000);
            } else {
                setResetError(error?.message || '비밀번호 변경에 실패했습니다.');
            }
        } catch (err) {
            setResetError('서버 통신 중 오류가 발생했습니다.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleLogout = () => {
        logoutUser();
        setIsLoggedIn(false);
        setUserId('');
        setShowSignup(false);
        setSignupForm({ nickname: '', password: '', confirmPassword: '', name: '', phone: '', email: '', address: '', detailAddress: '', referralSource: [], agreed: { service: false, privacy: false, third_party: false, marketing: false } });
    };

    const handleSignupClick = () => {
        setSignupError('');
        setShowSignup(true);
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        setSignupError('');

        // 유효성 검사
        if (!signupForm.nickname || !signupForm.password || !signupForm.name || !signupForm.phone || !signupForm.address) {
            setSignupError('닉네임, 비밀번호, 이름, 휴대번호, 주소는 필수 입력 사항입니다.');
            return;
        }
        if (signupForm.nickname.length < 2 || signupForm.nickname.length > 15) {
            setSignupError('닉네임은 2~15자 사이로 입력해 주세요.');
            return;
        }
        if (signupForm.password.length < 6) {
            setSignupError('비밀번호는 6자 이상이어야 합니다.');
            return;
        }
        if (signupForm.password !== signupForm.confirmPassword) {
            setSignupError('비밀번호가 일치하지 않습니다.');
            return;
        }
        if (signupForm.referralSource.length === 0) {
            setSignupError('가입경로를 하나 이상 선택해 주세요.');
            return;
        }

        const allRequired = TERMS.filter(t => t.required).every(t => signupForm.agreed[t.id]);
        if (!allRequired) {
            setSignupError('필수 서비스 이용약관에 모두 동의해 주세요.');
            return;
        }

        setSignupLoading(true);
        try {
            const userData = {
                nickname: signupForm.nickname,
                password: signupForm.password,
                name: signupForm.name,
                phone: signupForm.phone,
                email: signupForm.email || null,
                address: `${signupForm.address} ${signupForm.detailAddress}`.trim(),
                referralSource: signupForm.referralSource,
                grade: 'SILVER',
                termsAgreed: signupForm.agreed
            };

            // Supabase에 저장 시도
            const { error } = await saveUserToSupabase(userData);
            if (error && !error.message.includes('not configured')) {
                console.warn('Supabase 저장 실패, localStorage로 fallback:', error.message);
            } else if (!error) {
                // 👉 신규 가입 축하 알림톡 자동 발송 처리
                const todayStr = new Date().toLocaleDateString('ko-KR');
                sendAlimtalk('KA01TP260310152626347CbJAWXQnwKi', [{
                    phone: signupForm.phone,
                    name: signupForm.name,
                    variables: {
                        "이름": signupForm.name,
                        "가입일자": todayStr
                    },
                    button: {
                        "button": [
                            {
                                "name": "아임모카 바로가기",
                                "linkType": "WL",
                                "linkTypeName": "웹링크",
                                "linkM": "https://immoca.kr",
                                "linkP": "https://immoca.kr"
                            }
                        ]
                    }
                }]).catch(err => console.error('가입 알림톡 발송 에러:', err));
            }

            // localStorage에도 저장 (로컬 세션용)
            saveUser(userData);
            localStorage.setItem('moca_shop_terms_agreed', JSON.stringify(signupForm.agreed));

            setShowSignup(false);
            setIsLoggedIn(true);
            setUserId(signupForm.nickname);
            navigate('/home/dashboard');
        } catch (err) {
            setSignupError('가입 중 오류가 발생했습니다. 다시 시도해 주세요.');
        } finally {
            setSignupLoading(false);
        }
    };

    const toggleAllTerms = () => {
        const allAgreed = TERMS.every(t => signupForm.agreed[t.id]);
        const newVal = !allAgreed;
        setSignupForm(prev => ({
            ...prev,
            agreed: Object.fromEntries(TERMS.map(t => [t.id, newVal]))
        }));
    };

    const toggleTerm = (id) => {
        setSignupForm(prev => ({
            ...prev,
            agreed: { ...prev.agreed, [id]: !prev.agreed[id] }
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSignupForm(prev => ({ ...prev, [name]: value }));
    };

    const handleCompletePostcode = (data) => {
        let fullAddress = data.address;
        let extraAddress = '';

        if (data.addressType === 'R') {
            if (data.bname !== '') extraAddress += data.bname;
            if (data.buildingName !== '') extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName);
            fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '');
        }

        setSignupForm(prev => ({
            ...prev,
            address: fullAddress
        }));
        setShowPostcode(false);
    };

    const handleReferralChange = (value) => {
        setSignupForm(prev => ({
            ...prev,
            referralSource: prev.referralSource.includes(value)
                ? prev.referralSource.filter(v => v !== value)
                : [...prev.referralSource, value]
        }));
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0f]">
            {/* Animated background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#6C63FF]/30 blur-[100px] animate-pulse" />
                <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-[#A78BFA]/20 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-[#818CF8]/20 blur-[90px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                }}
            />

            {/* ── Header: Login / Signup ── */}
            <header className="absolute top-0 left-0 right-0 z-50 px-6 py-6 flex justify-center text-right">
                <div className="w-full max-w-6xl flex justify-between items-center">
                    {/* Left: Desktop MOCA Logo */}
                    <div className="flex items-center">
                        <span className="bg-gradient-to-r from-[#9B8AFB] to-[#6052FF] bg-clip-text text-transparent text-xl lg:text-3xl font-black tracking-tighter">MOCA</span>
                    </div>

                    {/* Desktop: Align with the w-80 agency box (Left aligned within that box) */}
                    <div className="flex lg:w-80 justify-end lg:justify-start">
                        <div className="flex items-center gap-4">
                            {isLoggedIn ? (
                                <div className="flex items-center gap-4 animate-fadeIn">
                                    <div
                                        onClick={() => setIsProfileModalOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm cursor-pointer hover:bg-white/10 transition-colors"
                                        title="회원 정보 수정"
                                    >
                                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-white/80 text-sm font-medium">
                                            <span className={`font-bold ${userGrade === 'GOLD' ? 'text-[#D4AF37]' : 'text-slate-300'}`}>
                                                {userGrade === 'GOLD' ? '골드모카' : '실버모카'}
                                            </span>{' '}
                                            <span className="text-white font-bold">{userId}</span> 모델님
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="text-white/50 hover:text-white text-sm font-medium transition-colors"
                                    >
                                        로그아웃
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleLoginClick}
                                        className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/5 backdrop-blur-sm text-white text-sm font-medium transition-all"
                                    >
                                        로그인
                                    </button>
                                    <button
                                        onClick={handleSignupClick}
                                        className="px-5 py-2 rounded-full bg-[#6C63FF] hover:bg-[#5a52d5] text-white text-sm font-bold shadow-lg shadow-[#6C63FF]/20 transition-all hover:scale-105"
                                    >
                                        회원가입
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Login Modal ── */}
            {showLogin && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto relative shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-7 pt-7 pb-4 sticky top-0 bg-[#1a1a24] border-b border-white/5 z-10">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#818CF8] text-[20px]">login</span>
                                <h2 className="text-xl font-black text-white">로그인</h2>
                            </div>
                            <button
                                onClick={() => setShowLogin(false)}
                                className="text-white/30 hover:text-white transition-colors p-1"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleLoginSubmit} className="px-7 py-5 space-y-4">
                            {/* 닉네임 */}
                            <div>
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">닉네임</label>
                                <input
                                    type="text"
                                    name="nickname"
                                    value={loginForm.nickname}
                                    onChange={handleLoginInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                    placeholder="가입한 닉네임"
                                />
                            </div>

                            {/* 비밀번호 */}
                            <div>
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">비밀번호</label>
                                <input
                                    type="password"
                                    name="password"
                                    value={loginForm.password}
                                    onChange={handleLoginInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                    placeholder="비밀번호 입력"
                                />
                            </div>

                            {/* 에러 메시지 */}
                            {loginError && (
                                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mt-2">
                                    <span className="material-symbols-outlined text-red-400 text-[18px] mt-0.5 flex-shrink-0">error</span>
                                    <p className="text-red-400 text-sm">{loginError}</p>
                                </div>
                            )}

                            {/* 로그인 버튼 */}
                            <button
                                type="submit"
                                disabled={loginLoading}
                                className="w-full bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] hover:opacity-90 disabled:opacity-50 text-white font-black py-4 rounded-xl mt-4 transition-all shadow-lg shadow-[#6C63FF]/20 text-sm tracking-wide"
                            >
                                {loginLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        확인 중...
                                    </span>
                                ) : '로그인'}
                            </button>

                            <div className="flex justify-center mt-3 border-t border-white/10 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLogin(false);
                                        setShowResetModal(true);
                                    }}
                                    className="text-white/40 hover:text-white/80 transition-colors text-xs font-bold underline underline-offset-4"
                                >
                                    비밀번호가 기억나지 않으시나요?
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Password Reset Modal ── */}
            {showResetModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-sm relative shadow-2xl animate-fadeIn">
                        {/* Header */}
                        <div className="flex items-center justify-between px-7 pt-7 pb-4">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#818CF8] text-[20px]">lock_reset</span>
                                <h2 className="text-xl font-black text-white">비밀번호 찾기</h2>
                            </div>
                            <button
                                onClick={() => setShowResetModal(false)}
                                className="text-white/30 hover:text-white transition-colors p-1"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleResetSubmit} className="px-7 py-5 space-y-4">
                            {/* 안내 문구 */}
                            <p className="text-white/40 text-xs mb-4">
                                가입 시 등록했던 닉네임과 연락처를 입력하시면 비밀번호를 재설정할 수 있습니다.
                            </p>

                            {/* 닉네임 */}
                            <div>
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">닉네임</label>
                                <input
                                    type="text"
                                    name="nickname"
                                    value={resetForm.nickname}
                                    onChange={handleResetInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                    placeholder="가입한 닉네임"
                                />
                            </div>

                            {/* 연락처 */}
                            <div>
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">연락처</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={resetForm.phone}
                                    onChange={handleResetInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                    placeholder="가입 시 연락처 (예: 010-0000-0000)"
                                />
                            </div>

                            {/* 새 비밀번호 */}
                            <div className="pt-2 border-t border-white/10 mt-4">
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">새 비밀번호</label>
                                <input
                                    type="password"
                                    name="newPassword"
                                    value={resetForm.newPassword}
                                    onChange={handleResetInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm mb-3"
                                    placeholder="새 비밀번호 (6자 이상)"
                                />

                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">새 비밀번호 확인</label>
                                <input
                                    type="password"
                                    name="confirmNewPassword"
                                    value={resetForm.confirmNewPassword}
                                    onChange={handleResetInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                    placeholder="새 비밀번호 재입력"
                                />
                            </div>

                            {/* 메시지 */}
                            {resetError && (
                                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mt-2">
                                    <span className="material-symbols-outlined text-red-400 text-[18px] mt-0.5 flex-shrink-0">error</span>
                                    <p className="text-red-400 text-sm">{resetError}</p>
                                </div>
                            )}

                            {resetSuccess && (
                                <div className="flex items-start gap-2 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mt-2">
                                    <span className="material-symbols-outlined text-green-400 text-[18px] mt-0.5 flex-shrink-0">check_circle</span>
                                    <p className="text-green-400 text-sm">{resetSuccess}</p>
                                </div>
                            )}

                            {/* 변경 버튼 */}
                            <button
                                type="submit"
                                disabled={resetLoading}
                                className="w-full bg-gradient-to-r from-[#818CF8] to-[#6052FF] hover:opacity-90 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg shadow-[#6C63FF]/20 text-sm tracking-wide mt-2"
                            >
                                {resetLoading ? '확인 중...' : '비밀번호 재설정'}
                            </button>

                        </form>
                    </div>
                </div>
            )}

            {/* ── Sign Up Modal ── */}
            {showSignup && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1a1a24] border border-white/10 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto relative shadow-2xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-7 pt-7 pb-4 sticky top-0 bg-[#1a1a24] border-b border-white/5 z-10">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#818CF8] text-[20px]">person_add</span>
                                <h2 className="text-xl font-black text-white">회원가입</h2>
                            </div>
                            <button
                                onClick={() => setShowSignup(false)}
                                className="text-white/30 hover:text-white transition-colors p-1"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSignupSubmit} className="px-7 py-5 space-y-4">

                            {/* 회원가입 정보 섹션 */}
                            <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-[#818CF8] text-[16px]">person</span>
                                <span className="text-xs font-black text-white/60 uppercase tracking-widest">회원가입 정보</span>
                            </div>
                            <div className="w-full h-px bg-white/10 mb-3" />

                            {/* 닉네임 */}
                            <div>
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">닉네임 <span className="text-white/40 font-normal">(한국어 닉네임 사용가능)</span> <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    name="nickname"
                                    value={signupForm.nickname}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                    placeholder="영문/한글 2~15자"
                                    maxLength={15}
                                />
                            </div>

                            {/* 비밀번호 */}
                            <div>
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">비밀번호 <span className="text-red-400">*</span></label>
                                <input
                                    type="password"
                                    name="password"
                                    value={signupForm.password}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                    placeholder="6자 이상 입력"
                                />
                            </div>

                            {/* 비밀번호 확인 */}
                            <div>
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">비밀번호 확인 <span className="text-red-400">*</span></label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={signupForm.confirmPassword}
                                        onChange={handleInputChange}
                                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-colors text-sm ${signupForm.confirmPassword && signupForm.password !== signupForm.confirmPassword
                                            ? 'border-red-500/60 focus:border-red-500'
                                            : signupForm.confirmPassword && signupForm.password === signupForm.confirmPassword
                                                ? 'border-green-500/60 focus:border-green-500'
                                                : 'border-white/10 focus:border-[#6C63FF]'
                                            }`}
                                        placeholder="비밀번호 재입력"
                                    />
                                    {signupForm.confirmPassword && (
                                        <span className={`absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] ${signupForm.password === signupForm.confirmPassword ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                            {signupForm.password === signupForm.confirmPassword ? 'check_circle' : 'cancel'}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* 이름 */}
                            <div>
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">이름 <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    name="name"
                                    value={signupForm.name}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                    placeholder="홍길동"
                                />
                            </div>

                            {/* 휴대번호 */}
                            <div>
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">휴대번호 <span className="text-red-400">*</span></label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={signupForm.phone}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                    placeholder="010-0000-0000"
                                />
                            </div>

                            {/* 이메일 (선택) */}
                            <div>
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">
                                    이메일
                                    <span className="ml-2 text-white/30 font-medium normal-case">(선택)</span>
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={signupForm.email}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                    placeholder="example@email.com"
                                />
                            </div>

                            {/* 주소 */}
                            <div>
                                <label className="block text-white/60 text-xs font-bold mb-1.5 ml-0.5">주소 <span className="text-red-400">*</span></label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        name="address"
                                        value={signupForm.address}
                                        readOnly
                                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none transition-colors text-sm cursor-not-allowed"
                                        placeholder="주소 검색을 이용해주세요"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPostcode(true)}
                                        className="px-4 py-3 bg-[#1a1a24] border border-white/10 rounded-xl text-white text-sm font-bold hover:bg-white/5 transition-colors whitespace-nowrap"
                                    >
                                        주소 검색
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    name="detailAddress"
                                    value={signupForm.detailAddress}
                                    onChange={handleInputChange}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#6C63FF] transition-colors text-sm"
                                    placeholder="상세 주소 입력"
                                />
                            </div>

                            {/* 가입경로 */}
                            <div className="pt-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-[#818CF8] text-[16px]">explore</span>
                                    <span className="text-xs font-black text-white/60 uppercase tracking-widest">가입경로 <span className="text-red-400">*</span></span>
                                </div>
                                <div className="w-full h-px bg-white/10 mb-3" />
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                    {REFERRAL_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => handleReferralChange(opt.value)}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${signupForm.referralSource.includes(opt.value)
                                                ? 'bg-[#6C63FF]/20 border-[#6C63FF] text-[#818CF8]'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            <span className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${signupForm.referralSource.includes(opt.value) ? 'bg-[#6C63FF]' : 'bg-white/10'
                                                }`}>
                                                {signupForm.referralSource.includes(opt.value) && (
                                                    <span className="material-symbols-outlined text-white text-[12px]">check</span>
                                                )}
                                            </span>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 서비스 이용약관 동의 */}
                            <div className="pt-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="material-symbols-outlined text-[#818CF8] text-[16px]">verified_user</span>
                                    <span className="text-xs font-black text-white/60 uppercase tracking-widest">서비스 이용 동의 <span className="text-red-400">*</span></span>
                                </div>
                                <div className="w-full h-px bg-white/10 mb-3" />

                                <button
                                    type="button"
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border mb-3 transition-all ${TERMS.every(t => signupForm.agreed[t.id])
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-white shadow-md shadow-indigo-500/10'
                                        : 'bg-white/10 border-white/30 text-white hover:bg-white/15 shadow-sm'}`}
                                    onClick={toggleAllTerms}
                                >
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${TERMS.every(t => signupForm.agreed[t.id]) ? 'bg-indigo-500 border-indigo-500' : 'border-white/50 bg-black/20'}`}>
                                        {TERMS.every(t => signupForm.agreed[t.id]) && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                                    </div>
                                    <span className="font-bold text-sm">전체 동의 (선택 포함)</span>
                                </button>

                                <div className="space-y-2 mb-2">
                                    {TERMS.map(term => (
                                        <div key={term.id} className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
                                            <div className="flex items-center justify-between p-3">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleTerm(term.id)}
                                                    className="flex items-center gap-2 text-left flex-1"
                                                >
                                                    <div className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${signupForm.agreed[term.id] ? 'bg-indigo-500 border-indigo-500' : 'border-white/30'}`}>
                                                        {signupForm.agreed[term.id] && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                                                    </div>
                                                    <span className="text-white/80 text-xs font-medium pr-1">
                                                        <span className={`mr-1 font-bold shrink-0 ${term.required ? 'text-indigo-400' : 'text-white/40'}`}>
                                                            {term.required ? '[필수]' : '[선택]'}
                                                        </span>
                                                        {term.title}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedTerm(expandedTerm === term.id ? null : term.id)}
                                                    className="text-white/30 hover:text-white/60 text-[10px] border border-white/15 rounded-lg px-2 py-1 shrink-0 ml-1"
                                                >
                                                    {expandedTerm === term.id ? '닫기' : '보기'}
                                                </button>
                                            </div>
                                            {expandedTerm === term.id && (
                                                <div className="px-3 pb-3">
                                                    <pre className="text-white/50 text-[10px] leading-relaxed whitespace-pre-wrap font-sans bg-black/40 rounded-lg p-3 max-h-32 overflow-y-auto border border-white/5">
                                                        {term.content}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>


                            {/* 에러 메시지 */}
                            {signupError && (
                                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                                    <span className="material-symbols-outlined text-red-400 text-[18px] mt-0.5 flex-shrink-0">error</span>
                                    <p className="text-red-400 text-sm">{signupError}</p>
                                </div>
                            )}

                            {/* 가입 버튼 */}
                            <button
                                type="submit"
                                disabled={signupLoading}
                                className="w-full bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] hover:opacity-90 disabled:opacity-50 text-white font-black py-4 rounded-xl mt-2 transition-all shadow-lg shadow-[#6C63FF]/20 text-sm tracking-wide"
                            >
                                {signupLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        저장 중...
                                    </span>
                                ) : '가입하기'}
                            </button>

                            <p className="text-center text-white/20 text-xs pb-2">
                                <span className="text-red-400">*</span> 표시는 필수 항목입니다
                            </p>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Terms Modal (Signup) ── */}
            {showTerms && (
                <div className="fixed inset-0 z-[600]">
                    <TermsModal
                        onComplete={handleTermsComplete}
                        onClose={() => setShowTerms(false)}
                    />
                </div>
            )}

            {/* ── 반응형 콘텐츠 래퍼 ── */}
            <div
                className={`relative z-10 w-full max-w-6xl mx-auto px-6 py-4 transition-all duration-700
                    flex flex-col lg:flex-row lg:items-center lg:gap-20 mt-0 lg:mt-4
                    ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
            >
                {/* ── 왼쪽: 텍스트 영역 ── */}
                <div className="flex-1 flex flex-col items-center lg:items-center text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm mb-4">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs font-semibold text-white/70 tracking-widest uppercase">광고 에이전시</span>
                    </div>

                    {/* Main title or Welcome Message */}
                    {isLoggedIn ? (
                        <div className="mb-4 animate-slideUp flex flex-col items-center w-full">
                            <h1 className="text-xl lg:text-3xl font-bold text-white leading-relaxed tracking-tight mb-4 break-keep text-center">
                                모두의 캐스팅매니저,<br />
                                아임모카(IM MOCA)
                            </h1>
                            <div className="mb-2 flex flex-col items-center justify-center font-sans tracking-tighter w-full">
                                <span className="bg-gradient-to-br from-[#C4B5FD] via-[#907FF8] to-[#5B21B6] bg-clip-text text-transparent text-6xl lg:text-[120px] font-black leading-tight pt-2 pr-4 mb-2" style={{ textShadow: "0 10px 40px rgba(123, 97, 255, 0.5)" }}>MOCA</span>
                                <span className="text-white/50 text-xl lg:text-3xl font-bold">(모카)</span>
                            </div>

                            <div className="mt-4 mb-4 text-center">
                                <p className="text-white/80 text-lg lg:text-xl font-bold leading-relaxed mb-2">
                                    "연습만이 답이다"
                                </p>
                                <p className="text-[#907FF8] text-lg font-bold tracking-widest">
                                    - MOCA -
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center w-full">
                            <h1 className="text-xl lg:text-3xl font-bold text-white leading-relaxed tracking-tight mb-4 break-keep text-center">
                                모두의 캐스팅매니저,<br />
                                아임모카(IM MOCA)
                            </h1>
                            <div className="mb-2 flex flex-col items-center justify-center font-sans tracking-tighter w-full">
                                <span className="bg-gradient-to-br from-[#C4B5FD] via-[#907FF8] to-[#5B21B6] bg-clip-text text-transparent text-6xl lg:text-[120px] font-black leading-tight pt-2 pr-4 mb-2" style={{ textShadow: "0 10px 40px rgba(123, 97, 255, 0.5)" }}>MOCA</span>
                                <span className="text-white/50 text-xl lg:text-3xl font-bold">(모카)</span>
                            </div>

                            <div className="mt-4 mb-4 text-center">
                                <p className="text-white/80 text-lg lg:text-xl font-bold leading-relaxed mb-2">
                                    "연습만이 답이다"
                                </p>
                                <p className="text-[#907FF8] text-lg font-bold tracking-widest">
                                    - MOCA -
                                </p>
                            </div>

                            <p className="text-white/80 text-sm lg:text-lg font-bold mb-2 leading-relaxed text-center whitespace-normal break-keep">
                                광고모델이라면 꼭! 등록해야 할 광고에이전시!!
                            </p>
                            <p className="text-white/30 text-xs lg:text-sm mb-6 text-center">
                                총 <span className="text-white/60 font-bold">{agencyCount}</span>개 에이전시 등록됨
                            </p>
                        </div>
                    )}

                    {/* CTA Button — 단일 풀너비 버튼 */}
                    <div className="w-full max-w-xs lg:max-w-sm">
                        <button
                            onClick={() => handleProtectedNavigation('/agencies')}
                            className="group relative w-full py-4 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-bold text-base tracking-wide shadow-lg shadow-[#6C63FF]/30 hover:shadow-[#6C63FF]/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 overflow-hidden"
                        >
                            <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="relative flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">apartment</span>
                                에이전시 리스트
                            </span>
                        </button>
                    </div>

                    {/* Agency preview chips */}
                    {!isLoggedIn && (
                        <div className="mt-10 flex flex-wrap gap-2 justify-center lg:justify-start">
                            {agencyNames.map((name, i) => (
                                <span
                                    key={name}
                                    className="px-3 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/40"
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                >
                                    {name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── 오른쪽: PC 전용 정보 카드 ── */}
                <div className="hidden lg:flex flex-col gap-4 w-80 flex-shrink-0">
                    {/* Stats card */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-4">등록 에이전시</p>
                        <div className="space-y-3">
                            {agencyNames.map((name, i) => (
                                <div key={name} className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-[#6C63FF]/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-[#818CF8] text-[11px] font-black">{i + 1}</span>
                                    </div>
                                    <span className="text-white/60 text-sm font-medium">{name}</span>
                                    <span className="ml-auto text-[10px] text-white/25 font-bold uppercase">Model</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick links */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
                        <button
                            onClick={() => handleProtectedNavigation('/agencies')}
                            className="w-full flex flex-col items-center gap-2 py-3 rounded-xl hover:bg-white/5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[24px] text-[#818CF8]">apartment</span>
                            <span className="text-white/40 text-[11px] font-bold">에이전시 리스트</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer with legal & business info */}
            <div className="relative z-10 w-full mt-auto pt-8 pb-6 border-t border-white/5">
                <div className="max-w-2xl mx-auto px-6 text-center space-y-3">
                    {/* Legal links */}
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                        <a href="/privacy" className="text-white/30 text-[11px] font-bold hover:text-white/60 transition-colors">개인정보처리방침</a>
                        <span className="text-white/10 text-[11px]">|</span>
                        <a href="/terms" className="text-white/30 text-[11px] font-bold hover:text-white/60 transition-colors">서비스 이용약관</a>
                    </div>
                    {/* Business info */}
                    <div className="text-white/15 text-[10px] leading-relaxed space-y-0.5">
                        <p>글로벌아임 | 대표 : 김대희 | 사업자등록번호 : 365-22-00947</p>
                        <p>통신판매업 신고번호 : 제2021-서울강남-05756호</p>
                        <p>주소 : 서울시 영등포구 영중로 159, 7층 글로벌아임</p>
                        <p>이메일 : immodelkr@gmail.com | 호스팅서비스 : Vercel Inc.</p>
                        <p className="pt-1">© 2026 글로벌아임(IMMOCA). All rights reserved.</p>
                    </div>
                </div>
            </div>

            {/* ── Daum Postcode Modal ── */}
            {showPostcode && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl w-full max-w-md overflow-hidden relative">
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200">
                            <h3 className="text-gray-800 font-bold">주소 검색</h3>
                            <button
                                onClick={() => setShowPostcode(false)}
                                className="text-gray-500 hover:text-gray-800 transition-colors p-1"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <DaumPostcode
                            onComplete={handleCompletePostcode}
                            style={{ height: '400px', width: '100%' }}
                        />
                    </div>
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
        </div>
    );
};

export default AgencyLanding;
