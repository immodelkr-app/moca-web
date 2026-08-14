import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getUser, updateSmartProfile } from '../services/userService';
import {
    uploadCurrentPhoto,
    fetchUserCurrentPhotos,
    deleteCurrentPhoto,
    fetchPhotoFeedbackComments,
    addPhotoFeedbackComment,
} from '../services/currentPhotosService';

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
        gender: '',          // 성별 '남' | '여'
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
    const [isMobileApp, setIsMobileApp] = useState(false);
    const [isWebViewEnv, setIsWebViewEnv] = useState(false);

    // 현재모습 사진 관련
    const currentPhotoInputRef = useRef(null);
    const [currentPhotos, setCurrentPhotos] = useState([]);
    const [currentPhotoUploading, setCurrentPhotoUploading] = useState(false);
    const [currentPhotoMsg, setCurrentPhotoMsg] = useState('');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showGradePopup, setShowGradePopup] = useState(false);

    // 피드백 말풍선 (GOLD 회원용)
    const [feedbackPopupPhoto, setFeedbackPopupPhoto] = useState(null);

    // 1:1 피드백 채팅 (IMODEL/VIP용)
    const [chatPhoto, setChatPhoto] = useState(null);
    const [chatComments, setChatComments] = useState([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatSending, setChatSending] = useState(false);
    const chatBottomRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        setFormData({
            name: user.name || '',
            gender: user.gender || '',
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

        // 모바일 앱(Capacitor/WebView) 환경 감지
        const isCapacitor = window.Capacitor?.platform !== 'web' || 
                            /Capacitor/i.test(navigator.userAgent) || 
                            window.webkit?.messageHandlers?.bridge;
        const isWebView = isCapacitor || /Android.*wv/.test(navigator.userAgent) || (/iPhone|iPod|iPad/i.test(navigator.userAgent) && !/Safari/i.test(navigator.userAgent));
        setIsMobileApp(isCapacitor);
        setIsWebViewEnv(isWebView);
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

    const loadScript = (id, src, onReadyCheck) => {
        if (document.getElementById(id)) {
            // 스크립트 태그는 이미 있음 → 로드 완료 여부를 폴링으로 확인
            if (onReadyCheck()) return; // 이미 준비됨
            const interval = setInterval(() => {
                if (onReadyCheck()) clearInterval(interval);
            }, 200);
            setTimeout(() => clearInterval(interval), 10000);
        } else {
            const script = document.createElement('script');
            script.id = id;
            script.src = src;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                // 로드 직후 즉시 체크, 아직 준비 안됐으면 짧게 폴링
                if (onReadyCheck()) return;
                const interval = setInterval(() => {
                    if (onReadyCheck()) clearInterval(interval);
                }, 200);
                setTimeout(() => clearInterval(interval), 5000);
            };
            script.onerror = () => {
                console.warn(`[SmartProfile] 스크립트 로드 실패: ${src}`);
            };
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
            setErrorMsg('Google 연동 서비스에 응답이 없습니다. 잠시 후 새로고침하여 다시 시도해주세요.');
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
        const isWebView = isMobileApp || /Android.*wv/.test(navigator.userAgent) || (/iPhone|iPod|iPad/i.test(navigator.userAgent) && !/Safari/i.test(navigator.userAgent));
        if (isWebView) {
            setErrorMsg('구글드라이브 원클릭이 안될시, 구글드라이브앱에서 링크를 직접 복사하여 하단 빈칸에 붙여넣어주세요.');
            return;
        }

        setPickerLoading(true);
        setErrorMsg('');

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
                } else if (attempts >= 50) {
                    clearInterval(retry);
                    setPickerLoading(false);
                    setErrorMsg('Google 스크립트 로드 지연 또는 브라우저 차단으로 인해 연동에 실패했습니다. 번거로우시겠지만 하단의 링크 직접 입력을 이용해주세요.');
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

    // 등급 체크: 아임모델 이상만 현재모습 사진 신규 업로드 가능 (운영자 수작업 검수 부담으로 GOLD 제외)
    const ALLOWED_GRADES = ['IMODEL', 'VIP'];
    const CHAT_GRADES = ['IMODEL', 'VIP'];   // 아임모델/전속모델 - 1:1 채팅 피드백
    const isPhotoAllowed = ALLOWED_GRADES.includes(user?.grade);
    const isChatAllowed = CHAT_GRADES.includes(user?.grade);

    const handleCurrentPhotoClick = () => {
        if (!isPhotoAllowed) {
            setShowGradePopup(true);
            return;
        }
        currentPhotoInputRef.current?.click();
    };

    // GOLD: 피드백 말풍선 열기
    const handlePhotoCardClick = (photo) => {
        if (isChatAllowed) {
            // 아임모델/전속모델: 1:1 채팅 열기
            openChatModal(photo);
        } else if (isPhotoAllowed && photo.admin_comment) {
            // GOLD: 피드백 말풍선
            setFeedbackPopupPhoto(photo);
        } else {
            setSelectedPhoto(photo);
        }
    };

    // 1:1 채팅 모달 열기 (IMODEL/VIP)
    const openChatModal = async (photo) => {
        setChatPhoto(photo);
        setChatLoading(true);
        const comments = await fetchPhotoFeedbackComments(photo.id);
        setChatComments(comments);
        setChatLoading(false);
        setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    // 1:1 채팅 댓글 전송
    const handleSendChatComment = async () => {
        if (!chatInput.trim() || chatSending) return;
        setChatSending(true);
        const { success, data } = await addPhotoFeedbackComment(
            chatPhoto.id,
            'model',
            user?.id || null,
            user?.name || user?.nickname || '모델',
            chatInput.trim()
        );
        if (success && data) {
            setChatComments(prev => [...prev, data]);
            setChatInput('');
            setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
        setChatSending(false);
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
            const { url, error, data } = await uploadCurrentPhoto(file, user);
            if (url && data) {
                setCurrentPhotos(prev => [{
                    id: data.id,
                    photo_url: url,
                    storage_path: data.storage_path,
                    status: 'pending',
                    created_at: data.created_at || new Date().toISOString(),
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

    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const handleDownload = async (url, filename) => {
        const safeFilename = filename || `current_photo_${Date.now()}.jpg`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`이미지를 불러오지 못했습니다. (${response.status})`);
            const blob = await response.blob();

            if (Capacitor.isNativePlatform()) {
                // 앱(WebView) 내부에서는 <a download>가 동작하지 않으므로
                // 파일을 캐시에 쓴 뒤 네이티브 공유 시트로 저장하도록 유도
                const base64Data = await blobToBase64(blob);
                const savedFile = await Filesystem.writeFile({
                    path: safeFilename,
                    data: base64Data,
                    directory: Directory.Cache,
                });
                await Share.share({
                    title: '사진 저장',
                    url: savedFile.uri,
                    dialogTitle: '사진을 저장할 위치를 선택하세요',
                });
            } else {
                const blobUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = safeFilename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(blobUrl);
            }
        } catch (error) {
            console.error('Download failed:', error);
            alert('다운로드에 실패했습니다. 잠시 후 다시 시도해주세요.');
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
        return url && (
            url.includes('drive.google.com') ||
            url.includes('docs.google.com') ||
            url.includes('mybox.naver.com')
        );
    };

    const hasProfile = formData.portfolio_link && isValidUrl(formData.portfolio_link);

    const handleSave = async () => {
        if (formData.portfolio_link && !isValidUrl(formData.portfolio_link)) {
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
            <div className="relative z-10 px-5 pt-14 pb-4 flex items-center gap-3">
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

                    {/* 이름 및 성별 필드 */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="space-y-1.5">
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
                        <div className="space-y-1.5">
                            <label className="text-[#5B4E7A] text-[11px] font-bold ml-1">성별 <span className="text-[#9333EA] font-black">*</span></label>
                            <div className="flex gap-2 h-[46px]">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, gender: '남' }));
                                        setErrorMsg('');
                                    }}
                                    className={`flex-1 rounded-xl border-2 font-bold text-sm transition-all ${
                                        formData.gender === '남'
                                            ? 'bg-[#9333EA] border-[#9333EA] text-white shadow-moca'
                                            : 'bg-[#F8F5FF] border-[#E8E0FA] text-[#5B4E7A] hover:bg-[#F3E8FF]'
                                    }`}
                                >
                                    남자
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, gender: '여' }));
                                        setErrorMsg('');
                                    }}
                                    className={`flex-1 rounded-xl border-2 font-bold text-sm transition-all ${
                                        formData.gender === '여'
                                            ? 'bg-[#9333EA] border-[#9333EA] text-white shadow-moca'
                                            : 'bg-[#F8F5FF] border-[#E8E0FA] text-[#5B4E7A] hover:bg-[#F3E8FF]'
                                    }`}
                                >
                                    여자
                                </button>
                            </div>
                        </div>
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
                            <span className="material-symbols-outlined text-[15px] text-[#4285F4]">folder_shared</span>
                        </div>
                        <h2 className="font-black text-[#1F1235] text-base">프로필 링크</h2>
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-black">선택</span>
                    </div>
                    <p className="text-[#5B4E7A] text-xs leading-relaxed mb-4">
                        네이버 마이박스 또는 구글 드라이브의 공유 링크를<br/>아래에 직접 붙여넣어 주세요.
                    </p>


                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[#5B4E7A] text-[11px] font-black ml-1">네이버 마이박스 또는 구글 드라이브 공유 링크 입력</label>
                            {formData.portfolio_link && (
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, portfolio_link: '' }))}
                                    className="text-xs text-red-500 hover:text-red-600 font-bold flex items-center gap-0.5"
                                >
                                    <span className="material-symbols-outlined text-[14px]">delete_forever</span>
                                    입력 초기화
                                </button>
                            )}
                        </div>
                        <input
                            type="url"
                            name="portfolio_link"
                            value={formData.portfolio_link}
                            onChange={handleChange}
                            placeholder="https://mybox.naver.com/... 또는 https://drive.google.com/..."
                            className={`w-full bg-[#F8F5FF] border rounded-xl px-4 py-3.5 text-[#1F1235] text-sm placeholder-[#9CA3AF] focus:outline-none focus:ring-2 transition-colors shadow-inner ${
                                !formData.portfolio_link
                                    ? 'border-[#E8E0FA] focus:border-[#4285F4] focus:ring-[#4285F4]/10'
                                    : !isValidUrl(formData.portfolio_link)
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                                        : isDriveUrl(formData.portfolio_link)
                                            ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/10'
                                            : 'border-amber-300 focus:border-amber-500 focus:ring-amber-500/10'
                            }`}
                        />

                        {formData.portfolio_link && (
                            <div className="mt-2.5 px-1">
                                {!isValidUrl(formData.portfolio_link) ? (
                                    <div className="flex items-start gap-1.5 text-xs text-red-500 font-bold leading-normal">
                                        <span className="material-symbols-outlined text-[16px] mt-0.5 flex-shrink-0">error</span>
                                        <span>올바른 인터넷 주소(URL) 형식을 입력해주세요. (예: https://...)</span>
                                    </div>
                                ) : isDriveUrl(formData.portfolio_link) ? (
                                    <div className="flex items-start gap-1.5 text-xs text-emerald-600 font-black leading-normal">
                                        <span className="material-symbols-outlined text-[16px] mt-0.5 flex-shrink-0">check_circle</span>
                                        <span>올바른 공유 링크 형식입니다.</span>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-1.5 text-xs text-amber-600 font-bold leading-normal">
                                        <span className="material-symbols-outlined text-[16px] mt-0.5 flex-shrink-0">warning</span>
                                        <span>네이버 마이박스 또는 구글 드라이브 공유 링크를 입력해주세요.</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-3 bg-blue-50/50 rounded-xl p-3 border border-blue-100">
                            <p className="text-[10px] text-blue-600/80 leading-relaxed">
                                <span className="font-black">💡 공유 링크 설정 방법:</span><br/>
                                <strong>네이버 마이박스</strong>: 파일 선택 → 공유 → '링크 공유'로 설정 후 링크 복사<br/>
                                <strong>구글 드라이브</strong>: 파일 선택 → 공유 → '링크가 있는 모든 사용자(뷰어)'로 설정 후 링크 복사
                            </p>
                        </div>
                    </div>
                </div>


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
                                const hasFeedback = !!photo.admin_comment;
                                const isNeedsMore = photo.status === 'needs_more';
                                return (
                                    <div key={photo.id} className="relative">
                                        <img
                                            src={photo.photo_url}
                                            alt="현재모습"
                                            onClick={() => handlePhotoCardClick(photo)}
                                            className={`w-full aspect-square object-cover rounded-xl border cursor-pointer active:scale-95 transition-transform ${
                                                isNeedsMore ? 'border-red-400 ring-2 ring-red-400/40' : 'border-[#E8E0FA]'
                                            }`}
                                        />
                                        {/* 상태 뱃지: 승인된 사진만 표시 */}
                                        {photo.status === 'approved' && (
                                            <span className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black ${sl.bg} ${sl.color}`}>
                                                {sl.text}
                                            </span>
                                        )}
                                        {/* GOLD: 피드백 말풍선 아이콘 */}
                                        {!isChatAllowed && hasFeedback && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setFeedbackPopupPhoto(photo); }}
                                                className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-amber-400/90 flex items-center justify-center shadow-md animate-bounce"
                                                title="어드민 피드백 보기"
                                            >
                                                <span className="material-symbols-outlined text-[12px] text-white">chat</span>
                                            </button>
                                        )}
                                        {/* IMODEL/VIP: 1:1 채팅 아이콘 */}
                                        {isChatAllowed && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); openChatModal(photo); }}
                                                className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-purple-500/90 flex items-center justify-center shadow-md"
                                                title="1:1 피드백 대화"
                                            >
                                                <span className="material-symbols-outlined text-[12px] text-white">forum</span>
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteCurrentPhoto(photo)}
                                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-600 border border-white/20 flex items-center justify-center active:scale-90 transition-transform"
                                        >
                                            <span className="material-symbols-outlined text-[11px] text-white">delete</span>
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

                {/* Notice / Error */}
                {errorMsg && (
                    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-amber-50 border border-amber-200">
                        <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-[18px] text-amber-500 flex-shrink-0 mt-0.5">error</span>
                            <p className="text-amber-700 text-xs font-black leading-relaxed whitespace-pre-wrap">{errorMsg}</p>
                        </div>
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
                        className="w-full py-5 rounded-2xl text-white font-black text-lg bg-gradient-to-r from-[#7C3AED] to-[#9333EA] shadow-xl shadow-[#7C3AED]/30 hover:opacity-95 active:scale-[0.98] transition-all"
                    >
                        <span className="flex items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-[24px]">forward_to_inbox</span>
                            에이전시 프로필발송 →
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
                    className="fixed inset-0 z-[1000] bg-black/92 flex flex-col"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <div className="flex items-center justify-between px-5 pt-10 pb-4 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {selectedPhoto.status === 'approved' ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-black border ${sl.bg} ${sl.color}`}>
                                {sl.text}
                            </span>
                        ) : <span />}
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

                    <div
                        className="px-5 pt-4 flex gap-3 flex-shrink-0"
                        style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => handleDownload(selectedPhoto.photo_url, `current_photo_${selectedPhoto.id}.jpg`)}
                            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 font-black text-sm active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-[20px]">download</span>
                            다운로드
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

        {/* ── 등급 제한 안내 팝업 (실버 → GOLD 유도) ── */}
        {showGradePopup && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-6" onClick={() => setShowGradePopup(false)}>
                <div
                    className="w-full max-w-sm bg-white border border-amber-200 rounded-3xl p-6 text-center shadow-2xl shadow-amber-200/50 animate-fadeIn"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="w-16 h-16 bg-[#F59E0B]/15 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-[#FCD34D]">lock</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 mb-3">
                        <span className="text-amber-600 text-[11px] font-black">🥈 현재 SILVER 등급</span>
                    </div>
                    <h3 className="text-[#1F1235] font-black text-lg mb-2">아임모델 등급 전용 기능</h3>
                    <p className="text-[#5B4E7A] text-sm leading-relaxed mb-1">
                        <span className="text-amber-600 font-bold">현재모습 사진등록</span>은
                    </p>
                    <p className="text-[#5B4E7A] text-sm leading-relaxed mb-1">
                        <span className="text-amber-600 font-black">🌟 아임모델 등급 이상</span>부터 사용 가능합니다.
                    </p>
                    <div className="bg-amber-50/80 rounded-2xl p-3 mb-4 mt-2 text-left">
                        <p className="text-[#9CA3AF] text-[11px] leading-relaxed">
                            ✅ 운영자가 사진 한 장 한 장을 직접 검수하고<br/>
                            ✅ 1:1 피드백 대화로 꼼꼼히 챙겨드립니다
                        </p>
                    </div>

                    {/* 버튼 영역 */}
                    <div className="flex flex-col gap-2.5">
                        <button
                            onClick={() => { setShowGradePopup(false); window.open('http://pf.kakao.com/_zlMUxj/chat', '_blank'); }}
                            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#FCD34D] to-[#F59E0B] text-black font-black text-sm shadow-lg shadow-[#F59E0B]/25 hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                            아임모델 등급 문의하기
                        </button>
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

        {/* ── GOLD 피드백 말풍선 모달 ── */}
        {feedbackPopupPhoto && (
            <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setFeedbackPopupPhoto(null)}>
                <div
                    className="w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl animate-slideUp"
                    onClick={e => e.stopPropagation()}
                >
                    {/* 사진 미리보기 */}
                    <div className="flex items-start gap-4 mb-4">
                        <img
                            src={feedbackPopupPhoto.photo_url}
                            alt="현재모습"
                            className="w-20 h-20 object-cover rounded-2xl border border-[#E8E0FA] flex-shrink-0"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[15px] text-amber-600">support_agent</span>
                                </div>
                                <span className="text-[#1F1235] font-black text-sm">운영자 피드백</span>
                                <span className="text-[#9CA3AF] text-[10px]">
                                    {feedbackPopupPhoto.feedback_at
                                        ? new Date(feedbackPopupPhoto.feedback_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                                        : ''}
                                </span>
                            </div>
                            {/* 말풍선 */}
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl rounded-tl-sm p-3 relative">
                                <p className="text-[#5B4E7A] text-sm leading-relaxed">{feedbackPopupPhoto.admin_comment}</p>
                            </div>
                        </div>
                    </div>

                    {feedbackPopupPhoto.status === 'needs_more' && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-red-500">info</span>
                            <p className="text-red-600 text-xs font-black">위 피드백을 확인하고 사진을 다시 올려주세요!</p>
                        </div>
                    )}

                    <button
                        onClick={() => setFeedbackPopupPhoto(null)}
                        className="w-full py-3.5 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA] text-[#5B4E7A] font-black text-sm hover:bg-[#EDE8FF] transition-colors"
                    >
                        확인
                    </button>
                </div>
            </div>
        )}

        {/* ── IMODEL/VIP 1:1 피드백 채팅 모달 ── */}
        {chatPhoto && (
            <div className="fixed inset-0 z-[200] flex flex-col bg-[#F8F5FF]">
                {/* 헤더 */}
                <div className="flex items-center gap-3 px-4 pt-12 pb-3 bg-white border-b border-[#E8E0FA] flex-shrink-0">
                    <button
                        onClick={() => { setChatPhoto(null); setChatComments([]); setChatInput(''); }}
                        className="w-9 h-9 rounded-xl bg-[#F3E8FF] flex items-center justify-center"
                    >
                        <span className="material-symbols-outlined text-[20px] text-[#7C3AED]">arrow_back</span>
                    </button>
                    <img
                        src={chatPhoto.photo_url}
                        alt="사진"
                        className="w-10 h-10 object-cover rounded-xl border border-[#E8E0FA]"
                    />
                    <div className="flex-1">
                        <p className="font-black text-[#1F1235] text-sm">사진 피드백 대화</p>
                        <p className="text-[#9CA3AF] text-[11px]">운영자와 1:1로 소통하세요</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        chatPhoto.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                        chatPhoto.status === 'needs_more' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-600'
                    }`}>
                        {chatPhoto.status === 'approved' ? '승인' : chatPhoto.status === 'needs_more' ? '추가요청' : '검토중'}
                    </span>
                </div>

                {/* 어드민 단방향 피드백 (있는 경우) */}
                {chatPhoto.admin_comment && (
                    <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex-shrink-0">
                        <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-[15px] text-amber-600 mt-0.5">support_agent</span>
                            <div>
                                <p className="text-[10px] text-amber-600 font-black mb-0.5">운영자 피드백</p>
                                <p className="text-amber-800 text-xs leading-relaxed">{chatPhoto.admin_comment}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 채팅 메시지 영역 */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                    {chatLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 rounded-full border-2 border-[#9333EA] border-t-transparent animate-spin" />
                        </div>
                    ) : chatComments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-[#9CA3AF]">
                            <span className="material-symbols-outlined text-[40px] mb-2">forum</span>
                            <p className="text-xs font-bold text-center">아직 대화가 없습니다.<br/>운영자의 피드백을 기다려 주세요.</p>
                        </div>
                    ) : (
                        chatComments.map((c) => {
                            const isAdmin = c.sender_type === 'admin';
                            return (
                                <div key={c.id} className={`flex items-end gap-2 ${isAdmin ? '' : 'flex-row-reverse'}`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                        isAdmin ? 'bg-amber-100' : 'bg-[#9333EA]/20'
                                    }`}>
                                        <span className={`material-symbols-outlined text-[16px] ${
                                            isAdmin ? 'text-amber-600' : 'text-[#9333EA]'
                                        }`}>
                                            {isAdmin ? 'support_agent' : 'person'}
                                        </span>
                                    </div>
                                    <div className={`max-w-[72%] ${ isAdmin ? '' : 'items-end flex flex-col' }`}>
                                        <p className={`text-[10px] font-black mb-0.5 ${
                                            isAdmin ? 'text-amber-600' : 'text-[#9333EA] text-right'
                                        }`}>
                                            {isAdmin ? '아임모델 김대표' : (user?.nickname || user?.name || c.sender_name || '나')}
                                        </p>
                                        <div className={`px-3 py-2.5 rounded-2xl ${
                                            isAdmin
                                                ? 'bg-white border border-[#E8E0FA] rounded-tl-sm'
                                                : 'bg-[#9333EA] rounded-tr-sm'
                                        }`}>
                                            <p className={`text-sm leading-relaxed ${
                                                isAdmin ? 'text-[#1F1235]' : 'text-white'
                                            }`}>{c.content}</p>
                                        </div>
                                        <p className="text-[9px] text-[#9CA3AF] mt-0.5">
                                            {new Date(c.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatBottomRef} />
                </div>

                {/* 입력창 */}
                <div className="flex-shrink-0 px-4 py-3 pb-6 bg-white border-t border-[#E8E0FA]">
                    <div className="flex gap-2 items-end">
                        <textarea
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChatComment(); } }}
                            placeholder="운영자에게 메시지를 보내세요..."
                            rows={1}
                            className="flex-1 bg-[#F8F5FF] border border-[#E8E0FA] rounded-2xl px-4 py-3 text-[#1F1235] text-sm placeholder-[#9CA3AF] focus:outline-none focus:border-[#9333EA] resize-none"
                        />
                        <button
                            onClick={handleSendChatComment}
                            disabled={!chatInput.trim() || chatSending}
                            className="w-11 h-11 rounded-2xl bg-[#9333EA] flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all flex-shrink-0"
                        >
                            {chatSending
                                ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                : <span className="material-symbols-outlined text-[20px] text-white">send</span>
                            }
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
    );
};

export default SmartProfile;
