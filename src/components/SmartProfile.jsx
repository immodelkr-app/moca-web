import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, updateSmartProfile, uploadProfilePhoto } from '../services/userService';

const GOOGLE_API_KEY = 'AIzaSyDHL15S2cq0umttfXh2ka6TFddamWJ9byI';
const GOOGLE_CLIENT_ID = '1035713999053-4i9a5k0gsn0457uroib1eef93cjssedo.apps.googleusercontent.com';

const SmartProfile = () => {
    const navigate = useNavigate();
    const user = getUser();
    const fileInputRef = useRef(null);
    const pickerInited = useRef(false);
    const gisInited = useRef(false);
    const tokenClient = useRef(null);
    const accessToken = useRef(null);

    const [formData, setFormData] = useState({
        height: '',
        weight: '',
        age: '',
        shoe_size: '',
        portfolio_link: '',
        photo_base64: '',
        photo_url: '',
    });
    const [photoUploading, setPhotoUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [photoPreview, setPhotoPreview] = useState(null);
    const [pickerLoading, setPickerLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        setFormData({
            height: user.height || '',
            weight: user.weight || '',
            age: user.age || '',
            shoe_size: user.shoe_size || '',
            portfolio_link: user.portfolio_link || '',
            photo_base64: user.photo_base64 || '',
            photo_url: user.photo_url || '',
        });
        if (user.photo_url) setPhotoPreview(user.photo_url);
        else if (user.photo_base64) setPhotoPreview(user.photo_base64);
    }, []);

    const initTokenClient = () => {
        if (!window.google?.accounts?.oauth2) return;
        tokenClient.current = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.readonly',
            callback: (response) => {
                if (response.error) {
                    setPickerLoading(false);
                    return;
                }
                accessToken.current = response.access_token;
                openPicker(response.access_token);
            },
        });
        gisInited.current = true;
    };

    const loadScript = (id, src, onload) => {
        if (document.getElementById(id)) {
            // 이미 스크립트 태그 있음 — 로드 완료 여부 폴링
            const interval = setInterval(() => {
                if (onload()) clearInterval(interval);
            }, 200);
            setTimeout(() => clearInterval(interval), 10000); // 10초 타임아웃
        } else {
            const script = document.createElement('script');
            script.id = id;
            script.src = src;
            script.async = true;
            script.defer = true;
            script.onload = onload;
            document.body.appendChild(script);
        }
    };

    // Google API 스크립트 로드
    useEffect(() => {
        // gapi
        if (window.gapi) {
            window.gapi.load('picker', () => { pickerInited.current = true; });
        } else {
            loadScript('gapi-script', 'https://apis.google.com/js/api.js', () => {
                if (window.gapi) {
                    window.gapi.load('picker', () => { pickerInited.current = true; });
                    return true;
                }
                return false;
            });
        }

        // gis
        if (window.google?.accounts?.oauth2) {
            initTokenClient();
        } else {
            loadScript('gis-script', 'https://accounts.google.com/gsi/client', () => {
                if (window.google?.accounts?.oauth2) {
                    initTokenClient();
                    return true;
                }
                return false;
            });
        }
    }, []);

    const openPicker = (token) => {
        if (!window.google || !window.google.picker) {
            setPickerLoading(false);
            setErrorMsg('Google Picker 로딩 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        const picker = new window.google.picker.PickerBuilder()
            .addView(new window.google.picker.DocsView()
                .setIncludeFolders(true)
                .setSelectFolderEnabled(true)
            )
            .setOAuthToken(token)
            .setDeveloperKey(GOOGLE_API_KEY)
            .setCallback((data) => {
                setPickerLoading(false);
                if (data.action === window.google.picker.Action.PICKED) {
                    const doc = data.docs[0];
                    const fileId = doc.id;
                    const mimeType = doc.mimeType || '';

                    let url;
                    if (mimeType === 'application/vnd.google-apps.folder') {
                        url = `https://drive.google.com/drive/folders/${fileId}?usp=sharing`;
                    } else {
                        url = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
                    }

                    setFormData(prev => ({ ...prev, portfolio_link: url }));
                    setErrorMsg('');
                }
            })
            .build();

        picker.setVisible(true);
    };

    const handlePickerClick = () => {
        setPickerLoading(true);

        // 아직 초기화 안됐으면 재시도
        if (!gisInited.current || !tokenClient.current) {
            if (window.google?.accounts?.oauth2) {
                initTokenClient();
            }
            // 최대 5초 대기 후 재시도
            let attempts = 0;
            const retry = setInterval(() => {
                attempts++;
                if (gisInited.current && tokenClient.current) {
                    clearInterval(retry);
                    accessToken.current = null;
                    tokenClient.current.requestAccessToken({ prompt: 'select_account' });
                } else if (attempts >= 25) {
                    clearInterval(retry);
                    setPickerLoading(false);
                    setErrorMsg('Google 연동에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
                }
            }, 200);
            return;
        }

        accessToken.current = null;
        tokenClient.current.requestAccessToken({ prompt: 'select_account' });
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setErrorMsg('');
    };

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            setErrorMsg('사진 파일은 2MB 이하만 가능합니다.');
            return;
        }
        // 로컬 미리보기 (base64)
        const reader = new FileReader();
        reader.onload = (evt) => {
            setPhotoPreview(evt.target.result);
            setFormData(prev => ({ ...prev, photo_base64: evt.target.result }));
        };
        reader.readAsDataURL(file);

        // Supabase Storage 업로드 → 공개 URL 저장
        setPhotoUploading(true);
        const nickname = user?.nickname || user?.name || 'unknown';
        const { url, error } = await uploadProfilePhoto(file, nickname);
        setPhotoUploading(false);
        if (url) {
            setFormData(prev => ({ ...prev, photo_url: url }));
        } else if (error) {
            setErrorMsg(`사진 업로드 실패: ${error}`);
        }
    };

    const isValidUrl = (url) => {
        if (!url) return false;
        try { new URL(url); return true; } catch { return false; }
    };

    const isDriveUrl = (url) => {
        return url && url.includes('drive.google.com');
    };

    const hasProfile = formData.portfolio_link && isValidUrl(formData.portfolio_link);

    const handleSave = async () => {
        if (!formData.portfolio_link) {
            setErrorMsg('프로필 링크를 입력해주세요. (필수)');
            return;
        }
        if (!isValidUrl(formData.portfolio_link)) {
            setErrorMsg('올바른 URL 형식을 입력해주세요.');
            return;
        }
        setErrorMsg('');
        setSaving(true);
        try {
            await updateSmartProfile(user?.id, formData);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch {
            setErrorMsg('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">

            {/* Ambient */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-56 bg-[#10B981]/8 blur-[120px]" />
            </div>

            {/* Header */}
            <div className="relative z-10 px-5 pt-8 pb-4 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0"
                >
                    <span className="material-symbols-outlined text-[20px] text-white/60">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-xl font-black text-white tracking-tight">나의 프로필 관리</h1>
                    <p className="text-white/30 text-xs mt-0.5">등록하면 에이전시에 원클릭 지원 가능</p>
                </div>
            </div>

            <div className="relative z-10 flex-1 px-5 pb-36 space-y-4 overflow-y-auto">

                {/* Status Banner */}
                <div className={`rounded-2xl p-4 border flex items-center gap-3 ${hasProfile
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-[#6C63FF]/10 border-[#6C63FF]/20'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${hasProfile ? 'bg-emerald-500/20' : 'bg-[#6C63FF]/20'}`}>
                        <span className={`material-symbols-outlined text-[20px] ${hasProfile ? 'text-emerald-400' : 'text-[#818CF8]'}`}>
                            {hasProfile ? 'check_circle' : 'info'}
                        </span>
                    </div>
                    <div>
                        <p className={`text-sm font-black ${hasProfile ? 'text-emerald-400' : 'text-[#A78BFA]'}`}>
                            {hasProfile ? '프로필 등록 완료 · 프로필발송 활성화!' : '구글드라이브에서 프로필를 선택해주세요'}
                        </p>
                        <p className={`text-xs mt-0.5 ${hasProfile ? 'text-emerald-400/60' : 'text-white/30'}`}>
                            {hasProfile ? '에이전시 리스트에서 \'프로필발송\' 버튼을 눌러보세요' : '아래 구글드라이브 버튼을 눌러 파일을 선택하세요'}
                        </p>
                    </div>
                </div>

                {/* ── 대표 사진 ── */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-[#EC4899]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[15px] text-[#F472B6]">photo_camera</span>
                        </div>
                        <h2 className="font-black text-white text-base">대표 사진</h2>
                        <span className="text-white/30 text-[11px] ml-1">에이전시가 보는 첫인상</span>
                    </div>
                    <div className="flex items-center gap-5">
                        <div
                            className="w-24 h-24 rounded-2xl bg-white/5 border-2 border-dashed border-white/15 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#6C63FF]/50 transition-colors flex-shrink-0 active:scale-95"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="프로필" className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[28px] text-white/15">add_photo_alternate</span>
                                    <span className="text-white/20 text-[10px] font-bold">사진 등록</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-white/40 text-sm font-medium leading-relaxed">
                                깔끔한 반신 또는<br />전신 사진 권장
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={photoUploading}
                                className="mt-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm font-bold hover:bg-white/10 hover:text-white/70 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {photoUploading ? '업로드 중...' : photoPreview ? '사진 변경' : '사진 선택'}
                            </button>
                            {formData.photo_url && (
                                <p className="mt-1.5 text-emerald-400 text-[10px] font-bold">✓ 메일 발송 시 사진 포함</p>
                            )}
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </div>
                </div>

                {/* ── 기본 스펙 ── */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[15px] text-[#FCD34D]">straighten</span>
                        </div>
                        <h2 className="font-black text-white text-base">기본 스펙</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { name: 'age', label: '출생년도', unit: '년생', placeholder: '1999' },
                            { name: 'height', label: '키', unit: 'cm', placeholder: '170' },
                            { name: 'weight', label: '몸무게', unit: 'kg', placeholder: '55' },
                            { name: 'shoe_size', label: '신발사이즈', unit: 'mm', placeholder: '270' },
                        ].map(field => (
                            <div key={field.name} className="space-y-1.5">
                                <label className="text-white/40 text-[11px] font-bold ml-1">{field.label}</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name={field.name}
                                        value={formData[field.name]}
                                        onChange={handleChange}
                                        placeholder={field.placeholder}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#6C63FF] transition-colors text-center"
                                    />
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/25 text-[10px] font-bold">{field.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── 프로필 링크 (Google Drive Picker) ── */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-[#4285F4]/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[15px] text-[#4285F4]">add_to_drive</span>
                        </div>
                        <h2 className="font-black text-white text-base">프로필</h2>
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black">필수</span>
                    </div>
                    <p className="text-white/35 text-xs leading-relaxed mb-4">
                        구글드라이브에서 파일 또는 폴더를 선택하면<br />링크가 자동으로 입력됩니다.
                    </p>

                    {/* 구글드라이브 선택 버튼 */}
                    <button
                        onClick={handlePickerClick}
                        disabled={pickerLoading}
                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-[#4285F4]/40 bg-[#4285F4]/8 hover:bg-[#4285F4]/15 hover:border-[#4285F4]/60 transition-all active:scale-[0.98] mb-3"
                    >
                        {pickerLoading ? (
                            <>
                                <div className="w-5 h-5 rounded-full border-2 border-[#4285F4] border-t-transparent animate-spin" />
                                <span className="text-[#4285F4] font-black text-sm">연결 중...</span>
                            </>
                        ) : (
                            <>
                                {/* 구글 드라이브 컬러 아이콘 */}
                                <svg width="22" height="22" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                                </svg>
                                <span className="text-white font-black text-sm">구글드라이브에서 파일 선택</span>
                            </>
                        )}
                    </button>

                    {/* 선택된 링크 표시 */}
                    {formData.portfolio_link && (
                        <div className={`flex items-center gap-2 p-3 rounded-xl border ${isDriveUrl(formData.portfolio_link)
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-white/5 border-white/10'}`}>
                            <span className={`material-symbols-outlined text-[16px] flex-shrink-0 ${isDriveUrl(formData.portfolio_link) ? 'text-emerald-400' : 'text-white/30'}`}>
                                {isDriveUrl(formData.portfolio_link) ? 'check_circle' : 'link'}
                            </span>
                            <p className="text-xs font-bold truncate flex-1 text-white/60">{formData.portfolio_link}</p>
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, portfolio_link: '' }))}
                                className="text-white/30 hover:text-white/60 flex-shrink-0"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        </div>
                    )}

                    {/* 직접 입력 (대체 수단) */}
                    {!formData.portfolio_link && (
                        <div className="mt-2">
                            <p className="text-white/60 text-sm text-center mb-2">또는 직접 링크 입력</p>
                            <input
                                type="url"
                                name="portfolio_link"
                                value={formData.portfolio_link}
                                onChange={handleChange}
                                placeholder="https://drive.google.com/..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base placeholder-white/40 focus:outline-none focus:border-[#4285F4] transition-colors"
                            />
                        </div>
                    )}
                </div>


                {/* ── 이메일 미리보기 ── */}
                {hasProfile && (
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-[15px] text-[#818CF8]">preview</span>
                            <p className="font-black text-white/50 text-xs tracking-wide uppercase">에이전시가 받을 이메일 미리보기</p>
                        </div>
                        <div className="bg-[#12121e] border border-[#6C63FF]/25 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
                                <p className="text-white/25 text-[11px] mb-0.5">발신: casting@immoca.kr</p>
                                <p className="text-white text-sm font-black">
                                    {user?.name || user?.nickname}모델님 프로필입니다.
                                </p>
                            </div>
                            <div className="px-5 py-4 space-y-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-[60px] h-[60px] rounded-xl bg-white/8 overflow-hidden flex-shrink-0">
                                        {photoPreview
                                            ? <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                                            : <div className="w-full h-full flex items-center justify-center"><span className="material-symbols-outlined text-[26px] text-white/15">person</span></div>
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-white text-base leading-tight">{user?.name || user?.nickname}</p>
                                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                            {formData.age && <span className="text-white/40 text-xs">{formData.age}년생</span>}
                                            {formData.height && <span className="text-white/40 text-xs">키 {formData.height}cm</span>}
                                            {formData.weight && <span className="text-white/40 text-xs">{formData.weight}kg</span>}
                                            {user?.phone && <span className="text-white/40 text-xs">{user.phone}</span>}
                                        </div>
                                    </div>
                                </div>
                                <a
                                    href={formData.portfolio_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#6C63FF]/15 border border-[#6C63FF]/25 hover:bg-[#6C63FF]/25 active:scale-[0.98] transition-all"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-[#A78BFA]">folder_open</span>
                                    <span className="text-[#A78BFA] text-sm font-black flex-1 truncate">
                                        {user?.name || user?.nickname}모델님 프로필 다운받기
                                    </span>
                                    <span className="material-symbols-outlined text-[14px] text-[#A78BFA]/60">open_in_new</span>
                                </a>
                                <p className="text-white/20 text-[10px] text-center">
                                    Powered by 아임모카 · 광고모델 스마트 캐스팅
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {errorMsg && (
                    <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                        <span className="material-symbols-outlined text-[16px] text-red-400 flex-shrink-0">error</span>
                        <p className="text-red-400 text-sm font-bold">{errorMsg}</p>
                    </div>
                )}

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`w-full py-4 rounded-2xl text-white font-black text-base shadow-lg transition-all active:scale-[0.98] ${saved
                        ? 'bg-emerald-500 shadow-emerald-500/30'
                        : saving
                            ? 'bg-[#6C63FF]/50 cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#6C63FF] to-[#818CF8] hover:from-[#5a52d5] hover:to-[#6C63FF] shadow-[#6C63FF]/30'
                        }`}
                >
                    <span className="flex items-center justify-center gap-2">
                        <span className={`material-symbols-outlined text-[20px] ${saving ? 'animate-spin' : ''}`}>
                            {saved ? 'check_circle' : saving ? 'sync' : 'save'}
                        </span>
                        {saved ? '저장 완료!' : saving ? '저장 중...' : '프로필 저장하기'}
                    </span>
                </button>

                {hasProfile && (
                    <button
                        onClick={() => navigate('/agencies')}
                        className="w-full py-4 rounded-2xl text-[#A78BFA] font-black text-base border border-[#6C63FF]/30 bg-[#6C63FF]/8 hover:bg-[#6C63FF]/15 active:scale-[0.98] transition-all"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">forward_to_inbox</span>
                            에이전시 리스트에서 프로필발송 →
                        </span>
                    </button>
                )}

            </div>
        </div>
    );
};

export default SmartProfile;
