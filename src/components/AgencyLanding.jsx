import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DaumPostcode from 'react-daum-postcode';
import { fetchAgencies } from '../services/agencyService';
import { saveUser, getUser, logoutUser, saveUserToSupabase, loginUser, checkNicknameDuplicate, signInWithSocial } from '../services/userService';
import { isPasskeySupported, loginWithPasskey } from '../services/passkeyService';
import { fetchHomepageSettings } from '../services/settingsService';


import ProfileEditModal from './ProfileEditModal';
import TermsModal from './TermsModal';
import FindAccountModal from './FindAccountModal';

// ── 약관 내용 ──
const TERMS_CONTENT = {
    service: `제1조 (목적)
본 약관은 MOCA 서비스(이하 "서비스") 이용에 관한 조건 및 절차를 규정합니다.

제2조 (서비스 이용)
① 서비스는 MOCA 앱 가입 회원에게만 제공됩니다.
② 회원은 타인의 계정을 사용할 수 없습니다.
③ 회원은 서비스를 통해 에이전시 정보 조회, 프로필 발송, 광고모델 활동 지원 기능을 이용할 수 있습니다.

제3조 (책임 제한)
회사는 서비스 중단, 오류 등으로 인한 손해에 대해 법이 허용하는 범위 내에서 책임을 집니다.`,
    privacy: `■ 수집 항목
- 필수: 닉네임, 휴대폰번호, 성함
- 선택: 이메일, 주소

■ 수집 목적
- 회원 식별 및 앱 서비스 제공
- 광고모델 활동 지원 및 에이전시 연결 서비스

■ 보유 기간
- 회원 탈퇴 시 즉시 삭제

■ 동의 거부 시 불이익
개인정보 수집·이용에 동의하지 않으실 수 있으나, 동의 거부 시 앱 서비스 가입 및 이용이 불가합니다.`,
    marketing: `■ 수신 채널
카카오톡 알림, SMS

■ 발송 내용
- 멤버 등급 전용 이벤트 안내
- 서비스 업데이트 및 공지사항

■ 수신 동의는 언제든 철회 가능합니다.
(앱 설정 > 알림 관리 > 마케팅 수신 해제)`,
};


const AgencyLanding = () => {

    const navigate = useNavigate();
    const [agencyCount, setAgencyCount] = useState(0);
    const [loaded, setLoaded] = useState(false);

    const [homeSettings, setHomeSettings] = useState({
        heroBadgeGuest: 'I\'m Model Agency Platform',
        heroTitle1: '스마트한 광고모델\n활동을 위한',
        heroTitle2: '나의 광고모델 매니저\n아임모카',
        heroHighlightWord: '아임모카',
        heroSubtitle1: '중요 이상의 정보를',
        heroSubtitle2: '한눈에 확인하고, 광고모델 전문 프로필을 단 1분만에 완성하여 스마트한 광고모델 활동을 시작해보세요!',
        feature1Icon: 'apartment',
        feature1Title: '중요 모델 에이전시 리스트',
        feature1Desc: '실시간으로 업데이트되는 {{count}}개 에이전시의 주소와 연락처, 특징을 한눈에.',
        feature2Icon: 'forward_to_inbox',
        feature2Title: '간편 프로필 발송',
        feature2Desc: '번거로운 이메일 발송은 이제 그만. 클릭 한 번으로 수십 곳의 에이전시에 프로필을 전달하세요.',
        feature3Icon: 'event_note',
        feature3Title: '투어일지 & 캘린더',
        feature3Desc: '내가 보낸 프로필과 투어 일정을 체계적으로 관리하고 다른 모델들과 정보를 공유하세요.',
    });

    useEffect(() => {
        fetchAgencies().then(data => {
            setAgencyCount(data.length);
            setTimeout(() => setLoaded(true), 100);
        }).catch(() => setLoaded(true));

        // 홈화면 설정 불러오기
        fetchHomepageSettings().then(({ data }) => {
            if (data && Object.keys(data).length > 0) {
                setHomeSettings(prev => ({ ...prev, ...data }));
            }
        });
    }, []);


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
        gender: null,
        agreed: { service: false, privacy: false, marketing: false },
    });

    const [showPostcode, setShowPostcode] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showRefundPolicy, setShowRefundPolicy] = useState(false);

    const [showLogin, setShowLogin] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [loginForm, setLoginForm] = useState({
        nickname: '',
        password: '',
    });
    const [findMode, setFindMode] = useState(null); // null | 'id' | 'password'
    const [expandedTerm, setExpandedTerm] = useState(null); // 약관 펼치기 상태

    // ── 닉네임 중복 확인 관련 상태 ──
    const [isNicknameChecked, setIsNicknameChecked] = useState(false);
    const [nicknameCheckedValue, setNicknameCheckedValue] = useState('');
    const [nicknameCheckLoading, setNicknameCheckLoading] = useState(false);
    const [nicknameCheckMessage, setNicknameCheckMessage] = useState('');
    const [biometricSupported, setBiometricSupported] = useState(false);

    useEffect(() => {
        isPasskeySupported().then(setBiometricSupported);
    }, []);

    useEffect(() => {
        const storedUser = getUser();
        if (storedUser) {
            setIsLoggedIn(true);
            setUserId(storedUser.name || storedUser.nickname || '');
            setUserGrade(storedUser.grade || 'BASIC');
        } else {
            // 비로그인 상태이고, 보호된 라우트 진입 시도로 인해 리다이렉트되어 들어온 경우 로그인 모달 자동 활성화
            const redirectTo = sessionStorage.getItem('redirect_to');
            if (redirectTo) {
                setTimeout(() => {
                    setShowLogin(true);
                }, 300); // 렌더링이 완료된 후 매끄러운 트랜지션을 위해 딜레이 부여
            }
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



    const handleLoginSuccess = (userObj) => {
        sessionStorage.setItem('interactive_login', 'true');
        const user = userObj || getUser();
        if (user) {
            setIsLoggedIn(true);
            setUserId(user.name || user.nickname || '');
            setUserGrade(user.grade || 'BASIC');
        }
        setShowLogin(false);
        setShowSignup(false);

        const redirectTo = sessionStorage.getItem('redirect_to');
        if (redirectTo) {
            sessionStorage.removeItem('redirect_to');
            navigate(redirectTo, { replace: true });
        } else {
            navigate('/home/dashboard');
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        try {
            const { user, error: loginErr } = await loginUser(loginForm.nickname, loginForm.password);
            if (loginErr) throw loginErr;
            
            saveUser(user);
            handleLoginSuccess(user);
        } catch (err) {
            setLoginError(err.message || '로그인에 실패했습니다.');
        } finally {
            setLoginLoading(false);
        }
    };

    // [신규] 지문/생체 로그인 처리
    const handlePasskeyLogin = async () => {
        setLoginLoading(true);
        setLoginError('');
        try {
            const { success, user } = await loginWithPasskey();
            if (success && user) {
                handleLoginSuccess(user);
            }
        } catch (err) {
            console.error('[Passkey] Login handler failed:', err);
            // 에러 메시지 처리 (취소한 경우는 제외하는 것이 좋음)
            if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
                setLoginError('생체 인증 로그인에 실패했습니다. (등록 여부 확인 필요)');
            }
        } finally {
            setLoginLoading(false);
        }
    };


    // ── 닉네임 중복 확인 ──
    const handleCheckNickname = async () => {
        if (!signupForm.nickname) {
            alert('아이디를 입력해 주세요.');
            return;
        }
        setNicknameCheckLoading(true);
        setNicknameCheckMessage('');
        try {
            const { available, error } = await checkNicknameDuplicate(signupForm.nickname);
            if (error) throw error;
            if (available) {
                setIsNicknameChecked(true);
                setNicknameCheckedValue(signupForm.nickname);
                setNicknameCheckMessage('사용 가능한 아이디입니다.');
            } else {
                setIsNicknameChecked(false);
                setNicknameCheckMessage('이미 사용 중인 아이디입니다.');
            }
        } catch (err) {
            setNicknameCheckMessage('중복 확인 중 오류가 발생했습니다.');
        } finally {
            setNicknameCheckLoading(false);
        }
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        if (signupForm.password !== signupForm.confirmPassword) {
            setSignupError('비밀번호가 일치하지 않습니다.');
            return;
        }

        if (!isNicknameChecked || signupForm.nickname !== nicknameCheckedValue) {
            setSignupError('아이디 중복 확인을 해주세요.');
            return;
        }

        if (!signupForm.agreed.service || !signupForm.agreed.privacy) {
            setSignupError('필수 약관에 동의해 주세요.');
            return;
        }



        setSignupLoading(true);
        setSignupError('');
        try {
            const newUser = {
                ...signupForm,
                address_detail: signupForm.detailAddress || '',
                grade: 'SILVER',
                terms_consent: signupForm.agreed.service && signupForm.agreed.privacy,
                created_at: new Date().toISOString(),
            };
            const { data, error: signupErr } = await saveUserToSupabase(newUser);
            if (signupErr) throw signupErr;

            const finalUser = data || newUser;
            saveUser(finalUser);
            handleLoginSuccess(finalUser);
        } catch (err) {
            setSignupError(err.message || '회원가입에 실패했습니다.');
        } finally {
            setSignupLoading(false);
        }
    };

    const handleCompletePostcode = (data) => {
        let fullAddress = data.address;
        let extraAddress = '';
        if (data.addressType === 'R') {
            if (data.bname !== '') extraAddress += data.bname;
            if (data.buildingName !== '') extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName);
            fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '');
        }
        setSignupForm(prev => ({ ...prev, address: fullAddress }));
        setShowPostcode(false);
    };

    return (
        <div className="min-h-screen flex flex-col font-display" style={{ backgroundColor: 'var(--moca-bg)' }}>
            {/* ── 상단 네비 바 ── */}
            <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-[#E8E0FA] z-[200] flex items-center justify-between px-5 md:px-10 pb-3" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-2xl font-black tracking-tighter">MOCA</span>
                <div className="flex items-center gap-3">
                    {isLoggedIn ? (
                        <button
                            onClick={() => navigate('/home/dashboard')}
                            className="bg-[#9333EA] text-white px-5 py-2 rounded-full font-black text-sm shadow-moca hover:opacity-90 transition-all"
                        >
                            대시보드
                        </button>
                    ) : (
                        <>
                            <button onClick={handleLoginClick} className="text-[#5B4E7A] font-bold text-sm px-3 py-2">로그인</button>
                            <button
                                onClick={() => setShowSignup(true)}
                                className="bg-[#9333EA] text-white px-5 py-2 rounded-full font-black text-sm shadow-moca hover:opacity-90 transition-all"
                            >
                                회원가입
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* ── 히어로 섹션 ── */}
            <section className="pt-32 pb-20 px-5 text-center">
                <div className={`transition-all duration-1000 transform ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-[#F3E8FF] text-[#9333EA] text-xs font-bold tracking-widest mb-4 uppercase">
                        {homeSettings.heroBadgeGuest}
                    </span>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-[#1F1235] leading-tight tracking-tight mb-6">
                        {homeSettings.heroTitle1?.split('\n').map((line, i) => (
                            <React.Fragment key={i}>{line}<br /></React.Fragment>
                        ))}
                        <span className="text-[#9333EA]">
                            {homeSettings.heroTitle2?.split('\n').map((line, i) => (
                                <React.Fragment key={i}>{line}{i < homeSettings.heroTitle2.split('\n').length - 1 ? <br /> : ''}</React.Fragment>
                            ))}
                        </span>
                    </h1>
                    <p className="text-[#5B4E7A] text-base max-w-lg mx-auto mb-10 leading-relaxed font-medium">
                        {homeSettings.heroSubtitle1.includes('{{count}}') 
                            ? homeSettings.heroSubtitle1.replace('{{count}}', agencyCount)
                            : homeSettings.heroSubtitle1.replace(' 이상의 정보를', ` ${agencyCount}개 이상의 정보를`)
                        }
                        <br />
                        {homeSettings.heroSubtitle2}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => handleProtectedNavigation('/agencies')}
                            className="w-full sm:w-auto px-10 py-5 rounded-3xl bg-[#9333EA] text-white font-bold text-lg shadow-moca-lg hover:scale-105 active:scale-95 transition-all"
                        >
                            에이전시 투어 시작하기
                        </button>
                        <button
                            onClick={() => handleProtectedNavigation('/home/smart-profile')}
                            className="w-full sm:w-auto px-10 py-5 rounded-3xl bg-white border-2 border-[#E8E0FA] text-[#1F1235] font-bold text-lg hover:bg-[#F8F5FF] transition-all"
                        >
                            스마트 프로필 만들기
                        </button>
                    </div>
                </div>
            </section>

            {/* ── 주요 기능 섹션 ── */}
            <section className="py-20 bg-white">
                <div className="max-w-6xl mx-auto px-5">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-[#F8F5FF] border border-[#E8E0FA]">
                            <span className="material-symbols-outlined text-[#9333EA] text-4xl mb-4">{homeSettings.feature1Icon || 'apartment'}</span>
                            <h3 className="text-xl font-bold text-[#1F1235] mb-3">{homeSettings.feature1Title || '중요 모델 에이전시 리스트'}</h3>
                            <p className="text-[#5B4E7A] text-sm leading-relaxed font-medium">
                                {(homeSettings.feature1Desc || '실시간으로 업데이트되는 {{count}}개 에이전시의 주소와 연락처, 특징을 한눈에.')
                                    .replace('{{count}}', agencyCount)}
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-[#F8F5FF] border border-[#E8E0FA]">
                            <span className="material-symbols-outlined text-[#9333EA] text-4xl mb-4">{homeSettings.feature2Icon || 'forward_to_inbox'}</span>
                            <h3 className="text-xl font-bold text-[#1F1235] mb-3">{homeSettings.feature2Title || '간편 프로필 발송'}</h3>
                            <p className="text-[#5B4E7A] text-sm leading-relaxed font-medium">
                                {(homeSettings.feature2Desc || '번거로운 이메일 발송은 이제 그만. 클릭 한 번으로 수십 곳의 에이전시에 프로필을 전달하세요.')
                                    .replace('{{count}}', agencyCount)}
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-[#F8F5FF] border border-[#E8E0FA]">
                            <span className="material-symbols-outlined text-[#9333EA] text-4xl mb-4">{homeSettings.feature3Icon || 'event_note'}</span>
                            <h3 className="text-xl font-bold text-[#1F1235] mb-3">{homeSettings.feature3Title || '투어일지 & 캘린더'}</h3>
                            <p className="text-[#5B4E7A] text-sm leading-relaxed font-medium">
                                {(homeSettings.feature3Desc || '내가 보낸 프로필과 투어 일정을 체계적으로 관리하고 다른 모델들과 정보를 공유하세요.')
                                    .replace('{{count}}', agencyCount)}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 푸터 ── */}
            <footer className="w-full border-t border-[#E8E0FA] bg-[#F8F5FF] px-6 py-12">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="text-center md:text-left">
                        <span className="text-[#9333EA] text-xl font-black tracking-tighter">MOCA</span>
                        <p className="text-[#9CA3AF] text-xs font-bold mt-2">© 2026 글로벌 아임(IMMOCA). All rights reserved.</p>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-4">
                        <div className="flex items-center gap-4 text-xs font-bold text-[#5B4E7A]">
                            <a href="/privacy" className="hover:text-[#9333EA]">개인정보처리방침</a>
                            <span className="text-[#E8E0FA]">|</span>
                            <button onClick={() => setShowTerms(true)} className="hover:text-[#9333EA]">이용약관</button>
                        </div>
                        <p className="text-[#9CA3AF] text-[10px] text-center md:text-right leading-loose">
                            <span className="font-bold text-[#7C3AED]">아임모카</span> 대표 : 김대희 | 사업자등록번호 : 365-22-00947 | 통신판매업 제2021-서울강남-05756호<br />
                            서울시 영등포구 영중로 159, 7층<br />
                            <span className="font-bold text-[#7C3AED]">글로벌 아임</span> 서울시 강남구 도곡로17길 16, 102동 303호<br />
                            immodelkr@gmail.com | 호스팅서비스: Vercel Inc.
                        </p>
                    </div>
                </div>
            </footer>

            {/* ── 로그인 모달 ── */}
            {showLogin && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-5 sm:p-8 w-full max-w-sm shadow-moca-lg relative border border-[#E8E0FA]">
                        <button onClick={() => setShowLogin(false)} className="absolute top-6 right-6 text-[#9CA3AF] hover:text-[#1F1235]">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h2 className="text-2xl font-black text-[#1F1235] mb-8 text-center">로그인</h2>
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <input
                                type="text"
                                placeholder="아이디(닉네임)"
                                value={loginForm.nickname}
                                onChange={(e) => setLoginForm({ ...loginForm, nickname: e.target.value })}
                                className="w-full px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] focus:border-[#9333EA] outline-none font-bold text-[#1F1235] text-sm"
                                required
                            />
                            <input
                                type="password"
                                placeholder="비밀번호"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] focus:border-[#9333EA] outline-none font-bold text-[#1F1235] text-sm"
                                required
                            />
                            {loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}
                            <button
                                type="submit"
                                disabled={loginLoading}
                                className="w-full py-3.5 rounded-2xl bg-[#9333EA] text-white font-black text-base shadow-moca hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                {loginLoading ? '로그인 중...' : '로그인'}
                            </button>

                            {/* [신규] 지문/생체인식 로그인 버튼 */}
                            {biometricSupported && (
                                <button
                                    type="button"
                                    onClick={handlePasskeyLogin}
                                    disabled={loginLoading}
                                    className="w-full py-3.5 rounded-2xl bg-[#F3E8FF] text-[#7C3AED] font-black text-base border-2 border-[#E8D5FF] flex items-center justify-center gap-2 hover:bg-[#EDE0FF] transition-all"
                                >
                                    <span className="material-symbols-outlined text-[24px]">fingerprint</span>
                                    <span>지문 / 생체인식 로그인</span>
                                </button>
                            )}





                        </form>

                        {/* 아이디 찾기 / 비밀번호 찾기 */}
                        <div className="flex items-center justify-center gap-3 mt-6 mb-1">
                            <button
                                type="button"
                                onClick={() => setFindMode('id')}
                                className="text-[11px] text-[#9CA3AF] font-bold hover:text-[#9333EA] transition-colors"
                            >
                                아이디 찾기
                            </button>
                            <span className="text-[#E8E0FA] text-xs">|</span>
                            <button
                                type="button"
                                onClick={() => setFindMode('password')}
                                className="text-[11px] text-[#9CA3AF] font-bold hover:text-[#9333EA] transition-colors"
                            >
                                비밀번호 찾기
                            </button>
                        </div>
                        <div className="mt-4 text-center">
                            <button onClick={() => { setShowLogin(false); setShowSignup(true); }} className="text-[#9CA3AF] text-sm font-bold hover:text-[#9333EA]">
                                아직 회원이 아니신가요? <span className="text-[#9333EA]">회원가입</span>
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* ── 회원가입 모달 ── */}
            {showSignup && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-5 sm:p-8 w-full max-w-md shadow-moca-lg relative border border-[#E8E0FA] max-h-[90vh] overflow-y-auto hide-scrollbar">
                        <button onClick={() => setShowSignup(false)} className="absolute top-6 right-6 text-[#9CA3AF] hover:text-[#1F1235]">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h2 className="text-2xl font-black text-[#1F1235] mb-8 text-center">회원가입</h2>
                        <form onSubmit={handleSignupSubmit} className="space-y-5">
                            {/* 아이디 (닉네임) */}
                            <div className="space-y-1.5">
                                <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">아이디 (닉네임)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="사용하실 아이디를 입력해 주세요"
                                        value={signupForm.nickname}
                                        onChange={(e) => {
                                            setSignupForm({ ...signupForm, nickname: e.target.value });
                                            if (e.target.value !== nicknameCheckedValue) {
                                                setIsNicknameChecked(false);
                                                setNicknameCheckMessage('');
                                            }
                                        }}
                                        className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold text-sm focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCheckNickname}
                                        disabled={nicknameCheckLoading}
                                        className="px-4 py-3 rounded-2xl bg-[#F3E8FF] text-[#9333EA] font-bold text-sm border border-[#E8E0FA] whitespace-nowrap hover:bg-[#E8D5FF] transition-colors"
                                    >
                                        {nicknameCheckLoading ? '...' : '중복확인'}
                                    </button>
                                </div>
                                {nicknameCheckMessage && (
                                    <p className={`text-[10px] font-bold ml-2 ${isNicknameChecked ? 'text-emerald-500' : 'text-red-500'}`}>
                                        {nicknameCheckMessage}
                                    </p>
                                )}
                            </div>

                            {/* 성함 (실명) */}
                            <div className="space-y-1.5">
                                <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">성함 (실명)</label>
                                <input
                                    type="text"
                                    placeholder="실명을 입력해 주세요"
                                    value={signupForm.name}
                                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold text-sm focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                                    required
                                />
                            </div>

                            {/* 비밀번호 */}
                            <div className="space-y-1.5">
                                <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">비밀번호</label>
                                <input
                                    type="password"
                                    placeholder="비밀번호를 입력해 주세요"
                                    value={signupForm.password}
                                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold text-sm focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                                    required
                                />
                            </div>

                            {/* 비밀번호 확인 */}
                            <div className="space-y-1.5">
                                <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">비밀번호 확인</label>
                                <input
                                    type="password"
                                    placeholder="비밀번호를 한 번 더 입력해 주세요"
                                    value={signupForm.confirmPassword}
                                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold text-sm focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                                    required
                                />
                            </div>

                            {/* 휴대폰 번호 */}
                            <div className="space-y-1.5">
                                <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">휴대폰 번호</label>
                                <input
                                    type="tel"
                                    placeholder="휴대폰 번호 입력 (- 제외)"
                                    value={signupForm.phone}
                                    onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold text-sm focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                                    required
                                />
                            </div>

                            {/* 집 주소 */}
                            <div className="space-y-1.5">
                                <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">집 주소</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="집 주소 검색"
                                        value={signupForm.address}
                                        readOnly
                                        className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold text-sm cursor-pointer focus:outline-none focus:border-[#9333EA] shadow-inner"
                                        onClick={() => setShowPostcode(true)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPostcode(true)}
                                        className="px-4 py-3 rounded-2xl bg-[#F3E8FF] text-[#9333EA] font-bold text-sm border border-[#E8E0FA] whitespace-nowrap hover:bg-[#E8D5FF] transition-colors"
                                    >
                                        검색
                                    </button>
                                </div>
                            </div>

                            {/* 상세 주소 */}
                            <div className="space-y-1.5">
                                <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">상세 주소</label>
                                <input
                                    type="text"
                                    placeholder="상세주소 (동/호수 등)"
                                    value={signupForm.detailAddress}
                                    onChange={(e) => setSignupForm({ ...signupForm, detailAddress: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold text-sm focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                                />
                            </div>

                            {/* 이메일 주소 */}
                            <div className="space-y-1.5">
                                <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">이메일 주소 (선택)</label>
                                <input
                                    type="email"
                                    placeholder="이메일 주소 입력"
                                    value={signupForm.email}
                                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                                    className="w-full px-4 py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold text-sm focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                                />
                                <p className="text-[10px] text-[#9CA3AF] font-bold ml-2">※ 프로필 발송 시 확인용 메일이 전송됩니다.</p>
                            </div>
                            {/* ── 약관 동의 ── */}
                            <div className="rounded-2xl border border-[#E8E0FA] bg-[#F8F5FF] overflow-hidden">
                                {/* 전체 동의 */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const allChecked = signupForm.agreed.service && signupForm.agreed.privacy && signupForm.agreed.marketing;
                                        setSignupForm(prev => ({ ...prev, agreed: { service: !allChecked, privacy: !allChecked, marketing: !allChecked } }));
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#E8E0FA] hover:bg-[#F3E8FF] transition-colors"
                                >
                                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                        signupForm.agreed.service && signupForm.agreed.privacy && signupForm.agreed.marketing
                                            ? 'bg-[#9333EA] border-[#9333EA]' : 'border-[#9CA3AF]'
                                    }`}>
                                        {signupForm.agreed.service && signupForm.agreed.privacy && signupForm.agreed.marketing &&
                                            <span className="material-symbols-outlined text-white text-[13px]">check</span>}
                                    </span>
                                    <span className="text-sm font-black text-[#1F1235]">전체 약관 동의</span>
                                    <span className="text-[11px] text-[#9CA3AF] ml-auto">(필수+선택 포함)</span>
                                </button>
                                {/* 개별 약관 */}
                                {[
                                    { id: 'service', label: '서비스 이용약관', required: true, content: TERMS_CONTENT.service },
                                    { id: 'privacy', label: '개인정보처리방침', required: true, content: TERMS_CONTENT.privacy },
                                    { id: 'marketing', label: '마케팅 수신 동의', required: false, content: TERMS_CONTENT.marketing },
                                ].map((term) => (
                                    <div key={term.id} className="border-b border-[#E8E0FA] last:border-b-0">
                                        <div className="flex items-center gap-3 px-4 py-2.5">
                                            <button
                                                type="button"
                                                onClick={() => setSignupForm(prev => ({ ...prev, agreed: { ...prev.agreed, [term.id]: !prev.agreed[term.id] } }))}
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                                    signupForm.agreed[term.id] ? 'bg-[#9333EA] border-[#9333EA]' : 'border-[#9CA3AF]'
                                                }`}
                                            >
                                                {signupForm.agreed[term.id] && <span className="material-symbols-outlined text-white text-[11px]">check</span>}
                                            </button>
                                            <span className="text-xs font-bold text-[#5B4E7A] flex-1">
                                                <span className={`font-black mr-1 ${term.required ? 'text-[#9333EA]' : 'text-[#9CA3AF]'}`}>{term.required ? '[필수]' : '[선택]'}</span>
                                                {term.label}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setExpandedTerm(expandedTerm === term.id ? null : term.id)}
                                                className="text-[10px] border border-[#E8E0FA] rounded-lg px-2 py-0.5 text-[#9CA3AF] hover:text-[#9333EA] hover:border-[#9333EA] transition-colors flex-shrink-0"
                                            >
                                                {expandedTerm === term.id ? '닫기' : '보기'}
                                            </button>
                                        </div>
                                        {expandedTerm === term.id && (
                                            <div className="px-4 pb-3">
                                                <pre className="text-[10px] leading-relaxed whitespace-pre-wrap font-sans bg-white rounded-xl p-3 max-h-32 overflow-y-auto border border-[#E8E0FA] text-[#5B4E7A]">
                                                    {term.content}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {signupError && <p className="text-red-500 text-xs font-bold text-center">{signupError}</p>}
                            <button
                                type="submit"
                                disabled={signupLoading}
                                className="w-full py-3.5 rounded-2xl bg-[#9333EA] text-white font-black text-base shadow-moca hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                {signupLoading ? '가입 중...' : '회원가입하기'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showPostcode && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative shadow-2xl">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <h3 className="font-black text-[#1F1235]">주소 검색</h3>
                            <button onClick={() => setShowPostcode(false)} className="text-[#9CA3AF] hover:text-[#1F1235]">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <DaumPostcode onComplete={handleCompletePostcode} style={{ height: '450px' }} />
                    </div>
                </div>
            )}

            {showTerms && <TermsModal onClose={() => setShowTerms(false)} initialTab={0} />}

            {/* 아이디/비밀번호 찾기 모달 */}
            {findMode && (
                <FindAccountModal
                    mode={findMode}
                    onClose={() => setFindMode(null)}
                    onLoginWithNickname={(nick) => {
                        setLoginForm(prev => ({ ...prev, nickname: nick }));
                        setFindMode(null);
                        setShowLogin(true);
                    }}
                />
            )}
        </div>
    );
};

export default AgencyLanding;
