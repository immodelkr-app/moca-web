import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { saveClassCalendarEvent, fetchPublicFeedback, fetchUserFeedback } from '../services/classService';
import { getUser, syncUserGrade } from '../services/userService';
import ClassApplyModal from './ClassApplyModal';
import ClassFeedbackModal from './ClassFeedbackModal';


const ClassDetailPage = () => {
    const { id } = useParams();
    const cleanId = id ? id.split(/[?%]/)[0] : '';
    const navigate = useNavigate();
    const [cls, setCls] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showApplyModal, setShowApplyModal] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [isApplied, setIsApplied] = useState(false);
    const [shareSuccess, setShareSuccess] = useState(false);
    const [calendarSaved, setCalendarSaved] = useState(false);

    // 피드백 관련
    const [feedbacks, setFeedbacks] = useState([]);
    const [myFeedback, setMyFeedback] = useState(null);
    const [feedbackLoading, setFeedbackLoading] = useState(false);

    const hasWriteReviewParam = () => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('write_review') === 'true') return true;
        // Fallback: check if the raw id contains write_review=true
        if (id && (id.includes('write_review=true') || id.includes('write_review%3Dtrue'))) {
            return true;
        }
        return false;
    };

    useEffect(() => {
        loadData();
    }, [cleanId]);

    const loadData = async () => {
        try {
            setLoading(true);
            await syncUserGrade();
            const localUser = getUser();
            
            let hasApplied = false;
            if (localUser) {
                let currentGrade = localUser.grade || 'SILVER';

                if (localUser.id) {
                    const { data: app } = await supabase
                        .from('class_applications')
                        .select('id, approval_status')
                        .eq('class_id', cleanId)
                        .eq('user_id', localUser.id)
                        .maybeSingle();
                    if (app) {
                        setIsApplied(true);
                        hasApplied = true;
                    }
                }
                setCurrentUser({ ...localUser, grade: currentGrade });
            }

            const { data: classData } = await supabase
                .from('classes')
                .select('*, class_pricing (*)')
                .eq('id', cleanId)
                .single();
            if (classData) setCls(classData);

            // 피드백 로드
            if (classData?.status === 'completed') {
                setFeedbackLoading(true);
                const { data: fbData } = await fetchPublicFeedback(cleanId);
                setFeedbacks(fbData || []);

                const localU = getUser();
                if (localU?.id) {
                    const { data: myFb } = await fetchUserFeedback(cleanId, localU.id);
                    setMyFeedback(myFb || null);
                }
                setFeedbackLoading(false);
            }

            // [신규] 후기 남기기 자동 팝업 처리 (?write_review=true)
            if (hasWriteReviewParam()) {
                if (localUser) {
                    if (classData?.status === 'completed') {
                        if (hasApplied) {
                            setShowFeedbackModal(true);
                        } else {
                            alert('수강 완료된 회원만 후기를 작성할 수 있습니다.');
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error loading class details:", error);
        } finally {
            setLoading(false);
        }
    };

    // My Price Helper
    const getMyPriceInfo = () => {
        if (!cls?.class_pricing || cls.class_pricing.length === 0) return null;
        
        if (!currentUser || !currentUser.grade) {
            return cls.class_pricing[0];
        }

        const myGrade = currentUser.grade.toUpperCase();
        let searchTerms = [myGrade];

        if (myGrade === 'GUEST' || myGrade === 'MEMBER') searchTerms.push('일반', '비회원', '기본', '베이직');
        if (myGrade === 'SILVER') searchTerms.push('실버', 'SILVER');
        if (myGrade === 'GOLD') searchTerms.push('골드', 'GOLD');
        if (myGrade === 'IMODEL' || myGrade === 'VIP') searchTerms.push('VIP', 'IMODEL', '아임모델', '전속모델', '전속');

        const p = cls.class_pricing.find(item => 
            searchTerms.some(term => item.grade_label.toUpperCase().includes(term))
        );
        
        return p || cls.class_pricing[0];
    };

    const myPriceInfo = getMyPriceInfo();
    const myPrice = myPriceInfo ? myPriceInfo.price : (Number(cls?.price_info) || 0);

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

    // 피드백 작성 완료 후 처리
    const handleFeedbackSuccess = async () => {
        const { data: fbData } = await fetchPublicFeedback(cleanId);
        setFeedbacks(fbData || []);
        if (currentUser?.id) {
            const { data: myFb } = await fetchUserFeedback(cleanId, currentUser.id);
            setMyFeedback(myFb || null);
        }
    };

    const isCompleted = cls?.status === 'completed';
    const avgRating = feedbacks.length > 0
        ? (feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)
        : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[var(--moca-bg)]">
                <span className="material-symbols-outlined text-indigo-500 animate-spin text-4xl">progress_activity</span>
            </div>
        );
    }

    if (!cls) return <div className="text-center py-24 text-[var(--moca-text)] font-black">클래스를 찾을 수 없습니다.</div>;

    return (
        <div className="min-h-screen bg-white pb-48">
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
            <div className="w-full bg-gray-50 flex justify-center items-center relative">
                {cls.image_url ? (
                    <img src={cls.image_url} alt={cls.title} className="w-full max-h-[70vh] object-contain shadow-sm" />
                ) : (
                    <div className="w-full aspect-video flex flex-col items-center justify-center bg-indigo-50">
                        <span className="material-symbols-outlined text-indigo-200 text-[100px] mb-4">school</span>
                        <p className="text-indigo-300 font-black tracking-widest text-lg uppercase">MOCA CLASS</p>
                    </div>
                )}
                {/* 완료 배지 */}
                {isCompleted && (
                    <div className="absolute bottom-4 left-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/90 text-white rounded-full text-sm font-black backdrop-blur-md border border-white/20 shadow-lg">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            종료된 클래스
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="px-5 py-8 relative z-10 max-w-4xl mx-auto">
                <div className="bg-white rounded-[32px] sm:shadow-sm sm:p-8 mb-10">
                    
                    {/* 1. Header Info */}
                    <div className="mb-10">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-black uppercase">
                                {cls.schedule_type === 'weekly' ? '정기강좌' : '원데이 클래스'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-[11px] font-black ${
                                cls.target_grade === 'EXCLUSIVE' ? 'bg-indigo-900 text-yellow-300' :
                                cls.target_grade === 'GOLD' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                            }`}>
                                {cls.target_grade === 'EXCLUSIVE' ? '신청가능 등급: 전속모델' :
                                 cls.target_grade === 'GOLD' ? '신청가능 등급: 골드멤버' : '신청가능 등급: 전체등급'}
                            </span>
                            {isApplied && <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-[11px] font-black uppercase flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span> 신청완료</span>}
                            {isCompleted && <span className="px-3 py-1 rounded-full bg-green-500 text-white text-[11px] font-black flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">task_alt</span> 완료</span>}
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-black mb-4 leading-tight text-[var(--moca-text)] tracking-tight">{cls.title}</h1>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-[var(--moca-text-3)] font-bold text-sm">
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">calendar_today</span>{cls.class_date?.replace(/:\d{2}$/, '')}</span>
                            <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">location_on</span>{cls.location}</span>
                            {avgRating && (
                                <span className="flex items-center gap-1.5 text-amber-500 font-black">
                                    <span className="text-[18px]">★</span>{avgRating} ({feedbacks.length}개 후기)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 2. Description */}
                    <div className="mb-12">
                        <h2 className="text-lg font-black text-[var(--moca-text)] flex items-center gap-2 mb-6 border-b border-[var(--moca-border)] pb-4">
                            <span className="material-symbols-outlined text-indigo-500">menu_book</span>
                            프로그램 상세 안내
                        </h2>
                        <div className="text-[var(--moca-text-2)] text-[15px] font-medium leading-[1.8] whitespace-pre-wrap px-1">
                            {cls.description || '현재 상세 교육 내용이 준비 중입니다. 궁금하신 점은 고객센터로 문의주세요.'}
                        </div>
                    </div>

                    {/* 3. Schedule & Capacity */}
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
                                    <p className="text-[15px] font-black text-[var(--moca-text)]">{cls.class_date?.replace(/:\d{2}$/, '')}</p>
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
                                    <p className="text-xs font-bold text-[var(--moca-text-3)] mb-1">참가비</p>
                                    <p className="text-[15px] font-black text-[var(--moca-text)]">{cls.price_info || '무료'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="material-symbols-outlined text-indigo-400 mt-0.5">how_to_reg</span>
                                <div>
                                    <p className="text-xs font-bold text-[var(--moca-text-3)] mb-1">참가 신청</p>
                                    <p className="text-[15px] font-black text-[var(--moca-text)]">
                                        등급별 혜택 적용 대상
                                        {currentUser && myPriceInfo && (
                                            <span className="ml-2 text-[11px] font-bold text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded-full inline-block align-middle transform -translate-y-[1px]">
                                                {myPriceInfo.grade_label} 회원
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. 수강 후기 섹션 (완료된 클래스만) */}
                    {isCompleted && (
                        <div className="mb-6">
                            <h2 className="text-lg font-black text-[var(--moca-text)] flex items-center gap-2 mb-6 border-b border-[var(--moca-border)] pb-4">
                                <span className="material-symbols-outlined text-amber-400">star</span>
                                수강 후기
                                {avgRating && (
                                    <span className="ml-2 text-base font-black text-amber-500">{avgRating} ★</span>
                                )}
                                <span className="ml-1 text-sm font-bold text-slate-400">({feedbacks.length}개)</span>
                            </h2>

                            {feedbackLoading ? (
                                <div className="py-8 text-center text-slate-400 font-bold">후기를 불러오는 중...</div>
                            ) : feedbacks.length === 0 ? (
                                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-slate-100">
                                    <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">rate_review</span>
                                    <p className="text-slate-400 font-bold text-sm">아직 후기가 없습니다</p>
                                    <p className="text-slate-300 text-xs mt-1">수강 후기를 첫 번째로 남겨보세요!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {feedbacks.map(fb => {
                                        const name = fb.users?.name || fb.users?.nickname || '회원';
                                        const maskedName = name.length > 1 ? name[0] + '*'.repeat(name.length - 1) : name;
                                        return (
                                            <div key={fb.id} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm">{name[0]}</div>
                                                        <span className="text-sm font-black text-slate-700">{maskedName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        {[1,2,3,4,5].map(s => (
                                                            <span key={s} className={`text-[16px] ${s <= fb.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                {fb.comment && <p className="text-sm text-slate-600 font-medium leading-relaxed mb-3">{fb.comment}</p>}
                                                {fb.image_url && <img src={fb.image_url} alt="" className="w-full max-h-48 object-cover rounded-xl mb-3" />}
                                                {fb.admin_reply && (
                                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mt-3">
                                                        <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">아임모카 답변</p>
                                                        <p className="text-sm text-indigo-700 font-medium">{fb.admin_reply}</p>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-slate-400 font-bold mt-3">{new Date(fb.created_at).toLocaleDateString('ko-KR')}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Sticky Floating CTA */}
            <div className="fixed custom-cta-bottom left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[var(--moca-border)] px-6 py-4 lg:py-6 flex items-center justify-between gap-4 lg:gap-8 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] animate-slideUp">
                <div className="hidden sm:block">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{myPriceInfo?.grade_label || 'Special Benefit'}</p>
                    <p className="text-2xl font-black text-[var(--moca-text)] tracking-tighter">
                        {isCompleted ? '수강 후기' : '참여 신청하기'}
                    </p>
                </div>

                {/* 진행 중 클래스 CTA */}
                {!isCompleted && (
                    isApplied ? (
                        <button disabled className="flex-1 bg-indigo-100 text-indigo-500 border border-indigo-200 py-4 rounded-[24px] lg:rounded-[28px] font-black text-base lg:text-lg flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined font-black">task_alt</span>
                            신청 완료
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                if (!currentUser) { alert('로그인 후 이용 가능합니다.'); navigate('/login'); return; }
                                if (cls.target_grade && cls.target_grade !== 'ALL') {
                                    const myGrade = (currentUser.grade || '').toUpperCase();
                                    const isExclusive = ['VIP', 'IMODEL', '전속모델', '아임모델', 'EXCLUSIVE'].some(g => myGrade.includes(g));
                                    const isGold = isExclusive || ['GOLD', '골드'].some(g => myGrade.includes(g));
                                    if (cls.target_grade === 'EXCLUSIVE' && !isExclusive) { alert('전속모델 등급만 신청 가능한 클래스입니다.'); return; }
                                    if (cls.target_grade === 'GOLD' && !isGold) { alert('골드회원 이상만 신청 가능한 클래스입니다.'); return; }
                                }
                                setShowApplyModal(true);
                            }}
                            className="flex-1 bg-indigo-600 text-white py-4 rounded-[24px] lg:rounded-[28px] font-black text-base lg:text-lg shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined font-black">edit_note</span>
                            수강 참여 신청하기
                        </button>
                    )
                )}

                {/* 완료 클래스 CTA — 피드백 버튼 */}
                {isCompleted && (
                    isApplied ? (
                        <button
                            onClick={() => {
                                if (!currentUser) { alert('로그인 후 이용 가능합니다.'); navigate('/login'); return; }
                                setShowFeedbackModal(true);
                            }}
                            className={`flex-1 py-4 rounded-[24px] lg:rounded-[28px] font-black text-base lg:text-lg shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${myFeedback ? 'bg-amber-100 text-amber-600 border border-amber-200 shadow-amber-100' : 'bg-amber-400 text-white shadow-amber-400/20'}`}
                        >
                            <span className="material-symbols-outlined font-black">rate_review</span>
                            {myFeedback ? '내 후기 수정하기' : '수강 후기 남기기'}
                        </button>
                    ) : (
                        <div className="flex-1 py-4 rounded-[24px] bg-slate-100 text-slate-400 font-black text-base text-center flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined font-black">lock</span>
                            수강생만 후기 작성 가능
                        </div>
                    )
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

            {/* Feedback Modal */}
            {showFeedbackModal && (
                <ClassFeedbackModal
                    cls={cls}
                    currentUser={currentUser}
                    existingFeedback={myFeedback}
                    onClose={() => setShowFeedbackModal(false)}
                    onSuccess={handleFeedbackSuccess}
                />
            )}
        </div>
    );
};

export default ClassDetailPage;
