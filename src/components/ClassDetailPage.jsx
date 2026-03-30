import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { applyForClass, saveClassCalendarEvent } from '../services/classService';
import { getUser } from '../services/userService';

const TOSS_CLIENT_KEY = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq';

// 카카오뱅크 계좌 정보
const BANK_INFO = {
    bankName: '카카오뱅크',
    accountNumber: '3333-34-9903852',
    accountHolder: '아임모델 (김대희)',
};

const ClassDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [cls, setCls] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isApplying, setIsApplying] = useState(false);
    const [isApplied, setIsApplied] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [success, setSuccess] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('transfer'); // 'transfer' | 'card'
    const [isTossLoading, setIsTossLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);
    const [calendarSaved, setCalendarSaved] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        const localUser = getUser();
        
        if (localUser) {
            let currentGrade = localUser.grade || 'SILVER';

            if (localUser.id) {
                const { data: userData } = await supabase
                    .from('users')
                    .select('grade')
                    .eq('id', localUser.id)
                    .single();
                
                if (userData?.grade) {
                    currentGrade = userData.grade;
                }

                const { data: app } = await supabase
                    .from('class_applications')
                    .select('id')
                    .eq('class_id', id)
                    .eq('user_id', localUser.id)
                    .maybeSingle();
                if (app) setIsApplied(true);
            }
            setCurrentUser({ ...localUser, grade: currentGrade });
        }

        const { data: classData } = await supabase
            .from('classes')
            .select('*, class_pricing (*)')
            .eq('id', id)
            .single();
        if (classData) setCls(classData);
        setLoading(false);
    };

    // My Price Helper
    const getMyPriceInfo = () => {
        if (!cls?.class_pricing || cls.class_pricing.length === 0) return null;
        
        // If not logged in, fallback to first pricing (usually normal price)
        if (!currentUser || !currentUser.grade) {
            return cls.class_pricing[0];
        }

        const myGrade = currentUser.grade.toUpperCase();
        let searchTerms = [myGrade];

        if (myGrade === 'GUEST' || myGrade === 'MEMBER') searchTerms.push('일반', '비회원', '기본', '베이직');
        if (myGrade === 'SILVER') searchTerms.push('실버', 'SILVER');
        if (myGrade === 'GOLD') searchTerms.push('골드', 'GOLD');
        if (myGrade === 'VIP' || myGrade === 'VVIP') searchTerms.push('VIP', 'VVIP', '브이아이피', '전속모델', '전속');

        const p = cls.class_pricing.find(item => 
            searchTerms.some(term => item.grade_label.toUpperCase().includes(term))
        );
        
        return p || cls.class_pricing[0]; // Fallback to first pricing if no match
    };

    const myPriceInfo = getMyPriceInfo();
    const myPrice = myPriceInfo?.price || 0;

    // ──────────────────────────────────────────────
    // 📅 캘린더 헬퍼 함수들
    // ──────────────────────────────────────────────

    const handleSaveMocaCalendar = async () => {
        if (!currentUser || !cls) return;
        const { error } = await saveClassCalendarEvent({
            userId: currentUser.id,
            classId: cls.id,
            title: cls.title,
            classDate: cls.class_date,
            location: cls.location,
            description: cls.description,
        });
        if (!error) {
            setCalendarSaved(true);
            setTimeout(() => setCalendarSaved(false), 3000);
        } else {
            alert('캘린더 저장 중 오류가 발생했습니다.');
        }
    };

    const handleAddGoogleCalendar = () => {
        if (!cls) return;
        const title = encodeURIComponent(`[모카 클래스] ${cls.title}`);
        const details = encodeURIComponent(`장소: ${cls.location}\n${cls.description || ''}`);
        const location = encodeURIComponent(cls.location || '');
        const today = new Date();
        const d = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
        const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${d}/${d}&details=${details}&location=${location}`;
        window.open(url, '_blank');
    };

    const handleDownloadIcs = () => {
        if (!cls) return;
        const today = new Date();
        const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
        const fmt = (d) => `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
        const startStr = fmt(today);
        const endStr = fmt(tomorrow);

        const ics = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//MOCA//MOCA Class//KO',
            'BEGIN:VEVENT',
            `DTSTART;VALUE=DATE:${startStr}`,
            `DTEND;VALUE=DATE:${endStr}`,
            `SUMMARY:[모카 클래스] ${cls.title}`,
            `DESCRIPTION:장소: ${cls.location}\n${cls.description || ''}`,
            `LOCATION:${cls.location || ''}`,
            'END:VEVENT',
            'END:VCALENDAR',
        ].join('\r\n');

        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `모카클래스_${cls.title}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // 계좌이체 신청 처리
    const handleTransferApply = async () => {
        if (!currentUser) { alert('로그인이 필요합니다.'); return; }
        setIsApplying(true);
        const { error } = await applyForClass({
            classId: cls.id,
            userId: currentUser.id,
            userGrade: myPriceInfo?.grade_label || currentUser.grade,
            appliedPrice: myPrice,
            paymentType: 'transfer',
        });
        if (error) {
            alert('신청 중 오류: ' + error.message);
        } else {
            setSuccess(true);
            setIsApplied(true);
            await saveClassCalendarEvent({
                userId: currentUser.id,
                classId: cls.id,
                title: cls.title,
                classDate: cls.class_date,
                location: cls.location,
                description: cls.description,
            });
        }
        setIsApplying(false);
    };

    // 카드결제 (토스페이먼츠) 처리
    const handleCardApply = async () => {
        if (!currentUser) { alert('로그인이 필요합니다.'); return; }
        setIsTossLoading(true);

        try {
            const { data: application, error: applyError } = await applyForClass({
                classId: cls.id,
                userId: currentUser.id,
                userGrade: myPriceInfo?.grade_label || currentUser.grade,
                appliedPrice: myPrice,
                paymentType: 'card',
            });
            if (applyError) throw applyError;

            const orderId = `CLASS-${cls.id.slice(0, 8).toUpperCase()}-${Date.now()}`;

            localStorage.setItem('moca_pending_class_order', JSON.stringify({
                orderId,
                classId: cls.id,
                applicationId: application?.id,
                classTitle: cls.title,
                finalPrice: myPrice,
                userGrade: currentUser.grade,
                userName: currentUser.name || currentUser.nickname,
            }));

            const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
            const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
            const safeCustomerKey = (currentUser.nickname || 'ANONYMOUS').replace(/[^a-zA-Z0-9_-]/g, '') || 'ANONYMOUS';
            const payment = tossPayments.payment({ customerKey: safeCustomerKey });

            await payment.requestPayment({
                method: 'CARD',
                amount: { currency: 'KRW', value: myPrice },
                orderId,
                orderName: `모카 클래스 - ${cls.title}`,
                successUrl: `${window.location.origin}/payment/class-success`,
                failUrl: `${window.location.origin}/payment/fail`,
                customerName: currentUser.name || currentUser.nickname,
                customerMobilePhone: (currentUser.phone || '').replace(/-/g, ''),
            });
        } catch (err) {
            if (err?.code !== 'USER_CANCEL') {
                alert('결제 중 오류: ' + (err?.message || JSON.stringify(err)));
            }
        } finally {
            setIsTossLoading(false);
        }
    };

    const handleCopyAccount = () => {
        navigator.clipboard.writeText(`${BANK_INFO.accountNumber}`);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleShare = async () => {
        const shareData = {
            title: `🎓 모카 클래스 - ${cls.title}`,
            text: `✨ ${cls.title}\n📅 ${cls.class_date}\n📍 ${cls.location}\n\n지금 아임모카에서 신청하세요!`,
            url: window.location.href,
        };
        if (navigator.share) {
            try { await navigator.share(shareData); } catch (e) {}
        } else {
            await navigator.clipboard.writeText(window.location.href);
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 2500);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--moca-bg)]">
                <span className="material-symbols-outlined text-indigo-500 animate-spin text-4xl">progress_activity</span>
            </div>
        );
    }

    if (!cls) return <div className="text-center py-24 text-[var(--moca-text)] font-black">클래스를 찾을 수 없습니다.</div>;

    return (
        <div className="min-h-screen bg-white pb-40">
            {/* Navigation Header */}
            <div className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between pointer-events-none">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center border border-white/20 pointer-events-auto active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <button onClick={handleShare} className={`w-10 h-10 rounded-full backdrop-blur-md text-white flex items-center justify-center border pointer-events-auto active:scale-95 transition-all ${shareSuccess ? 'bg-green-500 border-green-400' : 'bg-black/40 border-white/20'}`}>
                    <span className="material-symbols-outlined text-[20px]">{shareSuccess ? 'check' : 'ios_share'}</span>
                </button>
            </div>

            {/* Hero / Poster Image */}
            <div className="w-full bg-gray-50 flex justify-center items-center">
                {cls.image_url ? (
                    <img src={cls.image_url} alt={cls.title} className="w-full max-h-[70vh] object-contain shadow-sm" />
                ) : (
                    <div className="w-full aspect-video flex flex-col items-center justify-center bg-indigo-50">
                        <span className="material-symbols-outlined text-indigo-200 text-[100px] mb-4">school</span>
                        <p className="text-indigo-300 font-black tracking-widest text-lg uppercase">MOCA CLASS</p>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="px-5 py-8 relative z-10 max-w-4xl mx-auto">
                <div className="bg-white rounded-[32px] sm:shadow-sm sm:p-8 mb-10">
                    
                    {/* 1. Header Info (Title, Tags, Date, Location) */}
                    <div className="mb-10">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-black uppercase">
                                {cls.schedule_type === 'weekly' ? '정기강좌' : '원데이 클래스'}
                            </span>
                            {isApplied && <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-black uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> 신청완료</span>}
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-black mb-4 leading-tight text-[var(--moca-text)] tracking-tight">{cls.title}</h1>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-[var(--moca-text-3)] font-bold text-sm">
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">calendar_today</span>{cls.class_date}</span>
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">location_on</span>{cls.location}</span>
                        </div>
                    </div>

                    {/* 2. Description (프로그램 상세 안내) */}
                    <div className="mb-12">
                        <h2 className="text-lg font-black text-[var(--moca-text)] flex items-center gap-2 mb-6 border-b border-[var(--moca-border)] pb-4">
                            <span className="material-symbols-outlined text-indigo-500">menu_book</span>
                            프로그램 상세 안내
                        </h2>
                        <div className="text-[var(--moca-text-2)] text-[15px] font-medium leading-[1.8] whitespace-pre-wrap px-1">
                            {cls.description || '현재 상세 교육 내용이 준비 중입니다. 궁금하신 점은 고객센터로 문의주세요.'}
                        </div>
                    </div>

                    {/* 3. Schedule & Capacity (클래스 스케줄 및 정원) */}
                    <div className="mb-12">
                        <h2 className="text-lg font-black text-[var(--moca-text)] flex items-center gap-2 mb-6 border-b border-[var(--moca-border)] pb-4">
                            <span className="material-symbols-outlined text-indigo-500">event_available</span>
                            클래스 스케줄
                        </h2>
                        <div className="bg-[var(--moca-surface-2)] p-6 rounded-3xl border border-[var(--moca-border)] space-y-6">
                            <div className="flex items-start gap-4">
                                <span className="material-symbols-outlined text-indigo-400 mt-0.5">calendar_month</span>
                                <div>
                                    <p className="text-xs font-bold text-[var(--moca-text-3)] mb-1">일시</p>
                                    <p className="text-[15px] font-black text-[var(--moca-text)]">{cls.class_date}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="material-symbols-outlined text-indigo-400 mt-0.5">location_on</span>
                                <div>
                                    <p className="text-xs font-bold text-[var(--moca-text-3)] mb-1">장소</p>
                                    <p className="text-[15px] font-black text-[var(--moca-text)]">{cls.location}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="material-symbols-outlined text-indigo-400 mt-0.5">group</span>
                                <div>
                                    <p className="text-xs font-bold text-[var(--moca-text-3)] mb-1">모집 정원</p>
                                    <p className="text-[15px] font-black text-[var(--moca-text)]">{cls.capacity}명</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="material-symbols-outlined text-indigo-400 mt-0.5">payments</span>
                                <div>
                                    <p className="text-xs font-bold text-[var(--moca-text-3)] mb-1">수강료</p>
                                    <p className="text-[15px] font-black text-[var(--moca-text)]">
                                        ₩{myPrice.toLocaleString()}
                                        {currentUser && myPriceInfo && (
                                            <span className="ml-2 text-[11px] font-bold text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded-full inline-block align-middle transform -translate-y-[1px]">
                                                {myPriceInfo.grade_label} 혜택가
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Floating CTA - Adjusted bottom to avoid mobile nav bar block */}
            <div className="fixed bottom-[65px] lg:bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[var(--moca-border)] px-6 py-4 lg:py-6 flex items-center justify-between gap-4 lg:gap-8 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] animate-slideUp">
                <div className="hidden sm:block">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{myPriceInfo?.grade_label || 'Special Price'}</p>
                    <p className="text-2xl font-black text-[var(--moca-text)] tracking-tighter">
                        <span className="text-sm font-bold mr-1">₩</span>
                        {myPrice.toLocaleString()}
                    </p>
                </div>
                {isApplied ? (
                    <button disabled className="flex-1 bg-indigo-100 text-indigo-500 border border-indigo-200 py-4 rounded-[24px] lg:rounded-[28px] font-black text-base lg:text-lg flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined font-black">task_alt</span>
                        신청 완료
                    </button>
                ) : (
                    <button 
                        onClick={() => {
                            if (!currentUser) {
                                alert('로그인 후 이용 가능합니다.');
                                navigate('/login');
                                return;
                            }
                            setShowModal(true);
                        }}
                        className="flex-1 bg-indigo-600 text-white py-4 rounded-[24px] lg:rounded-[28px] font-black text-base lg:text-lg shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        결제 및 신청하기
                        <span className="material-symbols-outlined font-black">arrow_forward</span>
                    </button>
                )}
            </div>

            {/* Application Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isApplying && !isTossLoading && setShowModal(false)} />
                    <div className="relative w-full max-w-xl bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl z-10 animate-slideUp overflow-hidden">
                        
                        {success ? (
                            <div className="p-10 text-center">
                                <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-500/20">
                                    <span className="material-symbols-outlined text-4xl font-black">done_all</span>
                                </div>
                                <h3 className="text-2xl font-black text-[var(--moca-text)] mb-2">거의 다 되었습니다!</h3>
                                <p className="text-[var(--moca-text-3)] text-sm font-bold mb-10 leading-relaxed">신청 정보가 접수되었습니다.<br/>아래 계좌로 입금해주시면 매니저가 연락드립니다.</p>

                                <div className="grid grid-cols-3 gap-3 mb-10">
                                    <button onClick={handleSaveMocaCalendar} className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all ${calendarSaved ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-[var(--moca-border)] bg-gray-50 text-[var(--moca-text-3)]'}`}>
                                        <span className="text-2xl">{calendarSaved ? '✓' : '📱'}</span>
                                        <span className="text-[10px] font-black">내 캘린더</span>
                                    </button>
                                    <button onClick={handleAddGoogleCalendar} className="flex flex-col items-center gap-2 p-4 rounded-3xl border-2 border-[var(--moca-border)] bg-gray-50 text-[var(--moca-text-3)] hover:bg-blue-50 transition-all">
                                        <span className="text-2xl">📆</span>
                                        <span className="text-[10px] font-black">Google</span>
                                    </button>
                                    <button onClick={handleDownloadIcs} className="flex flex-col items-center gap-2 p-4 rounded-3xl border-2 border-[var(--moca-border)] bg-gray-50 text-[var(--moca-text-3)] hover:bg-green-50 transition-all">
                                        <span className="text-2xl">📥</span>
                                        <span className="text-[10px] font-black">CSV/ICS</span>
                                    </button>
                                </div>

                                <div className="bg-indigo-600 rounded-[32px] p-8 text-white text-left mb-8 shadow-2xl shadow-indigo-600/20 relative overflow-hidden">
                                     <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <span className="material-symbols-outlined text-[100px]">account_balance</span>
                                     </div>
                                     <div className="relative z-10">
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Payment Info</p>
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-xl font-black mb-1">{BANK_INFO.bankName}</p>
                                                <p className="text-2xl font-black tracking-tight">{BANK_INFO.accountNumber}</p>
                                                <p className="text-white/60 text-sm font-bold mt-1">{BANK_INFO.accountHolder}</p>
                                            </div>
                                            <button onClick={handleCopyAccount} className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${copySuccess ? 'bg-white text-green-600' : 'bg-white/10 border border-white/20 text-white hover:bg-white/20'}`}>
                                                {copySuccess ? '복사됨' : '복사하기'}
                                            </button>
                                        </div>
                                        <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                                            <span className="text-sm font-bold text-white/60">최종 입금액</span>
                                            <span className="text-2xl font-black tracking-tighter">₩{myPrice.toLocaleString()}</span>
                                        </div>
                                     </div>
                                </div>

                                <button onClick={() => { setShowModal(false); setSuccess(false); }} className="w-full bg-[var(--moca-text)] text-white font-black py-5 rounded-[28px] shadow-xl hover:scale-[1.02] transition-all">확인했습니다</button>
                            </div>
                        ) : (
                            <div className="p-10">
                                <div className="flex items-center justify-between mb-10">
                                    <h3 className="text-2xl font-black text-[var(--moca-text)] tracking-tight">수강 신청 진행</h3>
                                    <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[var(--moca-text-3)] hover:bg-gray-200 transition-all"><span className="material-symbols-outlined text-[20px]">close</span></button>
                                </div>

                                <div className="space-y-6 mb-12">
                                    <div className="p-6 rounded-3xl bg-gray-50 border border-[var(--moca-border)] space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black text-[var(--moca-text-3)] uppercase">Applicant</span>
                                            <span className="text-sm font-black text-[var(--moca-text)]">{currentUser?.name || currentUser?.nickname}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-black text-[var(--moca-text-3)] uppercase">Grade</span>
                                            <span className="text-sm font-black text-indigo-500">{myPriceInfo?.grade_label || currentUser?.grade}</span>
                                        </div>
                                        <div className="pt-4 border-t border-dashed border-[var(--moca-border)] flex justify-between items-center">
                                            <span className="text-xs font-black text-[var(--moca-text-3)] uppercase">Total Amount</span>
                                            <span className="text-xl font-black text-[var(--moca-text)]">₩{myPrice.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button onClick={() => setPaymentMethod('transfer')} className={`p-6 rounded-[32px] border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'transfer' ? 'border-indigo-500 bg-indigo-50' : 'border-[var(--moca-border)] bg-white hover:border-indigo-200'}`}>
                                            <span className="material-symbols-outlined text-indigo-500 text-3xl font-black">payments</span>
                                            <span className="text-xs font-black text-[var(--moca-text-2)]">무통장 입금</span>
                                        </button>
                                        <button onClick={() => setPaymentMethod('card')} className={`p-6 rounded-[32px] border-2 flex flex-col items-center gap-2 transition-all ${paymentMethod === 'card' ? 'border-indigo-500 bg-indigo-50' : 'border-[var(--moca-border)] bg-white hover:border-indigo-200'}`}>
                                            <span className="material-symbols-outlined text-indigo-500 text-3xl font-black">credit_card</span>
                                            <span className="text-xs font-black text-[var(--moca-text-2)]">신용카드 결제</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {paymentMethod === 'transfer' ? (
                                        <button onClick={handleTransferApply} disabled={isApplying} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[28px] shadow-2xl shadow-indigo-500/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                            {isApplying ? '처리 중입니다...' : '무통장 입금으로 신청 개시'}
                                        </button>
                                    ) : (
                                        <button onClick={handleCardApply} disabled={isTossLoading} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[28px] shadow-2xl shadow-indigo-500/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
                                            {isTossLoading ? '카드 결제창 준비 중...' : `신용카드로 ₩${myPrice.toLocaleString()} 결제`}
                                        </button>
                                    )}
                                    <p className="text-[10px] text-center text-[var(--moca-text-3)] font-medium leading-relaxed opacity-60">* 신청 즉시 매니저에게 알림이 발송되며,<br/>입금 확인 후 수강 확정 안내가 전송됩니다.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassDetailPage;
