import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';
import { getUser, updateUserProfile } from '../services/userService';
import { isPasskeySupported, registerPasskey } from '../services/passkeyService';
import { getIntegratedPoints, getCachedPoints } from '../services/pointsService';


const USER_KEY = 'i_model_user';

const ProfileEditModal = ({ onClose, onUpdateSuccess }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [biometricSupported, setBiometricSupported] = useState(false);

    // 통합 포인트 상태
    const [pointsData, setPointsData] = useState(getCachedPoints());
    const [pointsLoading, setPointsLoading] = useState(false);
    const [pointsError, setPointsError] = useState('');

    // 폼 상태
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        address_detail: '',
        email: '',
        password: '',
        marketing_consent: false,
        terms_consent: false,
    });

    useEffect(() => {
        const initUser = async () => {
            // 1차: 정상 세션에서 유저 가져오기
            let currentUser = getUser();

            // 2차: 세션 만료 등으로 null이면 localStorage 원시 데이터에서 nickname 추출 후 DB 직접 조회
            if (!currentUser) {
                try {
                    const rawData = localStorage.getItem(USER_KEY);
                    if (rawData) {
                        const parsed = JSON.parse(rawData);
                        const nickname = typeof parsed === 'object' ? parsed?.nickname : parsed;
                        if (nickname && isSupabaseEnabled()) {
                            console.log('[ProfileEditModal] Session expired, fetching from DB by nickname:', nickname);
                            const { data: dbRows } = await supabase
                                .from('users')
                                .select('*')
                                .eq('nickname', nickname)
                                .order('created_at', { ascending: false })
                                .limit(1);
                            if (dbRows && dbRows.length > 0) {
                                currentUser = dbRows[0];
                                // 세션 갱신 (1시간 연장)
                                const refreshed = {
                                    ...currentUser,
                                    auth_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
                                };
                                localStorage.setItem(USER_KEY, JSON.stringify(refreshed));
                                console.log('[ProfileEditModal] Session refreshed from DB for:', nickname);
                            }
                        }
                    }
                } catch (e) {
                    console.error('[ProfileEditModal] Failed to recover session from DB:', e);
                }
            }

            if (currentUser) {
                setUser(currentUser);
                setFormData({
                    name: currentUser.name || '',
                    phone: currentUser.phone || '',
                    address: currentUser.address || '',
                    address_detail: currentUser.address_detail || '',
                    email: currentUser.email || '',
                    password: '',
                    marketing_consent: currentUser.marketing_consent || false,
                    terms_consent: currentUser.terms_consent || false,
                });
            }
        };

        initUser();
        isPasskeySupported().then(setBiometricSupported);

        // 통합 포인트 로드
        loadIntegratedPoints();

        // Daum Postcode 스크립트 로드
        const scriptId = 'daum-postcode-script';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
            script.async = true;
            document.head.appendChild(script);
        }
    }, []);

    const loadIntegratedPoints = async () => {
        const currentUser = getUser();
        if (!currentUser?.phone) {
            setPointsError('전화번호가 등록된 계정만 통합 포인트를 조회할 수 있습니다.');
            return;
        }
        setPointsLoading(true);
        setPointsError('');
        try {
            const result = await getIntegratedPoints(currentUser);
            setPointsData(result);
        } catch (err) {
            setPointsError('포인트 조회에 실패했습니다.');
        } finally {
            setPointsLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
    };

    const handleAddressSearch = () => {
        if (!window.daum || !window.daum.Postcode) {
            alert('주소 검색 서비스를 불러오는 중입니다. 잠시만 기다려주세요.');
            return;
        }
        new window.daum.Postcode({
            oncomplete: (data) => {
                let fullAddress = data.address;
                let extraAddress = '';

                if (data.addressType === 'R') {
                    if (data.bname !== '') extraAddress += data.bname;
                    if (data.buildingName !== '') extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName);
                    fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '');
                }

                setFormData(prev => ({
                    ...prev,
                    address: fullAddress
                }));
            }
        }).open();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        try {
            const updates = {
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                address_detail: formData.address_detail || null,
                email: formData.email?.trim() || null,
                terms_consent: formData.terms_consent,
                marketing_consent: formData.marketing_consent,
            };

            if (formData.password?.trim()) {
                updates.password = formData.password.trim();
            }

            if (!user?.id && !user?.nickname) {
                setErrorMsg('사용자 정보를 찾을 수 없습니다.');
                return;
            }

            console.log('[ProfileEditModal] Attempting update for user identifier:', user.id || user.nickname);
            // userService.updateUserProfile 는 (userId, patches) 순서임
            const { error: updateErr } = await updateUserProfile(user.id || user.nickname, updates);

            if (updateErr) {
                console.error('[ProfileEditModal] Update error response:', updateErr);
                setErrorMsg(updateErr.message || '정보 수정에 실패했습니다.');
            } else {
                console.log('[ProfileEditModal] Update successful');
                onUpdateSuccess?.(); // HomeDashboard에서 window.location.reload() 수행함
            }
        } catch (err) {
            console.error('[ProfileEditModal] Exception in handleSubmit:', err);
            setErrorMsg('에러가 발생했습니다. 다시 시도해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    // [신규] 지문/생체 인증 등록 처리
    const handleRegisterPasskey = async () => {
        setLoading(true);
        setErrorMsg('');
        try {
            const { success } = await registerPasskey();
            if (success) {
                alert('지문/생체 인증이 성공적으로 등록되었습니다. 다음 로그인부터 사용하실 수 있습니다.');
            }
        } catch (err) {
            console.error('[Passkey] Registration handler failed:', err);
            if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
                setErrorMsg('생체 인증 등록에 실패했습니다. (이미 등록되었거나 장치 미지원)');
            }
        } finally {
            setLoading(false);
        }
    };


    if (!user) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#1F1235]/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white border border-[#E8E0FA] rounded-3xl w-full max-w-sm max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
                
                {/* Modal Header */}
                <div className="relative px-6 py-5 border-b border-[#E8E0FA] bg-[#F8F5FF] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#9333EA]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#9333EA] text-[22px]">person_edit</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-[#1F1235]">회원 정보 수정</h2>
                            <p className="text-[#9CA3AF] text-[11px] font-bold">{user.nickname}님</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white border border-[#E8E0FA] flex items-center justify-center text-[#9CA3AF] hover:bg-[#EDE8FF] hover:text-[#9333EA] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>

                {/* ── 통합 포인트 배너 ── */}
                <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-[#E8E0FA] bg-gradient-to-r from-[#F3E8FF] to-[#EDE8FF]">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#9333EA] to-[#C084FC] flex items-center justify-center shadow-sm">
                                <span className="material-symbols-outlined text-white text-[16px]">toll</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-[#5B4E7A] uppercase tracking-wider">나의 통합포인트</p>
                                <p className="text-[9px] text-[#9CA3AF] font-medium">MOCA + IMFF 통합</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {pointsLoading ? (
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 border border-[#9333EA] border-t-transparent rounded-full animate-spin" />
                                    <span className="text-[11px] text-[#9CA3AF]">조회 중...</span>
                                </div>
                            ) : pointsError ? (
                                <button
                                    onClick={loadIntegratedPoints}
                                    className="text-[11px] text-[#9CA3AF] underline"
                                >
                                    다시 조회
                                </button>
                            ) : (
                                <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-black text-[#7C3AED]">
                                        {(pointsData?.integratedPoints || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[11px] font-black text-[#9333EA]">P</span>
                                </div>
                            )}
                        </div>
                    </div>
                    {!pointsLoading && !pointsError && pointsData?.linkedApps?.length > 0 && (
                        <div className="px-4 pb-3 flex items-center gap-1.5">
                            <span className="text-[9px] text-[#9CA3AF] font-bold">연동 앱:</span>
                            {pointsData.linkedApps.map(app => (
                                <span key={app} className="px-1.5 py-0.5 rounded-full bg-[#9333EA]/10 text-[#9333EA] text-[9px] font-black">{app}</span>
                            ))}
                        </div>
                    )}
                    {!pointsLoading && !pointsError && !pointsData && (
                        <div className="px-4 pb-3">
                            <p className="text-[9px] text-[#9CA3AF]">
                                {user?.phone ? '포인트 정보를 불러오는 중입니다.' : '전화번호를 등록하면 통합 포인트를 확인할 수 있습니다.'}
                            </p>
                        </div>
                    )}
                    {!pointsLoading && pointsError && (
                        <div className="px-4 pb-3">
                            <p className="text-[9px] text-[#EF4444] font-bold">{pointsError}</p>
                        </div>
                    )}
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    <form id="profileEditForm" onSubmit={handleSubmit} className="space-y-5 pb-4">
                        {/* 이름 */}
                        <div className="space-y-1.5">
                            <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">이름 (실명)</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-3.5 text-[#1F1235] text-sm font-bold placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                            />
                        </div>

                        {/* 핸드폰 번호 */}
                        <div className="space-y-1.5">
                            <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">연락처</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                placeholder="010-0000-0000"
                                className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-3.5 text-[#1F1235] text-sm font-bold placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                            />
                        </div>

                        {/* 주소 */}
                        <div className="space-y-1.5">
                            <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">주소</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    name="address"
                                    value={formData.address}
                                    readOnly
                                    onClick={handleAddressSearch}
                                    required
                                    placeholder="주소 검색을 이용해주세요"
                                    className="flex-1 min-w-0 bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-3.5 text-[#1F1235] text-sm font-bold placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] cursor-pointer shadow-inner"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddressSearch}
                                    className="px-4 rounded-2xl bg-[#9333EA]/10 text-[#9333EA] font-black text-xs hover:bg-[#9333EA]/20 transition-colors border border-[#9333EA]/20 whitespace-nowrap"
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
                                name="address_detail"
                                value={formData.address_detail}
                                onChange={handleChange}
                                placeholder="상세 주소 입력"
                                className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-3.5 text-[#1F1235] text-sm font-bold placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                            />
                        </div>

                        {/* 이메일 (신규 추가) */}
                        <div className="space-y-1.5">
                            <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">이메일 (선택)</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="이메일 주소 입력 (프로필 발송 확인용)"
                                className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-3.5 text-[#1F1235] text-sm font-bold placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                            />
                            <p className="text-[10px] text-[#9CA3AF] ml-2 font-medium">※ 프로필 발송 시 동일한 내용의 확인 메일을 받으실 수 있습니다.</p>
                        </div>

                        {/* 동의 항목 - 완료되지 않은 경우에만 더 강조하거나 상단에 노출 가능하나, 일단 하단 배치 */}
                        <div className="pt-4 border-t border-[#E8E0FA] mt-2 space-y-3">
                            <p className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider mb-1">약관 및 마케팅 동의</p>
                            
                            {/* 서비스 이용약관 동의 (이미 동의했더라도 확인용으로 노출하거나, 미동의자만 체크 가능하게) */}
                            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] cursor-pointer hover:bg-[#F3E8FF] transition-all">
                                <input
                                    type="checkbox"
                                    name="terms_consent"
                                    checked={formData.terms_consent}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded-lg border-[#E8E0FA] text-[#9333EA] focus:ring-[#9333EA]"
                                />
                                <span className={`text-[13px] font-bold ${formData.terms_consent ? 'text-[#1F1235]' : 'text-red-500'}`}>
                                    서비스 이용약관 및 개인정보 처리방침 동의
                                    {!formData.terms_consent && <span className="ml-1 text-[10px] font-black">(필수)</span>}
                                </span>
                            </label>

                            <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] cursor-pointer hover:bg-[#F3E8FF] transition-all">
                                <input
                                    type="checkbox"
                                    name="marketing_consent"
                                    checked={formData.marketing_consent}
                                    onChange={handleChange}
                                    className="w-5 h-5 rounded-lg border-[#E8E0FA] text-[#9333EA] focus:ring-[#9333EA]"
                                />
                                <span className="text-[#1F1235] text-[13px] font-bold">
                                    마케팅 정보 수신 및 활용 동의 (선택)
                                </span>
                            </label>
                            {!user.marketing_consent && !formData.marketing_consent && (
                                <p className="text-[10px] text-[#9CA3AF] px-2 leading-relaxed italic">
                                    ※ 동의 시 모카의 혜택 및 이벤트 소식을 빠르게 받아보실 수 있습니다.
                                </p>
                            )}
                        </div>

                        {/* [신규] 보안 및 로그인 설정 (지문/생체 인증) */}
                        {biometricSupported && (
                            <div className="pt-4 border-t border-[#E8E0FA] mt-2 space-y-3">
                                <p className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">보안 및 로그인 설정</p>
                                <button
                                    type="button"
                                    onClick={handleRegisterPasskey}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] hover:bg-[#F3E8FF] transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-[#9333EA]/10 flex items-center justify-center group-hover:bg-[#9333EA]/20 transition-colors">
                                            <span className="material-symbols-outlined text-[#9333EA] text-[20px]">fingerprint</span>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-[#1F1235] text-[13px] font-bold">지문 / 생체로그인 등록하기</p>
                                            <p className="text-[#9CA3AF] text-[10px] font-medium">기기의 생체 정보를 사용하여 간편하게 로그인</p>
                                        </div>
                                    </div>
                                    <span className="material-symbols-outlined text-[#9CA3AF] text-[18px] group-hover:text-[#9333EA] transition-colors">add_circle</span>
                                </button>
                            </div>
                        )}

                        {/* 비밀번호 변경 */}

                        <div className="space-y-1.5 pt-4 border-t border-[#E8E0FA] mt-2">
                            <label className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">
                                비밀번호 변경 (선택)
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="기존 유지 시 빈칸"
                                    className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl pl-4 pr-12 py-3.5 text-[#1F1235] text-sm font-bold placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-all shadow-inner"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#9333EA] transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Sticky Footer with Save Button */}
                <div className="px-6 py-5 bg-white border-t border-[#E8E0FA] shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                    {errorMsg && (
                        <div className="mb-4 p-3.5 rounded-2xl bg-red-50 text-red-500 text-[12px] font-bold text-center border border-red-100 flex items-center justify-center gap-2">
                             <span className="material-symbols-outlined text-[16px]">error</span>
                            {errorMsg}
                        </div>
                    )}
                    
                    <button
                        form="profileEditForm"
                        type="submit"
                        disabled={loading || !formData.terms_consent}
                        className={`w-full py-4 rounded-2xl text-white font-black text-base shadow-lg transition-all active:scale-[0.98] ${loading || !formData.terms_consent
                            ? 'bg-[#9333EA]/40 cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-[#9333EA] to-[#C084FC] hover:shadow-[#9333EA]/30 active:shadow-inner'
                            }`}
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>저장 중...</span>
                            </div>
                        ) : '정보 저장하기'}
                    </button>
                    {!formData.terms_consent && (
                        <p className="text-center text-[10px] text-red-400 mt-2 font-black">
                            서비스 이용약관 동의가 필요합니다.
                        </p>
                    )}
                    <p className="text-center text-[10px] text-[#9CA3AF] mt-3 font-medium">
                        개인정보는 안전하게 보호됩니다.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfileEditModal;
