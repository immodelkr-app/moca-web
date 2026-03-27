import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DaumPostcode from 'react-daum-postcode';
import { fetchAgencies } from '../services/agencyService';
import { saveUser, getUser, logoutUser, saveUserToSupabase, loginUser } from '../services/userService';
import ProfileEditModal from './ProfileEditModal';
import TermsModal from './shop/TermsModal';

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

    useEffect(() => {
        const storedUser = getUser();
        if (storedUser) {
            setIsLoggedIn(true);
            setUserId(storedUser.name || storedUser.nickname || '');
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
        setLoginLoading(true);
        setLoginError('');
        try {
            const user = await loginUser(loginForm.nickname, loginForm.password);
            saveUser(user);
            setIsLoggedIn(true);
            setUserId(user.name || user.nickname || '');
            setUserGrade(user.grade || 'BASIC');
            setShowLogin(false);
            navigate('/home/dashboard');
        } catch (err) {
            setLoginError(err.message || '로그인에 실패했습니다.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleSignupSubmit = async (e) => {
        e.preventDefault();
        if (signupForm.password !== signupForm.confirmPassword) {
            setSignupError('비밀번호가 일치하지 않습니다.');
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
                grade: 'SILVER',
                created_at: new Date().toISOString(),
            };
            await saveUserToSupabase(newUser);
            saveUser(newUser);
            setIsLoggedIn(true);
            setUserId(newUser.name || newUser.nickname || '');
            setShowSignup(false);
            navigate('/home/dashboard');
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
            <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-[#E8E0FA] z-[200] flex items-center justify-between px-5 md:px-10">
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
                                무료 가입
                            </button>
                        </>
                    )}
                </div>
            </nav>

            {/* ── 히어로 섹션 ── */}
            <section className="pt-32 pb-20 px-5 text-center">
                <div className={`transition-all duration-1000 transform ${loaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-[#F3E8FF] text-[#9333EA] text-xs font-black tracking-widest mb-4 uppercase">
                        I'm Model Agency Platform
                    </span>
                    <h1 className="text-4xl md:text-6xl font-black text-[#1F1235] leading-tight tracking-tight mb-6">
                        당신의 모델 활동을<br />
                        <span className="text-[#9333EA]">더 스마트하게.</span>
                    </h1>
                    <p className="text-[#5B4E7A] text-lg max-w-lg mx-auto mb-10 leading-relaxed font-medium">
                        대한민국 {agencyCount}개 이상의 에이전시 정보를 한눈에 확인하고,<br />
                        전문적인 모델 포트폴리오를 단 1분 만에 완성해 보세요.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={() => handleProtectedNavigation('/agencies')}
                            className="w-full sm:w-auto px-10 py-5 rounded-3xl bg-[#9333EA] text-white font-black text-lg shadow-moca-lg hover:scale-105 active:scale-95 transition-all"
                        >
                            에이전시 투어 시작하기
                        </button>
                        <button
                            onClick={() => handleProtectedNavigation('/home/smart-profile')}
                            className="w-full sm:w-auto px-10 py-5 rounded-3xl bg-white border-2 border-[#E8E0FA] text-[#1F1235] font-black text-lg hover:bg-[#F8F5FF] transition-all"
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
                            <span className="material-symbols-outlined text-[#9333EA] text-4xl mb-4">apartment</span>
                            <h3 className="text-xl font-black text-[#1F1235] mb-3">전국 에이전시 리스트</h3>
                            <p className="text-[#5B4E7A] text-sm leading-relaxed font-medium">실시간으로 업데이트되는 {agencyCount}개 이상 에이전시의 주소와 연락처, 특징을 한눈에.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-[#F8F5FF] border border-[#E8E0FA]">
                            <span className="material-symbols-outlined text-[#9333EA] text-4xl mb-4">forward_to_inbox</span>
                            <h3 className="text-xl font-black text-[#1F1235] mb-3">간편 프로필 발송</h3>
                            <p className="text-[#5B4E7A] text-sm leading-relaxed font-medium">번거로운 이메일 발송은 이제 그만. 클릭 한 번으로 수십 곳의 에이전시에 프로필을 전달하세요.</p>
                        </div>
                        <div className="p-8 rounded-3xl bg-[#F8F5FF] border border-[#E8E0FA]">
                            <span className="material-symbols-outlined text-[#9333EA] text-4xl mb-4">event_note</span>
                            <h3 className="text-xl font-black text-[#1F1235] mb-3">투어일지 & 캘린더</h3>
                            <p className="text-[#5B4E7A] text-sm leading-relaxed font-medium">내가 보낸 프로필과 투어 일정을 체계적으로 관리하고 다른 모델들과 정보를 공유하세요.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── 푸터 ── */}
            <footer className="w-full border-t border-[#E8E0FA] bg-[#F8F5FF] px-6 py-12">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="text-center md:text-left">
                        <span className="text-[#9333EA] text-xl font-black tracking-tighter">MOCA</span>
                        <p className="text-[#9CA3AF] text-xs font-bold mt-2">© 2026 글로벌아임(IMMOCA). All rights reserved.</p>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-4">
                        <div className="flex items-center gap-4 text-xs font-bold text-[#5B4E7A]">
                            <button onClick={() => setShowTerms(true)} className="hover:text-[#9333EA]">이용약관</button>
                            <span className="text-[#E8E0FA]">|</span>
                            <a href="/privacy" className="hover:text-[#9333EA]">개인정보처리방침</a>
                        </div>
                        <p className="text-[#9CA3AF] text-[10px] text-center md:text-right leading-loose">
                            대표 : 김대희 | 사업자등록번호 : 365-22-00947 | 통신판매업 제2021-서울강남-05756호<br />
                            서울시 영등포구 영중로 159, 7층 글로벌아임 | immodelkr@gmail.com
                        </p>
                    </div>
                </div>
            </footer>

            {/* ── 로그인 모달 ── */}
            {showLogin && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-moca-lg relative border border-[#E8E0FA]">
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
                                className="w-full px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] focus:border-[#9333EA] outline-none font-bold text-[#1F1235]"
                                required
                            />
                            <input
                                type="password"
                                placeholder="비밀번호"
                                value={loginForm.password}
                                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] focus:border-[#9333EA] outline-none font-bold text-[#1F1235]"
                                required
                            />
                            {loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}
                            <button
                                type="submit"
                                disabled={loginLoading}
                                className="w-full py-4 rounded-2xl bg-[#9333EA] text-white font-black text-lg shadow-moca hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                {loginLoading ? '로그인 중...' : '로그인'}
                            </button>
                        </form>
                        <div className="mt-6 text-center">
                            <button onClick={() => { setShowLogin(false); setShowSignup(true); }} className="text-[#9CA3AF] text-sm font-bold hover:text-[#9333EA]">
                                아직 회원이 아니신가요? <span className="text-[#9333EA]">무료 가입하기</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 회원가입 모달 (간략화) ── */}
            {showSignup && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-moca-lg relative border border-[#E8E0FA] max-h-[90vh] overflow-y-auto hide-scrollbar">
                        <button onClick={() => setShowSignup(false)} className="absolute top-6 right-6 text-[#9CA3AF] hover:text-[#1F1235]">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h2 className="text-2xl font-black text-[#1F1235] mb-8 text-center">무료 회원가입</h2>
                        <form onSubmit={handleSignupSubmit} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <input
                                    type="text"
                                    placeholder="아이디"
                                    value={signupForm.nickname}
                                    onChange={(e) => setSignupForm({ ...signupForm, nickname: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold"
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="성함(실명)"
                                    value={signupForm.name}
                                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold"
                                    required
                                />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <input
                                    type="password"
                                    placeholder="비밀번호"
                                    value={signupForm.password}
                                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="비밀번호 확인"
                                    value={signupForm.confirmPassword}
                                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                                    className="w-full px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold"
                                    required
                                />
                            </div>
                            <input
                                type="tel"
                                placeholder="휴대폰 번호 (- 제외)"
                                value={signupForm.phone}
                                onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold"
                                required
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="주소"
                                    value={signupForm.address}
                                    readOnly
                                    className="flex-1 px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold"
                                />
                                <button type="button" onClick={() => setShowPostcode(true)} className="px-5 py-4 rounded-2xl bg-[#F3E8FF] text-[#9333EA] font-bold text-sm border border-[#E8E0FA]">검색</button>
                            </div>
                            <div className="flex flex-col gap-2 p-4 bg-[#F8F5FF] rounded-2xl border border-[#E8E0FA]">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={signupForm.agreed.service} onChange={(e) => setSignupForm({ ...signupForm, agreed: { ...signupForm.agreed, service: e.target.checked } })} />
                                    <span className="text-xs font-bold text-[#5B4E7A]">[필수] 서비스 이용약관 동의</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={signupForm.agreed.privacy} onChange={(e) => setSignupForm({ ...signupForm, agreed: { ...signupForm.agreed, privacy: e.target.checked } })} />
                                    <span className="text-xs font-bold text-[#5B4E7A]">[필수] 개인정보처리방침 동의</span>
                                </label>
                            </div>
                            {signupError && <p className="text-red-500 text-xs font-bold text-center">{signupError}</p>}
                            <button
                                type="submit"
                                disabled={signupLoading}
                                className="w-full py-4 rounded-2xl bg-[#9333EA] text-white font-black text-lg shadow-moca hover:opacity-90 disabled:opacity-50 transition-all"
                            >
                                {signupLoading ? '가입 중...' : '무료 가입하기'}
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
        </div>
    );
};

export default AgencyLanding;
