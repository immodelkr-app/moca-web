import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { saveClassCalendarEvent } from '../services/classService';
import { getUser, syncUserGrade } from '../services/userService';
import ClassApplyModal from './ClassApplyModal';


const ClassDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [cls, setCls] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [isApplied, setIsApplied] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);
    const [calendarSaved, setCalendarSaved] = useState(false);


    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        await syncUserGrade();
        const localUser = getUser();
        
        if (localUser) {
            let currentGrade = localUser.grade || 'SILVER';

            if (localUser.id) {
                const { data: app } = await supabase
                    .from('class_applications')
                    .select('id, approval_status')
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

                    {/* 4. Cancellation & Refund Policy (결제취소 및 환불 안내) */}
                    <div className="mb-12">
                        <h2 className="text-lg font-black text-[var(--moca-text)] flex items-center gap-2 mb-6 border-b border-[var(--moca-border)] pb-4">
                            <span className="material-symbols-outlined text-orange-500">info</span>
                            결제취소 및 환불 안내
                        </h2>
                        <div className="bg-orange-50/50 p-6 rounded-3xl border border-orange-100 space-y-4">
                            <p className="text-[14px] font-bold text-orange-700 leading-relaxed">
                                클래스 준비와 인원 확정 및 원활한 클래스 운영을 위해 아래 환불 규정이 고정 적용됩니다.
                            </p>
                            <div className="space-y-2">
                                <p className="text-[13px] font-medium text-gray-600 flex items-start gap-2">
                                    <span className="text-orange-500 font-bold mt-0.5">•</span>
                                    <span>수업 시작 <strong className="text-orange-600 underline underline-offset-4 decoration-2">3일 전부터는 취소, 일정 변경 및 환불이 불가능</strong>합니다. (인원 확정에 따른 패널티 적용)</span>
                                </p>
                                <p className="text-[13px] font-medium text-gray-600 flex items-start gap-2">
                                    <span className="text-orange-500 font-bold mt-0.5">•</span>
                                    <span>수업 일정을 충분히 확인하신 후, 참석 가능한 경우에만 신중하게 신청 및 결제해 주시기 바랍니다.</span>
                                </p>
                                <p className="text-[13px] font-medium text-gray-600 flex items-start gap-2">
                                    <span className="text-orange-500 font-bold mt-0.5">•</span>
                                    <span>본 클래스는 상기 취소 및 환불 조건을 고정으로 운영합니다.</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sticky Floating CTA */}
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
                            setShowApplyModal(true);
                        }}
                        className="flex-1 bg-indigo-600 text-white py-4 rounded-[24px] lg:rounded-[28px] font-black text-base lg:text-lg shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined font-black">edit_note</span>
                        수강 참여 신청하기
                    </button>
                )}
            </div>

            {/* Apply Modal */}
            {showApplyModal && (
                <ClassApplyModal
                    cls={cls}
                    currentUser={currentUser}
                    myPriceInfo={myPriceInfo}
                    myPrice={myPrice}
                    onClose={() => setShowApplyModal(false)}
                    onSuccess={() => setIsApplied(true)}
                />
            )}
        </div>
    );
};

export default ClassDetailPage;
