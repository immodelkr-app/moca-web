import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, updateSmartProfile } from '../services/userService';
import { uploadCurrentPhoto, fetchUserCurrentPhotos, deleteCurrentPhoto } from '../services/currentPhotosService';

const GOOGLE_API_KEY = 'AIzaSyDHL15S2cq0umttfXh2ka6TFddamWJ9byI';
const GOOGLE_CLIENT_ID = '1035713999053-4i9a5k0gsn0457uroib1eef93cjssedo.apps.googleusercontent.com';

const SmartProfile = () => {
    const navigate = useNavigate();
    const user = getUser();
    const pickerInited = useRef(false);
    const gisInited = useRef(false);
    const tokenClient = useRef(null);
    const accessToken = useRef(null);

    const [formData, setFormData] = useState({
        name: '',            // 이름(본명)
        height: '',
        weight: '',
        age: '',
        shoe_size: '',
        portfolio_link: '',
        career_ad: '',       // 광고모델 경력
        career_other: '',    // 그외 경력사항
    });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [pickerLoading, setPickerLoading] = useState(false);

    // 현재모습 사진 관련
    const currentPhotoInputRef = useRef(null);
    const [currentPhotos, setCurrentPhotos] = useState([]);
    const [currentPhotoUploading, setCurrentPhotoUploading] = useState(false);
    const [currentPhotoMsg, setCurrentPhotoMsg] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showGradePopup, setShowGradePopup] = useState(false);

    useEffect(() => {
        if (!user) return;
        setFormData({
            name: user.name || '',
            height: user.height || '',
            weight: user.weight || '',
            age: user.age || '',
            shoe_size: user.shoe_size || '',
            portfolio_link: user.portfolio_link || '',
            career_ad: user.career_ad || '',
            career_other: user.career_other || '',
        });

        if (user.id || user.nickname) {
            fetchUserCurrentPhotos(user.id, user.nickname).then(setCurrentPhotos);
        }
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
            const interval = setInterval(() => {
                if (onload()) clearInterval(interval);
            }, 200);
            setTimeout(() => clearInterval(interval), 10000);
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

    useEffect(() => {
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

        if (!gisInited.current || !tokenClient.current) {
            if (window.google?.accounts?.oauth2) {
                initTokenClient();
            }
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
                    const isCapacitor = window.Capacitor || window.webkit?.messageHandlers?.bridge;
                    setErrorMsg(isCapacitor 
                        ? '모바일 앱(APK)에서는 구글 연동이 제한될 수 있습니다. 해결되지 않을 경우 웹(immoca.kr)에서 등록하시거나 링크를 직접 입력해주세요.'
                        : 'Google 연동에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
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

    // 등급 체크: GOLD 이상만 현재모습 사진 사용 가능
    const ALLOWED_GRADES = ['GOLD', 'VIP', 'VVIP'];
    const isPhotoAllowed = ALLOWED_GRADES.includes(user?.grade);

    const handleCurrentPhotoClick = () => {
        if (!isPhotoAllowed) {
            setShowGradePopup(true);
            return;
        }
        currentPhotoInputRef.current?.click();
    };

    const handleCurrentPhotoChange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;

        if (currentPhotos.length + files.length > 10) {
            setCurrentPhotoMsg('사진은 최대 10장까지 저장할 수 있습니다.');
            setTimeout(() => setCurrentPhotoMsg(''), 3000);
            return;
        }

        setCurrentPhotoUploading(true);
        setCurrentPhotoMsg('');

        for (const file of files) {
            if (file.size > 10 * 1024 * 1024) {
                setCurrentPhotoMsg('사진 파일은 10MB 이하만 가능합니다.');
                continue;
            }
            const { url, error } = await uploadCurrentPhoto(file, user);
            if (url) {
                setCurrentPhotos(prev => [{
                    id: Date.now() + Math.random(),
                    photo_url: url,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                }, ...prev]);
            } else if (error) {
                setCurrentPhotoMsg(`업로드 실패: ${error}`);
            }
        }

        setCurrentPhotoUploading(false);
        setCurrentPhotoMsg('저장 완료!');
        setTimeout(() => setCurrentPhotoMsg(''), 3000);
        e.target.value = '';
    };

    const handleDeleteCurrentPhoto = async (photo) => {
        if (!window.confirm('이 사진을 삭제할까요?')) return;
        const { success } = await deleteCurrentPhoto(photo.id, photo.storage_path);
        if (success) {
            setCurrentPhotos(prev => prev.filter(p => p.id !== photo.id));
        }
    };

    const STATUS_LABEL = {
        pending: { text: '검토중', color: 'text-yellow-400', bg: 'bg-yellow-500/15' },
        approved: { text: '승인', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
        needs_more: { text: '추가요청', color: 'text-red-400', bg: 'bg-red-500/15' },
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
        <>
        <div className="min-h-screen flex flex-col" style={{backgroundColor:'var(--moca-bg)',color:'var(--moca-text)'}}>

            {/* Header */}
            <div className="relative z-10 px-5 pt-8 pb-4 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="w-9 h-9 rounded-xl bg-[#F3E8FF] border border-[#E8E0FA] flex items-center justify-center hover:bg-[#EDE8FF] transition-colors flex-shrink-0"
                >
                    <span className="material-symbols-outlined text-[20px] text-[#7C3AED]">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-xl font-black tracking-tight" style={{color:'var(--moca-text)'}}>
                        모델 {user?.name || user?.nickname}님의 프로필
                    </h1>
                    <p className="text-[#9CA3AF] text-xs mt-0.5">등록하면 에이전시에 원클릭 지원 가능</p>
                </div>
            </div>

            <div className="relative z-10 flex-1 px-5 pb-36 space-y-4 overflow-y-auto">

                {/* Status Banner */}
                <div className={`rounded-2xl p-4 border flex items-center gap-3 ${hasProfile
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-[#9333EA]/10 border-[#9333EA]/20'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${hasProfile ? 'bg-emerald-500/20' : 'bg-[#9333EA]/20'}`}>
                        <span className={`material-symbols-outlined text-[20px] ${hasProfile ? 'text-emerald-500' : 'text-[#9333EA]'}`}>
                            {hasProfile ? 'check_circle' : 'info'}
                        </span>
                    </div>
                    <div>
                        <p className={`text-sm font-black ${hasProfile ? 'text-emerald-500' : 'text-[#7C3AED]'}`}>
                            {hasProfile ? '프로필 등록 완료 · 프로필발송 활성화!' : '구글드라이브에서 프로필를 선택해주세요'}
                        </p>
                        <p className={`text-xs mt-0.5 ${hasProfile ? 'text-emerald-500/60' : 'text-[#9CA3AF]'}`}>
                            {hasProfile ? '에이전시 리스트에서 \'프로필발송\' 버튼을 눌러보세요' : '아래 구글드라이브 버튼을 눌러 파일을 선택하세요'}
                        </p>
                    </div>
                </div>

                {/* ── 모델 프로필 ── */}
                <div className="bg-white border border-[#E8E0FA] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-[#F3E8FF] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[15px] text-[#9333EA]">straighten</span>
                        </div>
                        <h2 className="font-black text-[#1F1235] text-base">모델 프로필</h2>
                    </div>

                    {/* 이름 필드 추가 */}
                    <div className="space-y-1.5 mb-5">
                        <label className="text-[#5B4E7A] text-[11px] font-bold ml-1">이름 (본명) <span className="text-[#9333EA] font-black">*</span></label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="예) 홍길동"
                            className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-xl px-4 py-3 text-[#1F1235] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-colors"
                        />
                    </div>

                    {/* 신체 스펙 */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        {[
                            { name: 'age', label: '출생년도', unit: '년생', placeholder: '1999', type: 'number' },
                            { name: 'height', label: '키', unit: 'cm', placeholder: '170', type: 'number' },
                            { name: 'weight', label: '몸무게', unit: 'kg', placeholder: '55', type: 'number' },
                            { name: 'shoe_size', label: '신발사이즈', unit: 'mm', placeholder: '270', type: 'number' },
                        ].map(field => (
                            <div key={field.name} className="space-y-1.5">
                                <label className="text-[#5B4E7A] text-[11px] font-bold ml-1">{field.label}</label>
                                <div className="relative">
                                    <input
                                        type={field.type}
                                        name={field.name}
                                        value={formData[field.name]}
                                        onChange={handleChange}
                                        placeholder={field.placeholder}
                                        className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-xl px-3 py-2.5 text-[#1F1235] text-sm focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-colors text-center"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-[10px] font-bold">{field.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 경력 섹션 구분선 */}
                    <div className="flex items-center gap-2 mb-4 pt-1 border-t border-[#E8E0FA]">
                        <div className="w-6 h-6 rounded-lg bg-[#F3E8FF] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[13px] text-[#9333EA]">workspace_premium</span>
                        </div>
                        <span className="text-[#5B4E7A] text-xs font-black tracking-wide uppercase">경력</span>
                    </div>

                    {/* 광고모델 경력 */}
                    <div className="space-y-1.5 mb-3">
                        <label className="text-[#5B4E7A] text-[11px] font-bold ml-1">광고모델 경력</label>
                        <textarea
                            name="career_ad"
                            value={formData.career_ad}
                            onChange={handleChange}
                            placeholder="예) 삼성전자 갤럭시 광고, 롯데백화점 시즌 광고, KB국민은행 TV CF..."
                            rows={3}
                            className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-xl px-4 py-3 text-[#1F1235] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-colors resize-none leading-relaxed"
                        />
                    </div>

                    {/* 그외 경력사항 */}
                    <div className="space-y-1.5">
                        <label className="text-[#5B4E7A] text-[11px] font-bold ml-1">그외 경력사항 <span className="text-[#9CA3AF] font-normal">(방송·연극·패션쇼 대표작 기재)</span></label>
                        <textarea
                            name="career_other"
                            value={formData.career_other}
                            onChange={handleChange}
                            placeholder="예) KBS 드라마 OOO 출연, 서울컬렉션 패션쇼, 예술의전당 연극 OOO..."
                            rows={3}
                            className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-xl px-4 py-3 text-[#1F1235] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] focus:ring-2 focus:ring-[#9333EA]/10 transition-colors resize-none leading-relaxed"
                        />
                    </div>
                </div>

                {/* ── 프로필 링크 ── */}
                <div className="bg-white border border-[#E8E0FA] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-[#EBF5FF] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[15px] text-[#4285F4]">add_to_drive</span>
                        </div>
                        <h2 className="font-black text-[#1F1235] text-base">프로필</h2>
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-500 text-[10px] font-black">필수</span>
                    </div>
                    <p className="text-[#5B4E7A] text-xs leading-relaxed mb-4">
                        구글드라이브에서 파일 또는 폴더를 선택하면<br />링크가 자동으로 입력됩니다.
                    </p>

                    <button
                        onClick={handlePickerClick}
                        disabled={pickerLoading}
                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-[#4285F4]/40 bg-[#4285F4]/5 hover:bg-[#4285F4]/10 hover:border-[#4285F4]/60 transition-all active:scale-[0.98] mb-3"
                    >
                        {pickerLoading ? (
                            <>
                                <div className="w-5 h-5 rounded-full border-2 border-[#4285F4] border-t-transparent animate-spin" />
                                <span className="text-[#4285F4] font-black text-sm">연결 중...</span>
                            </>
                        ) : (
                            <>
                                <svg width="22" height="22" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                                </svg>
                                <span className="text-[#4285F4] font-black text-sm">구글드라이브에서 파일 선택</span>
                            </>
                        )}
                    </button>

                    {formData.portfolio_link && (
                        <div className={`flex items-center gap-2 p-3 rounded-xl border ${isDriveUrl(formData.portfolio_link)
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : 'bg-[#F8F5FF] border-[#E8E0FA]'}`}>
                            <span className={`material-symbols-outlined text-[16px] flex-shrink-0 ${isDriveUrl(formData.portfolio_link) ? 'text-emerald-500' : 'text-[#9CA3AF]'}`}>
                                {isDriveUrl(formData.portfolio_link) ? 'check_circle' : 'link'}
                            </span>
                            <p className="text-xs font-black truncate flex-1 text-[#5B4E7A]">{formData.portfolio_link}</p>
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, portfolio_link: '' }))}
                                className="text-[#9CA3AF] hover:text-[#5B4E7A] flex-shrink-0"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        </div>
                    )}

                    {!formData.portfolio_link && (
                        <div className="mt-2">
                            <p className="text-[#9CA3AF] text-sm text-center mb-2">또는 직접 링크 입력</p>
                            <input
                                type="url"
                                name="portfolio_link"
                                value={formData.portfolio_link}
                                onChange={handleChange}
                                placeholder="https://drive.google.com/..."
                                className="w-full bg-[#F8F5FF] border border-[#E8E0FA] rounded-xl px-4 py-3 text-[#1F1235] text-base placeholder-[#9CA3AF] focus:outline-none focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/10 transition-colors"
                            />
                        </div>
                    )}
                </div>

                {/* ── 이메일 미리보기 ── */}
                {hasProfile && (
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2 px-1">
                            <span className="material-symbols-outlined text-[15px] text-[#9333EA]">preview</span>
                            <p className="font-black text-[#5B4E7A] text-[11px] tracking-wide uppercase">에이전시가 받을 이메일 미리보기</p>
                        </div>
                        <div className="bg-white border border-[#E8E0FA] rounded-2xl overflow-hidden shadow-sm">
                            <div className="px-5 py-3 border-b border-[#E8E0FA] bg-[#F8F5FF]">
                                <p className="text-[#9CA3AF] text-[10px] mb-0.5">발신: casting@immoca.kr</p>
                                <p className="text-[#1F1235] text-[13px] font-black">
                                    광고모델 {formData.name || user?.name || user?.nickname}님의 프로필 정보입니다.
                                </p>
                            </div>
                            <div className="px-5 py-4 space-y-3.5">
                                <div>
                                    <p className="font-black text-[#1F1235] text-base">{formData.name || user?.name || user?.nickname}</p>
                                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                        {formData.age && <span className="text-[#5B4E7A] text-xs font-medium">{formData.age}년생</span>}
                                        {formData.height && <span className="text-[#5B4E7A] text-xs font-medium">키 {formData.height}cm</span>}
                                        {formData.weight && <span className="text-[#5B4E7A] text-xs font-medium">{formData.weight}kg</span>}
                                        {formData.shoe_size && <span className="text-[#5B4E7A] text-xs font-medium">신발 {formData.shoe_size}mm</span>}
                                        {user?.phone && <span className="text-[#5B4E7A] text-xs font-medium">{user.phone}</span>}
                                    </div>
                                </div>
                                {formData.career_ad && (
                                    <div className="bg-[#F8F5FF] p-3 rounded-xl border border-[#E8E0FA]">
                                        <p className="text-[#9333EA] text-[10px] font-black uppercase mb-1">광고모델 경력</p>
                                        <p className="text-[#5B4E7A] text-xs leading-relaxed font-medium whitespace-pre-wrap">{formData.career_ad}</p>
                                    </div>
                                )}
                                {formData.career_other && (
                                    <div className="bg-[#F8F5FF] p-3 rounded-xl border border-[#E8E0FA]">
                                        <p className="text-[#9333EA] text-[10px] font-black uppercase mb-1">그외 경력사항</p>
                                        <p className="text-[#5B4E7A] text-xs leading-relaxed font-medium whitespace-pre-wrap">{formData.career_other}</p>
                                    </div>
                                )}
                                <a
                                    href={formData.portfolio_link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#9333EA] border border-[#9333EA] hover:opacity-90 active:scale-[0.98] transition-all"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-white">folder_open</span>
                                    <span className="text-white text-sm font-black flex-1 truncate">
                                        {formData.name || user?.name || user?.nickname}모델님 프로필 다운받기
                                    </span>
                                    <span className="material-symbols-outlined text-[14px] text-white/70">open_in_new</span>
                                </a>
                                <p className="text-[#9CA3AF] text-[10px] text-center">
                                    Powered by 아임모카 · 광고모델 스마트 캐스팅
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── 현재모습 사진저장 ── */}
                <div className="bg-white border border-[#E8E0FA] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[15px] text-emerald-600">photo_library</span>
                        </div>
                        <h2 className="font-black text-[#1F1235] text-base">현재모습 사진저장</h2>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black">최대 10장</span>
                    </div>
                    <p className="text-[#5B4E7A] text-xs leading-relaxed mb-4">
                        광고 에이전시 요청 시 공유할 현재 사진을 저장해두세요.<br />
                        운영자와 함께 사진을 관리하고 공유할 수 있습니다.
                    </p>

                    <button
                        onClick={handleCurrentPhotoClick}
                        disabled={currentPhotoUploading || currentPhotos.length >= 10}
                        className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border-2 border-dashed border-[#10B981]/40 bg-[#10B981]/5 hover:bg-[#10B981]/10 hover:border-[#10B981]/60 transition-all active:scale-[0.98] mb-4 disabled:opacity-40"
                    >
                        {currentPhotoUploading ? (
                            <>
                                <div className="w-5 h-5 rounded-full border-2 border-[#10B981] border-t-transparent animate-spin" />
                                <span className="text-[#10B981] font-black text-sm">업로드 중...</span>
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[22px] text-[#10B981]">add_a_photo</span>
                                <span className="text-[#10B981] font-black text-sm">현재모습 사진저장</span>
                                <span className="text-[#9CA3AF] text-xs font-bold">({currentPhotos.length}/10)</span>
                            </>
                        )}
                    </button>
                    <input
                        ref={currentPhotoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleCurrentPhotoChange}
                    />

                    {currentPhotoMsg && (
                        <p className={`text-xs font-black mb-3 text-center ${currentPhotoMsg.includes('실패') || currentPhotoMsg.includes('최대') ? 'text-red-500' : 'text-emerald-500'}`}>
                            {currentPhotoMsg}
                        </p>
                    )}

                    {currentPhotos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-3">
                            {currentPhotos.map((photo) => {
                                const sl = STATUS_LABEL[photo.status] || STATUS_LABEL.pending;
                                return (
                                    <div key={photo.id} className="relative">
                                        <img
                                            src={photo.photo_url}
                                            alt="현재모습"
                                            onClick={() => setSelectedPhoto(photo)}
                                            className="w-full aspect-square object-cover rounded-xl border border-[#E8E0FA] cursor-pointer active:scale-95 transition-transform"
                                        />
                                        <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${sl.bg} ${sl.color}`}>
                                            {sl.text}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteCurrentPhoto(photo)}
                                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
                                        >
                                            <span className="material-symbols-outlined text-[13px] text-red-100">close</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center py-6 text-[#9CA3AF]">
                            <span className="material-symbols-outlined text-[40px] mb-2">collections</span>
                            <p className="text-xs font-bold">아직 저장된 사진이 없어요</p>
                        </div>
                    )}
                </div>

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
                            ? 'bg-[#9333EA]/50 cursor-not-allowed'
                            : 'bg-gradient-to-r from-[#9333EA] to-[#C084FC] hover:from-[#7C3AED] hover:to-[#9333EA] shadow-[#9333EA]/30'
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
                        className="w-full py-4 rounded-2xl text-[#7C3AED] font-black text-base border border-[#E8E0FA] bg-[#F3E8FF] hover:bg-[#EDE8FF] active:scale-[0.98] transition-all"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">forward_to_inbox</span>
                            에이전시 리스트에서 프로필발송 →
                        </span>
                    </button>
                )}

            </div>
        </div>

        {/* ── 사진 크게 보기 모달 ── */}
        {selectedPhoto && (() => {
            const sl = STATUS_LABEL[selectedPhoto.status] || STATUS_LABEL.pending;
            return (
                <div
                    key="photo-modal"
                    className="fixed inset-0 z-50 bg-black/92 flex flex-col"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div className="flex items-center justify-between px-5 pt-10 pb-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${sl.bg} ${sl.color}`}>
                            {sl.text}
                        </span>
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
                        >
                            <span className="material-symbols-outlined text-[20px] text-white">close</span>
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center px-5 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <img
                            src={selectedPhoto.photo_url}
                            alt="현재모습"
                            className="max-w-full max-h-full object-contain rounded-2xl"
                        />
                    </div>

                    <div className="px-5 pb-12 pt-4 flex gap-3 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(selectedPhoto.photo_url);
                                setCurrentPhotoMsg('링크 복사됨!');
                                setTimeout(() => setCurrentPhotoMsg(''), 2000);
                                setSelectedPhoto(null);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-sm active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-[20px]">link</span>
                            링크 복사
                        </button>
                        <button
                            onClick={async () => {
                                setSelectedPhoto(null);
                                await handleDeleteCurrentPhoto(selectedPhoto);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 font-black text-sm active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                            삭제
                        </button>
                    </div>
                </div>
            );
        })()}

        {/* ── 등급 제한 안내 팝업 ── */}
        {showGradePopup && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6" onClick={() => setShowGradePopup(false)}>
                <div
                    className="w-full max-w-sm bg-white border border-amber-200 rounded-3xl p-6 text-center shadow-2xl shadow-amber-200/50 animate-fadeIn"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="w-16 h-16 bg-[#F59E0B]/15 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-[#FCD34D]">lock</span>
                    </div>
                    <h3 className="text-[#1F1235] font-black text-lg mb-2">GOLD 회원 이상 전용 기능</h3>
                    <p className="text-[#5B4E7A] text-sm leading-relaxed mb-2">
                        <span className="text-amber-600 font-bold">현재모습 사진등록</span>은<br />
                        <span className="text-amber-600 font-black">GOLD 회원</span> 이상부터 사용 가능합니다.
                    </p>
                    <p className="text-[#9CA3AF] text-xs mb-5">
                        구독 결제 또는 문의를 통해 업그레이드 해주세요.
                    </p>

                    {/* 버튼 영역 */}
                    <div className="flex flex-col gap-2.5">
                        {/* 구독결제 페이지 이동 */}
                        <button
                            onClick={() => { setShowGradePopup(false); navigate('/upgrade'); }}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FCD34D] to-[#F59E0B] text-black font-black text-sm shadow-lg shadow-[#F59E0B]/25 hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">credit_card</span>
                            구독 결제 페이지로 이동
                        </button>

                        {/* 카카오톡 문의하기 */}
                        <button
                            onClick={() => { setShowGradePopup(false); window.open('http://pf.kakao.com/_zlMUxj/chat', '_blank'); }}
                            className="w-full py-3.5 rounded-2xl bg-[#FEE500]/10 border border-[#FEE500]/20 text-[#FADA0B] font-black text-sm hover:bg-[#FEE500]/18 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[18px]">chat</span>
                            카카오톡 문의하기
                        </button>

                        {/* 닫기 */}
                        <button
                            onClick={() => setShowGradePopup(false)}
                            className="w-full py-3 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] text-[#9CA3AF] font-bold text-sm hover:bg-[#EDE8FF] transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
    );
};

export default SmartProfile;
