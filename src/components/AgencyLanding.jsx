import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DaumPostcode from 'react-daum-postcode';
import { fetchAgencies } from '../services/agencyService';
import { saveUser, getUser, logoutUser, saveUserToSupabase, loginUser, checkNicknameDuplicate, signInWithSocial } from '../services/userService';
import { loginWithPasskey } from '../services/passkeyService';
import ProfileEditModal from './ProfileEditModal';
import TermsModal from './shop/TermsModal';
import FindAccountModal from './FindAccountModal';

// ── 약관 내용 ──
const TERMS_CONTENT = {
    service: `제1조 (목적)
본 약관은 MOCA 서비스(앱 및 모카 에디트 쇼핑 등 포함, 이하 "서비스") 이용에 관한 조건 및 절차를 규정합니다.

제2조 (서비스 이용)
① 서비스는 MOCA 앱 가입 회원에게만 제공됩니다.
② 회원은 타인의 계정을 사용할 수 없습니다.
③ 상품 판매 시 모카 에디트 방식으로 설정 기간 내 구매가 가능합니다.

제3조 (주문 및 결제)
① 주문은 결제 완료 시점에 성립됩니다.
② 결제는 토스페이먼츠를 통해 처리됩니다.
③ 재고 소진 및 판매 시간 종료 후에는 구매가 불가합니다.

제4조 (취소 및 환불)
① 배송 전 취소: 100% 환불
② 상품 하자: 수령 후 7일 이내 환불 가능
③ 단순 변심: 미개봉 시 수령 후 7일 이내 반품 가능 (왕복 배송비 고객 부담)

제5조 (책임 제한)
회사는 서비스 중단, 오류 등으로 인한 손해에 대해 법이 허용하는 범위 내에서 책임을 집니다.`,
    privacy: `■ 수집 항목
- 필수: 닉네임, 휴대폰번호, 수령인명, 배송주소
- 선택: 이메일, 배송 메모

■ 수집 목적
- 회원 식별, 앱 서비스 제공 및 주문 처리
- 각종 배송 진행 및 CS 대응
- 결제 처리 (카드정보는 결제대행사에서 직접 보관)

■ 보유 기간
- 회원 탈퇴 시 즉시 삭제 (단, 관련 법령에 따라 거래 기록 등은 법정 기간 보관)

■ 동의 거부 시 불이익
개인정보 수집·이용에 동의하지 않으실 수 있으나, 동의 거부 시 앱 서비스 가입 및 이용이 불가합니다.`,
    third_party: `■ 제공받는 자
- 개별 상품 판매사 (상품 발송 목적)
- 택배사 (CJ대한통운, 한진택배, 롯데택배 등)

■ 제공하는 개인정보 항목
수령인명, 배송주소, 휴대폰번호, 주문상품명

■ 제공 목적
상품 배송 및 배송 현황 조회

■ 보유 및 이용 기간
배송 완료 후 3개월 또는 회원 탈퇴 시까지

■ 동의 거부 시 불이익
제3자 제공에 동의하지 않으실 경우, 상품 배송을 포함한 일부 서비스 이용이 제한될 수 있습니다.`,
    marketing: `■ 수신 채널
카카오톡 알림, SMS

■ 발송 내용
- 모카 에디트 오픈 알림
- 회원 등급 전용 이벤트
- 신상품 및 프로모션 안내

■ 수신 동의는 언제든 철회 가능합니다.
(앱 설정 > 알림 관리 > 마케팅 수신 해제)`,
};

// ── 환불 정책 모달 (A-Plan 색상 적용) ──
const RefundPolicyModal = ({ onClose }) => (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white border border-[#E8E0FA] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-moca-lg" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#E8E0FA] px-5 py-4 flex items-center justify-between">
                <h2 className="text-[#1F1235] font-black text-base">교환 · 반품 · 취소 · 환불 정책</h2>
                <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#1F1235] transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div className="px-5 py-5 space-y-5 text-xs text-[#5B4E7A] leading-relaxed">
                <div>
                    <p className="text-blue-600 font-bold mb-2">🚫 결제 취소</p>
                    <ul className="space-y-1.5 list-none">
                        <li>① 배송 시작 전(배송 준비 전)까지 100% 전액 취소 가능합니다.</li>
                        <li>② 이용약관 신청 후 회사로부터 상담이 미제공된 경우 취소 가능합니다.</li>
                        <li>③ 취소 신청: immodelkr@gmail.com (주문번호 포함)</li>
                    </ul>
                </div>
                <hr className="border-[#E8E0FA]" />
                <div>
                    <p className="text-emerald-600 font-bold mb-2">🔄 반품 · 교환</p>
                    <ul className="space-y-1.5 list-none">
                        <li>① 상품 수령 후 <strong className="text-[#1F1235]">3일 이내</strong> 반품·교환 신청 가능</li>
                        <li>② 단순 변심: 미개봉·미사용 상태 한정, 왕복 배송비 고객 부담</li>
                        <li>③ 상품 하자·오배송: 3일 이내 사진 첨부 접수 시 배송비 회사 부담으로 교환·환불</li>
                        <li>④ 개봉 후 사용 상품은 단순 변심 반품 불가</li>
                    </ul>
                </div>
                <hr className="border-[#E8E0FA]" />
                <div>
                    <p className="text-yellow-600 font-bold mb-2">💰 환불 정책</p>
                    <p className="text-[#9CA3AF] text-[11px] font-bold mb-1">📦 실물 상품</p>
                    <ul className="space-y-1 mb-3 list-none">
                        <li>① 배송 전 취소: 100% 전액 환불</li>
                        <li>② 수령 후 3일 이내·미사용: 환불 가능 (왕복 배송비 고객 부담)</li>
                        <li>③ 상품 하자·오배송: 수령 후 3일 이내 100% 환불</li>
                    </ul>
                    <p className="text-[#9CA3AF] text-[11px] font-bold mb-1">👑 멤버십 구독</p>
                    <ul className="space-y-1 list-none">
                        <li>① 정기결제: 이용일수 제외 일할 계산 환불 (결제 후 24시간 이후 ~ 15일까지)</li>
                        <li>② 연간결제: 전체 연간금액 ÷ 12 × 잔여개월 기준 환불</li>
                        <li>③ 프로필카드 2회 이상 수령 시 위약금 10% 제외 후 부분 환불</li>
                        <li>④ 회사 귀책사유(오류·서비스 중단): 전액 환불</li>
                    </ul>
                </div>
                <hr className="border-[#E8E0FA]" />
                <div>
                    <p className="text-red-500 font-bold mb-2">🚫 환불 불가 항목</p>
                    <ul className="space-y-1 list-none">
                        <li>• 멤버십 결제 후 7일 초과</li>
                        <li>• 상품 수령 후 3일 초과</li>
                        <li>• 콘텐츠 다운로드·실질 이용 후</li>
                        <li>• 고객 사용·훼손으로 가치 감소</li>
                        <li>• 개봉 후 사용 상품의 단순 변심</li>
                    </ul>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mt-2">
                    <p className="text-orange-600 font-bold">📞 문의: immodelkr@gmail.com</p>
                    <p className="text-[#9CA3AF] mt-1">주문번호, 결제일자, 사유를 포함해 주세요. (영업일 1~2일 내 답변)</p>
                </div>
            </div>
        </div>
    </div>
);

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

    const handlePasskeyLogin = async () => {
        try {
            const { success } = await loginWithPasskey();
            if (success) {
                console.log('[Passkey] Login Success');
                // useAuthSync will handle reload
            }
        } catch (err) {
            console.error('[Passkey] Login Error:', err);
            if (err.message?.includes('abandoned')) return;
            alert('지문 인식에 실패했습니다. (등록된 기기가 아니거나 취소됨)');
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
            setIsLoggedIn(true);
            setUserId(finalUser.name || finalUser.nickname || '');
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
                                회원가입
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
                        <span className="text-[#9333EA]">더 스마트하게, 아임모카</span>
                    </h1>
                    <p className="text-[#5B4E7A] text-lg max-w-lg mx-auto mb-10 leading-relaxed font-medium">
                        HOT한 중요 {agencyCount}개 이상의 정보를<br />
                        한눈에 확인하고, 광고모델 전문 프로필을 단 1분만에 완성하여<br />
                        스마트한 광고모델 활동을 시작해보세요!
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
                            <p className="text-[#5B4E7A] text-sm leading-relaxed font-medium">실시간으로 업데이트되는 {agencyCount}개 에이전시의 주소와 연락처, 특징을 한눈에.</p>
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
                            <a href="/privacy" className="hover:text-[#9333EA]">개인정보처리방침</a>
                            <span className="text-[#E8E0FA]">|</span>
                            <button onClick={() => setShowTerms(true)} className="hover:text-[#9333EA]">이용약관</button>
                            <span className="text-[#E8E0FA]">|</span>
                            <button onClick={() => setShowRefundPolicy(true)} className="text-orange-500 hover:text-orange-600">교환·반품·환불 정책</button>
                        </div>
                        {showRefundPolicy && <RefundPolicyModal onClose={() => setShowRefundPolicy(false)} />}
                        <p className="text-[#9CA3AF] text-[10px] text-center md:text-right leading-loose">
                            대표 : 김대희 | 사업자등록번호 : 365-22-00947 | 통신판매업 제2021-서울강남-05756호<br />
                            서울시 영등포구 영중로 159, 7층 글로벌아임 | immodelkr@gmail.com | 호스팅서비스: Vercel Inc.
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

                        {/* 간편 로그인 섹션 */}
                        <div className="mt-8">
                            <div className="relative flex items-center justify-center mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-[#E8E0FA]"></div>
                                </div>
                                <span className="relative px-4 bg-white text-[11px] font-black text-[#9CA3AF] uppercase tracking-widest">간편 로그인</span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                    onClick={() => signInWithSocial('kakao')}
                                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#FEE500] text-[#191919] font-black text-sm hover:opacity-90 transition-all active:scale-[0.98]"
                                >
                                    <img src="https://developers.kakao.com/assets/img/about/logos/kakaotalksharing/kakaolink_help_icon.png" alt="Kakao" className="w-5 h-5 rounded-md" />
                                    <span>카카오</span>
                                </button>
                                <button 
                                    onClick={() => signInWithSocial('google')}
                                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white border border-[#E8E0FA] text-[#1F1235] font-black text-sm hover:bg-[#F8F5FF] transition-all active:scale-[0.98]"
                                >
                                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
                                    <span>Google</span>
                                </button>
                                <button 
                                    onClick={handlePasskeyLogin}
                                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#9333EA] text-white font-black text-sm hover:opacity-90 transition-all active:scale-[0.98] shadow-moca"
                                >
                                    <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                                    <span>지문</span>
                                </button>
                            </div>
                        </div>


                        {/* 아이디 찾기 / 비밀번호 찾기 */}
                        <div className="flex items-center justify-center gap-3 mt-8 mb-1">
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
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-moca-lg relative border border-[#E8E0FA] max-h-[90vh] overflow-y-auto hide-scrollbar">
                        <button onClick={() => setShowSignup(false)} className="absolute top-6 right-6 text-[#9CA3AF] hover:text-[#1F1235]">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <h2 className="text-2xl font-black text-[#1F1235] mb-8 text-center">회원가입</h2>
                        <form onSubmit={handleSignupSubmit} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="아이디"
                                            value={signupForm.nickname}
                                            onChange={(e) => {
                                                setSignupForm({ ...signupForm, nickname: e.target.value });
                                                if (e.target.value !== nicknameCheckedValue) {
                                                    setIsNicknameChecked(false);
                                                    setNicknameCheckMessage('');
                                                }
                                            }}
                                            className="flex-1 px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCheckNickname}
                                            disabled={nicknameCheckLoading}
                                            className="px-4 py-4 rounded-2xl bg-[#F3E8FF] text-[#9333EA] font-bold text-sm border border-[#E8E0FA] whitespace-nowrap hover:bg-[#E8D5FF] transition-colors"
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
                                    placeholder="집 주소 (검색)"
                                    value={signupForm.address}
                                    readOnly
                                    className="flex-1 px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold cursor-pointer"
                                    onClick={() => setShowPostcode(true)}
                                />
                                <button type="button" onClick={() => setShowPostcode(true)} className="px-5 py-4 rounded-2xl bg-[#F3E8FF] text-[#9333EA] font-bold text-sm border border-[#E8E0FA] whitespace-nowrap">검색</button>
                            </div>
                            <input
                                type="text"
                                placeholder="상세주소 (동/호수 등)"
                                value={signupForm.detailAddress}
                                onChange={(e) => setSignupForm({ ...signupForm, detailAddress: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] font-bold"
                            />
                            {/* ── 약관 동의 ── */}
                            <div className="rounded-2xl border border-[#E8E0FA] bg-[#F8F5FF] overflow-hidden">
                                {/* 전체 동의 */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const allChecked = signupForm.agreed.service && signupForm.agreed.privacy && signupForm.agreed.third_party && signupForm.agreed.marketing;
                                        setSignupForm(prev => ({ ...prev, agreed: { service: !allChecked, privacy: !allChecked, third_party: !allChecked, marketing: !allChecked } }));
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 border-b border-[#E8E0FA] hover:bg-[#F3E8FF] transition-colors"
                                >
                                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                        signupForm.agreed.service && signupForm.agreed.privacy && signupForm.agreed.third_party && signupForm.agreed.marketing
                                            ? 'bg-[#9333EA] border-[#9333EA]' : 'border-[#9CA3AF]'
                                    }`}>
                                        {signupForm.agreed.service && signupForm.agreed.privacy && signupForm.agreed.third_party && signupForm.agreed.marketing &&
                                            <span className="material-symbols-outlined text-white text-[13px]">check</span>}
                                    </span>
                                    <span className="text-sm font-black text-[#1F1235]">전체 약관 동의</span>
                                    <span className="text-[11px] text-[#9CA3AF] ml-auto">(필수+선택 포함)</span>
                                </button>
                                {/* 개별 약관 */}
                                {[
                                    { id: 'service', label: '서비스 이용약관', required: true, content: TERMS_CONTENT.service },
                                    { id: 'privacy', label: '개인정보처리방침', required: true, content: TERMS_CONTENT.privacy },
                                    { id: 'third_party', label: '개인정보 제3자 제공', required: true, content: TERMS_CONTENT.third_party },
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
                                className="w-full py-4 rounded-2xl bg-[#9333EA] text-white font-black text-lg shadow-moca hover:opacity-90 disabled:opacity-50 transition-all"
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
