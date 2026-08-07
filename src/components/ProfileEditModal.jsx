import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseEnabled } from '../services/supabaseClient';
import { getUser, updateUserProfile, updateMasterUserIdInSupabase } from '../services/userService';
import { isPasskeySupported, registerPasskey } from '../services/passkeyService';
import { getPointsBalance, getPointsHistory, syncUserWithCore } from '../lib/imCoreAuth';
import { fetchMyCoupons } from '../services/attendanceService';


const USER_KEY = 'i_model_user';

const ProfileEditModal = ({ onClose, onUpdateSuccess }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [biometricSupported, setBiometricSupported] = useState(false);

    // 포인트 전자지갑 관련
    const [hasMasterUserId, setHasMasterUserId] = useState(() => {
        // 로컬스토리지에서 즉시 확인 (비동기 initUser 완료를 기다리지 않음)
        const u = getUser();
        return !!(u?.master_user_id);
    });
    const [pointsBalance, setPointsBalance] = useState(null);
    const [pointsHistory, setPointsHistory] = useState([]);
    const [pointsLoading, setPointsLoading] = useState(false);
    const [pointsError, setPointsError] = useState(false);

    // 참석 프리패스 (출석체크 + 모카그램 30일 리워드)
    const [coupons, setCoupons] = useState([]);
    const [couponsLoading, setCouponsLoading] = useState(false);

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

            // 실시간 DB 데이터로 세션 최신화 (master_user_id, phone 등)
            if (isSupabaseEnabled() && currentUser?.nickname) {
                try {
                    const { data: dbRows } = await supabase
                        .from('users')
                        .select('*')
                        .eq('nickname', currentUser.nickname)
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
                        console.log('[ProfileEditModal] Session refreshed from DB on modal open:', currentUser.nickname);
                    }
                } catch (e) {
                    console.error('[ProfileEditModal] Failed to refresh session from DB:', e);
                }
            } else if (!currentUser) {
                // 2차: 세션 만료 등으로 null이면 localStorage 원시 데이터에서 nickname 추출 후 DB 직접 조회
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

                // 참석 프리패스 조회
                if (currentUser.id) {
                    setCouponsLoading(true);
                    fetchMyCoupons(currentUser.id)
                        .then(setCoupons)
                        .finally(() => setCouponsLoading(false));
                }

                // 포인트 정보 조회/연동
                if (currentUser.master_user_id) {
                    setHasMasterUserId(true);
                    setPointsLoading(true);
                    setPointsError(false);
                    Promise.all([
                        getPointsBalance(currentUser.master_user_id),
                        getPointsHistory(currentUser.master_user_id),
                    ]).then(([balRes, histRes]) => {
                        if (balRes?.success) setPointsBalance(balRes.balance ?? 0);
                        if (histRes?.success) setPointsHistory((histRes.history || []).slice(0, 5));
                    }).catch(() => {
                        setPointsError(true);
                    }).finally(() => {
                        setPointsLoading(false);
                    });
                } else if (currentUser.phone) {
                    // master_user_id가 없는데 전화번호가 있으면 백그라운드에서 동기화 시도 (보완책)
                    setPointsLoading(true);
                    syncUserWithCore({
                        phoneNumber: currentUser.phone,
                        localUserId: currentUser.id || currentUser.nickname,
                        name: currentUser.name || currentUser.nickname,
                    }).then(async (syncResult) => {
                        if (syncResult?.success && syncResult?.masterUserId) {
                            setHasMasterUserId(true);
                            // Supabase 업데이트
                            if (isSupabaseEnabled()) {
                                await updateMasterUserIdInSupabase(currentUser.id || currentUser.nickname, syncResult.masterUserId);
                            }
                            // 로컬스토리지 세션 업데이트
                            const updatedUser = { ...currentUser, master_user_id: syncResult.masterUserId };
                            localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

                            // 포인트 및 내역 조회
                            Promise.all([
                                getPointsBalance(syncResult.masterUserId),
                                getPointsHistory(syncResult.masterUserId),
                            ]).then(([balRes, histRes]) => {
                                if (balRes?.success) setPointsBalance(balRes.balance ?? 0);
                                if (histRes?.success) setPointsHistory((histRes.history || []).slice(0, 5));
                            }).catch(() => {
                                setPointsError(true);
                            });
                        }
                    }).catch((err) => {
                        console.error('[ProfileEditModal] 자동 동기화 실패:', err);
                    }).finally(() => {
                        setPointsLoading(false);
                    });
                }
            }
        };

        initUser();
        isPasskeySupported().then(setBiometricSupported);

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
            <div className="bg-white border border-[#E8E0FA] rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
                
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

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
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

                        {/* ── 💳 통합 포인트 전자지갑 ── */}
                        <div className="pt-4 border-t border-[#E8E0FA] mt-2">
                            <div className="flex items-center gap-2 mb-3">
                                <p className="text-[#1F1235] text-[13px] font-black uppercase tracking-wider flex items-center gap-1">
                                    💳 통합 포인트
                                </p>
                            </div>

                            {!hasMasterUserId ? (
                                <div className="flex items-center gap-3 py-4 px-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <span className="material-symbols-outlined text-[22px] text-gray-300">sync</span>
                                    <div>
                                        <p className="text-sm font-bold text-gray-400">포인트 연동 준비 중...</p>
                                        <p className="text-[11px] text-gray-300 mt-0.5">다음 로그인 시 자동으로 연동됩니다</p>
                                    </div>
                                </div>
                            ) : pointsLoading ? (
                                <div className="space-y-4 animate-pulse">
                                    <div className="h-32 bg-purple-50/50 rounded-2xl" />
                                    <div className="h-24 bg-gray-50 rounded-2xl" />
                                </div>
                            ) : pointsError ? (
                                <div className="flex flex-col items-center gap-2 py-5">
                                    <span className="material-symbols-outlined text-[28px] text-gray-300">cloud_off</span>
                                    <p className="text-xs text-gray-400 font-bold">잠시 후 다시 시도해 주세요</p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const u = getUser();
                                            if (!u?.master_user_id) return;
                                            setPointsLoading(true);
                                            setPointsError(false);
                                            Promise.all([
                                                getPointsBalance(u.master_user_id),
                                                getPointsHistory(u.master_user_id),
                                            ]).then(([balRes, histRes]) => {
                                                if (balRes?.success) setPointsBalance(balRes.balance ?? 0);
                                                if (histRes?.success) setPointsHistory((histRes.history || []).slice(0, 5));
                                            }).catch(() => setPointsError(true))
                                              .finally(() => setPointsLoading(false));
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-100 text-violet-600 text-xs font-bold"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">refresh</span>
                                        새로고침
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* 잔액 카드 */}
                                    <div className="px-5 py-5 rounded-2xl bg-[#F3EEFF]/80 border border-[#E1D3FD]">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-8 h-8 rounded-[10px] bg-[#633AE8] flex items-center justify-center shadow-sm">
                                                <span className="material-symbols-outlined text-[18px] text-white">toll</span>
                                            </div>
                                            <p className="text-[#633AE8] text-[13px] font-black">통합 포인트 잔액</p>
                                        </div>
                                        
                                        <p className="text-center text-[38px] font-black text-[#8E82B1] mb-3 tracking-tight">
                                            {pointsBalance !== null ? pointsBalance.toLocaleString() : '0'} <span className="font-bold text-[32px]">P</span>
                                        </p>

                                        {pointsBalance === 0 && (
                                            <p className="text-center text-[11px] text-[#A89EC7] mb-4 font-bold">
                                                아직 적립된 포인트가 없습니다.
                                            </p>
                                        )}

                                        <div className="w-full py-2.5 px-3 rounded-2xl bg-[#EBE3FC] text-[#633AE8] text-[11px] font-black flex items-center justify-center gap-1 shadow-sm">
                                            <span>✨</span>
                                            <span>포인트는 모델뷰티 앱에서 사용 가능합니다</span>
                                        </div>
                                    </div>

                                    {/* 최근 포인트 내역 */}
                                    <div className="bg-white border border-[#EBE3FC] rounded-2xl p-4 mt-3 shadow-sm">
                                        <div className="pb-3 border-b border-[#F3F0FF] mb-3">
                                            <p className="text-[13px] font-black text-[#1F1235]">최근 포인트 내역</p>
                                        </div>
                                        {pointsHistory.length === 0 ? (
                                            <div className="py-6 text-center">
                                                <p className="text-[12px] font-bold text-gray-400">내역이 없습니다.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3.5">
                                                {pointsHistory.map((item) => {
                                                    const isReward = item.tx_type === 'reward' || item.amount > 0;
                                                    const date = item.created_at
                                                        ? new Date(item.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
                                                        : '-';
                                                    return (
                                                        <div key={item.id} className="flex items-center justify-between py-0.5">
                                                            <div className="flex items-center gap-2.5 min-w-0">
                                                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isReward ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                                                    <span className={`material-symbols-outlined text-[13px] ${isReward ? 'text-emerald-500' : 'text-red-400'}`}>
                                                                        {isReward ? 'add_circle' : 'remove_circle'}
                                                                    </span>
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-[#1F1235] truncate">{item.description || '-'}</p>
                                                                    <p className="text-[10px] text-[#9CA3AF]">{item.app_source || 'MOCA'} · {date}</p>
                                                                </div>
                                                            </div>
                                                            <span className={`text-xs font-black flex-shrink-0 ml-2 ${isReward ? 'text-emerald-500' : 'text-red-400'}`}>
                                                                {isReward ? '+' : ''}{Math.abs(item.amount).toLocaleString()}P
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* ── 🎟️ 참석 프리패스 (출석체크+모카그램 리워드) ── */}
                        <div className="pt-4 border-t border-[#E8E0FA] mt-2">
                            <p className="text-[#1F1235] text-[13px] font-black uppercase tracking-wider mb-3 flex items-center gap-1">
                                🎟️ 원데이클래스 참석 프리패스
                            </p>

                            {couponsLoading ? (
                                <div className="h-16 rounded-2xl bg-purple-50/50 animate-pulse" />
                            ) : coupons.length === 0 ? (
                                <div className="flex items-center gap-3 py-4 px-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <span className="material-symbols-outlined text-[22px] text-gray-300">confirmation_number</span>
                                    <div>
                                        <p className="text-sm font-bold text-gray-400">보유한 프리패스가 없습니다</p>
                                        <p className="text-[11px] text-gray-300 mt-0.5">출석체크 + 모카그램 업로드로 모아보세요</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {coupons.map(c => (
                                        <div
                                            key={c.id}
                                            className={`flex items-center justify-between p-4 rounded-2xl border ${c.status === 'unused' ? 'bg-[#F3EEFF]/80 border-[#E1D3FD]' : 'bg-gray-50 border-gray-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.status === 'unused' ? 'bg-[#633AE8]' : 'bg-gray-300'}`}>
                                                    <span className="material-symbols-outlined text-[18px] text-white">confirmation_number</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-[#1F1235]">원데이클래스 참석 프리패스</p>
                                                    <p className="text-[10px] text-[#9CA3AF] font-medium">
                                                        발급일 {c.issued_at ? new Date(c.issued_at).toLocaleDateString('ko-KR') : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${c.status === 'unused' ? 'bg-[#633AE8] text-white' : 'bg-gray-200 text-gray-500'}`}>
                                                {c.status === 'unused' ? '사용가능' : '사용완료'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 보안 및 로그인 설정 (비밀번호 변경 및 생체 로그인) */}
                        <div className="pt-4 border-t border-[#E8E0FA] mt-2 space-y-4">
                            <p className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider">보안 및 로그인 설정</p>
                            
                            {/* 비밀번호 변경 */}
                            <div className="space-y-1.5">
                                <label className="text-[#5B4E7A] text-[10px] font-bold ml-1 text-gray-500">
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

                            {/* 지문/생체로그인 등록하기 */}
                            {biometricSupported && (
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
                            )}
                        </div>

                        {/* 약관 및 마케팅 동의 */}
                        <div className="pt-4 border-t border-[#E8E0FA] mt-2 space-y-3">
                            <p className="text-[#5B4E7A] text-[11px] font-black ml-1 uppercase tracking-wider mb-1">약관 및 마케팅 동의</p>
                            
                            {/* 서비스 이용약관 동의 */}
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
                            {!user?.marketing_consent && !formData.marketing_consent && (
                                <p className="text-[10px] text-[#9CA3AF] px-2 leading-relaxed italic">
                                    ※ 동의 시 모카의 혜택 및 이벤트 소식을 빠르게 받아보실 수 있습니다.
                                </p>
                            )}
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
