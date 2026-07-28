import React, { useState, useEffect, useRef } from 'react';
import {
    fetchClasses, createClass, updateClass, deleteClass,
    fetchApplications,
    completeClass, reopenClass,
    fetchPaidApplicants, recordThankYouSent,
    fetchClassFeedback, updateFeedbackVisibility, replyToFeedback, deleteFeedback,
    fetchClassStats,
    getClassNonReviewers,
} from '../services/classService';
import { supabase } from '../services/supabaseClient';
import { sendBulkMessage } from '../services/solapiService';

const CLASS_BUCKET = 'class-images';
const MAX_FILE_MB = 10;

// Helper to get applicant's latest grade
const getApplicantGrade = (app) => {
    const currentGrade = app?.users?.grade;
    if (currentGrade) {
        if (currentGrade === 'SILVER') return '🥈 SILVER';
        if (currentGrade === 'GOLD') return '🌟 GOLD';
        if (currentGrade === 'IMODEL') return '🌸 아임모델';
        if (currentGrade === 'VIP') return '👑 전속모델';
    }
    return app?.grade_label || '🥈 SILVER';
};

// ── 별점 표시 컴포넌트 ──────────────────────────────────────────────────────
const StarRating = ({ rating, size = 'md' }) => {
    const starSize = size === 'sm' ? 'text-[14px]' : 'text-[18px]';
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={`${starSize} ${s <= rating ? 'text-amber-400' : 'text-gray-200'}`}>★</span>
            ))}
        </div>
    );
};

// ── 별점 선택 컴포넌트 ──────────────────────────────────────────────────────
const StarSelector = ({ value, onChange }) => {
    const [hover, setHover] = useState(0);
    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(s => (
                <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => onChange(s)}
                    className="text-[28px] transition-transform hover:scale-110"
                >
                    <span className={(hover || value) >= s ? 'text-amber-400' : 'text-gray-200'}>★</span>
                </button>
            ))}
        </div>
    );
};

// ── 클래스 포스터 업로더 ──────────────────────────────────────────────────────
const ClassPosterUploader = ({ value, onChange, onError }) => {
    const [preview, setPreview] = useState(value || '');
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => { setPreview(value || ''); }, [value]);

    const handleFile = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { onError('이미지 파일만 업로드 가능합니다.'); return; }
        if (file.size > MAX_FILE_MB * 1024 * 1024) { onError(`최대 ${MAX_FILE_MB}MB까지 업로드 가능합니다.`); return; }

        const localUrl = URL.createObjectURL(file);
        setPreview(localUrl);

        if (!supabase) { onChange(localUrl); return; }
        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `poster_${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage
                .from(CLASS_BUCKET)
                .upload(fileName, file, { upsert: true, contentType: file.type });
            if (uploadErr) throw uploadErr;
            const { data } = supabase.storage.from(CLASS_BUCKET).getPublicUrl(fileName);
            setPreview(data.publicUrl);
            onChange(data.publicUrl);
        } catch (e) {
            onError('업로드 실패: ' + e.message);
            setPreview(value || '');
        } finally { setUploading(false); }
    };

    const clear = () => { setPreview(''); onChange(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

    return (
        <div>
            <label className="block text-sm font-black text-slate-700 mb-2">클래스 포스터 이미지 (선택)</label>
            <div className="flex gap-3 items-start">
                <div className="relative w-24 h-32 rounded-xl overflow-hidden bg-moca-primary/5 border border-slate-200 flex-shrink-0 flex items-center justify-center group">
                    {preview ? (
                        <>
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button type="button" onClick={clear} className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 text-white hover:bg-red-500 transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                            </div>
                        </>
                    ) : <span className="material-symbols-outlined text-moca-primary/40 text-[32px]">add_photo_alternate</span>}
                    {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-5 h-5 border-2 border-moca-primary/30 border-t-moca-primary rounded-full animate-spin" /></div>}
                </div>
                <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
                    className={`flex-1 h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all
                        ${dragOver ? 'border-moca-primary bg-moca-primary/5' : 'border-slate-200 bg-slate-50 hover:border-moca-primary/30'}
                        ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                >
                    <span className="material-symbols-outlined text-moca-primary/60 text-2xl group-hover:scale-110 transition-transform">upload_file</span>
                    <p className="text-slate-500 text-[11px] font-bold">{uploading ? '업로드 중...' : '클릭하거나 파일을 여기로 끌어다 놓으세요'}</p>
                    <p className="text-slate-400 text-[10px]">JPG, PNG, WEBP (최대 10MB)</p>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                </div>
            </div>
        </div>
    );
};

const AdminClasses = () => {
    const [view, setView] = useState('list');
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');
    const [editingClassId, setEditingClassId] = useState(null);
    const [pricing, setPricing] = useState([]);
    const [priceType, setPriceType] = useState('flat'); // 'flat' | 'grade'

    // 클래스 목록 탭: 'active' | 'completed'
    const [classTab, setClassTab] = useState('active');

    // 감사 메시지 발송 상태
    const [paidApplicants, setPaidApplicants] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [thankYouMessage, setThankYouMessage] = useState('');

    // 피드백 관리 상태
    const [feedbacks, setFeedbacks] = useState([]);
    const [replyInputs, setReplyInputs] = useState({});
    const [feedbackLoading, setFeedbackLoading] = useState(false);

    // 통계 상태
    const [classStats, setClassStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(false);

    // 승인 문자 발송 모달 상태
    const [approveModal, setApproveModal] = useState({
        isOpen: false,
        app: null,
        type: 'option1',
        messageText: ''
    });

    const getApproveMessage = (app, type) => {
        if (!app) return '';
        const name = app.users?.name || app.users?.nickname || '회원';
        const classTitle = selectedClass?.title || '클래스';
        
        let price = '';
        if (type === 'option1') {
            price = app.applied_price !== undefined && app.applied_price !== null
                ? (app.applied_price === 0 ? '무료' : `${app.applied_price.toLocaleString()}원`)
                : (selectedClass?.price_info || '무료');
        } else {
            price = selectedClass?.price_info || '무료';
        }

        return `[아임모델 MOCA] 수강 신청 승인 안내\n\n안녕하세요, ${name}님!\n신청하신 [${classTitle}] 수강 신청이 승인되었습니다.\n\n아래 계좌로 참가비를 입금해 주시면 확인 후 참석 확정이 완료됩니다.\n\n■ 참가비: ${price}\n■ 입금 계좌: 카카오뱅크 3333-04-2209478 김대희(아임모델)\n\n※ 참가비 입금이 확인되면 최종적으로 수강이 확정됩니다.\n\n문의: 카카오채널 @아임모델`;
    };

    const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

    const [newClass, setNewClass] = useState({
        title: '',
        description: '',
        location: '',
        capacity: 20,
        image_url: '',
        schedule_type: 'one_time',
        class_date: '',
        event_date: '',
        event_time: '',
        use_datetime_picker: true,
        start_date: '',
        end_date: '',
        day_of_week: [],
        start_time: '14:00',
        target_grade: 'ALL',
        price_info: '',
        review_message: ''
    });

    const [formError, setFormError] = useState('');

    useEffect(() => { loadClasses(); }, []);

    const loadClasses = async () => {
        setLoading(true);
        const { data, error } = await fetchClasses();
        if (data) setClasses(data);
        if (error) setError(error.message || String(error));
        setLoading(false);
    };

    const resetForm = () => {
        setNewClass({ title: '', description: '', location: '', capacity: 20, image_url: '', schedule_type: 'one_time', class_date: '', event_date: '', event_time: '', use_datetime_picker: true, start_date: '', end_date: '', day_of_week: [], start_time: '14:00', target_grade: 'ALL', price_info: '', review_message: '' });
        setFormError('');
        setEditingClassId(null);
        setPricing([{ grade_label: '🥈 SILVER', price: 50000 }, { grade_label: '🌟 GOLD', price: 30000 }, { grade_label: '👑 전속모델', price: 10000 }]);
        setPriceType('flat');
    };

    const handleEditClass = (cls) => {
        setEditingClassId(cls.id);
        // event_datetime에서 날짜/시간 분리
        let eventDate = '';
        let eventTime = '';
        let usePicker = false;
        if (cls.event_datetime) {
            const dt = new Date(cls.event_datetime);
            eventDate = dt.toISOString().slice(0, 10);
            eventTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
            usePicker = true;
        }
        setNewClass({
            title: cls.title || '',
            description: cls.description || '',
            location: cls.location || '',
            capacity: cls.capacity || 20,
            image_url: cls.image_url || '',
            schedule_type: cls.schedule_type || 'one_time',
            class_date: cls.class_date || '',
            event_date: eventDate,
            event_time: eventTime,
            use_datetime_picker: usePicker || cls.schedule_type !== 'one_time',
            start_date: cls.start_date || '',
            end_date: cls.end_date || '',
            day_of_week: cls.day_of_week || [],
            start_time: cls.start_time || '14:00',
            target_grade: cls.target_grade || 'ALL',
            price_info: cls.price_info || '',
            review_message: cls.review_message || ''
        });
        const hasPricing = cls.class_pricing && cls.class_pricing.length > 0;
        setPricing(hasPricing ? cls.class_pricing.map(p => ({ grade_label: p.grade_label, price: p.price })) : [{ grade_label: '🥈 SILVER', price: 50000 }, { grade_label: '🌟 GOLD', price: 30000 }, { grade_label: '👑 전속모델', price: 10000 }]);
        setPriceType(hasPricing ? 'grade' : 'flat');
        setView('create');
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setFormError('');
        setIsSubmitting(true);

        let finalClassDate = newClass.class_date;
        let eventDatetime = null;

        if (newClass.schedule_type === 'one_time' && newClass.use_datetime_picker && newClass.event_date && newClass.event_time) {
            // 구조화된 날짜/시간 picker 사용
            eventDatetime = new Date(`${newClass.event_date}T${newClass.event_time}:00`).toISOString();
            // 한국어 형식 class_date 자동 생성
            const dt = new Date(`${newClass.event_date}T${newClass.event_time}:00`);
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            const y = dt.getFullYear();
            const m = dt.getMonth() + 1;
            const d = dt.getDate();
            const dayName = dayNames[dt.getDay()];
            finalClassDate = `${y}년 ${m}월 ${d}일(${dayName}) ${newClass.event_time}`;
        } else if (newClass.schedule_type === 'weekly' && newClass.day_of_week.length > 0) {
            const daysStr = newClass.day_of_week.map(d => DAYS[d]).join(',');
            finalClassDate = `매주 ${daysStr} ${newClass.start_time}`;
        }

        let finalPriceInfo = newClass.price_info;
        if (priceType === 'grade') {
            finalPriceInfo = '등급별 차등';
        }
        const finalPricing = priceType === 'grade' ? pricing : [];

        const classPayload = { ...newClass, class_date: finalClassDate, price_info: finalPriceInfo, event_datetime: eventDatetime, review_message: newClass.review_message || null };

        if (editingClassId) {
            const { error } = await updateClass(editingClassId, classPayload, finalPricing);
            if (error) {
                setFormError(error.message);
            } else {
                setSuccessMsg('✅ 클래스가 성공적으로 수정되었습니다!');
                setView('list');
                loadClasses();
                resetForm();
            }
        } else {
            const { error } = await createClass(classPayload, finalPricing);
            if (error) {
                setFormError(error.message);
            } else {
                setSuccessMsg('✅ 클래스가 성공적으로 개설되었습니다!');
                setView('list');
                loadClasses();
                resetForm();
            }
        }
        setIsSubmitting(false);
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const handleViewApplicants = async (cls) => {
        setSelectedClass(cls);
        setView('applicants');
        setLoading(true);
        const { data, error } = await fetchApplications(cls.id);
        if (data) setApplicants(data);
        setLoading(false);
    };

    // ── 클래스 완료 처리 ────────────────────────────────────────────────────────
    const handleCompleteClass = async (cls) => {
        if (!window.confirm(`[${cls.title}] 클래스를 완료 처리 하시겠습니까?\n완료 후 수강생에게 감사 메시지를 발송할 수 있습니다.`)) return;
        setIsSubmitting(true);
        try {
            const { error } = await completeClass(cls.id);
            if (error) throw error;
            setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: 'completed', completed_at: new Date().toISOString() } : c));
            setSuccessMsg('✅ 클래스가 완료 처리되었습니다!');
            setTimeout(() => setSuccessMsg(''), 3000);
            // 감사 메시지 발송 화면으로 이동 여부 확인
            if (window.confirm('수강생에게 감사 메시지를 지금 발송하시겠습니까?')) {
                await handleOpenThankYou({ ...cls, status: 'completed' });
            }
        } catch (err) {
            alert('완료 처리 오류: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReopenClass = async (cls) => {
        if (!window.confirm(`[${cls.title}] 완료 처리를 취소하고 진행 중으로 되돌리시겠습니까?`)) return;
        setIsSubmitting(true);
        try {
            const { error } = await reopenClass(cls.id);
            if (error) throw error;
            setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, status: 'active', completed_at: null } : c));
            setSuccessMsg('✅ 클래스가 진행 중으로 복원되었습니다.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err) {
            alert('복원 오류: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── 감사 + 후기 재알림 화면 ────────────────────────────────────────────────────────
    const [nonReviewerCount, setNonReviewerCount] = useState(0);
    const [nonReviewerIds, setNonReviewerIds] = useState([]);

    const handleOpenThankYou = async (cls) => {
        setSelectedClass(cls);
        setView('thank_you');
        setLoading(true);
        const { data } = await fetchPaidApplicants(cls.id);
        setPaidApplicants(data || []);

        // 후기 미작성자 조회
        const { data: nonReviewers } = await getClassNonReviewers(cls.id);
        const nrIds = (nonReviewers || []).map(nr => nr.user_id);
        setNonReviewerIds(nrIds);
        setNonReviewerCount(nrIds.length);
        // 기본: 후기 미작성자만 선택
        setSelectedRecipients(nrIds);

        setThankYouMessage(
            `[아임모델 MOCA] 클래스 수강 감사 안내\n\n안녕하세요!\n[${cls.title}] 클래스에 참여해 주셔서 진심으로 감사드립니다. 🎉\n\n수강하신 경험에 대한 소중한 피드백을 남겨주시면,\n더 좋은 클래스를 준비하는 데 큰 도움이 됩니다 😊\n\n▶ 후기 남기기: https://immoca.kr/open-app?path=home/class/${cls.id}%3Fwrite_review%3Dtrue\n\n문의: 카카오채널 @아임모델`
        );
        setLoading(false);
    };

    const handleSendThankYou = async () => {
        if (selectedRecipients.length === 0) { alert('수신자를 선택해주세요.'); return; }
        if (!thankYouMessage.trim()) { alert('발송할 메시지를 입력해주세요.'); return; }
        if (!window.confirm(`${selectedRecipients.length}명에게 감사+후기 요청 메시지를 발송하시겠습니까?`)) return;

        setIsSubmitting(true);
        try {
            const phones = paidApplicants
                .filter(a => selectedRecipients.includes(a.user_id))
                .map(a => (a.users?.phone || '').replace(/-/g, ''))
                .filter(p => p.length >= 10);

            if (phones.length === 0) throw new Error('유효한 전화번호가 없습니다.');

            await sendBulkMessage(phones, thankYouMessage.trim(), 'sms');
            await recordThankYouSent(selectedClass.id);
            setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, thank_you_sent_at: new Date().toISOString() } : c));
            setSuccessMsg(`✅ ${phones.length}명에게 감사+후기 요청 메시지 발송 완료!`);
            setTimeout(() => setSuccessMsg(''), 4000);
        } catch (err) {
            alert('발송 실패: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── 피드백 관리 ────────────────────────────────────────────────────────
    const handleOpenFeedback = async (cls) => {
        setSelectedClass(cls);
        setView('feedback');
        setFeedbackLoading(true);
        const { data } = await fetchClassFeedback(cls.id);
        setFeedbacks(data || []);
        setReplyInputs({});
        setFeedbackLoading(false);
    };

    const handleToggleVisibility = async (fb) => {
        const { error } = await updateFeedbackVisibility(fb.id, !fb.is_visible);
        if (!error) {
            setFeedbacks(prev => prev.map(f => f.id === fb.id ? { ...f, is_visible: !f.is_visible } : f));
        }
    };

    const handleSubmitReply = async (fb) => {
        const reply = replyInputs[fb.id]?.trim();
        if (!reply) return;
        const { error } = await replyToFeedback(fb.id, reply);
        if (!error) {
            setFeedbacks(prev => prev.map(f => f.id === fb.id ? { ...f, admin_reply: reply, admin_replied_at: new Date().toISOString() } : f));
            setReplyInputs(prev => ({ ...prev, [fb.id]: '' }));
            setSuccessMsg('✅ 답변이 등록되었습니다.');
            setTimeout(() => setSuccessMsg(''), 2500);
        }
    };

    const handleDeleteFeedback = async (fb) => {
        if (!window.confirm('이 피드백을 삭제하시겠습니까?')) return;
        const { error } = await deleteFeedback(fb.id);
        if (!error) setFeedbacks(prev => prev.filter(f => f.id !== fb.id));
    };

    // ── 통계 보기 ────────────────────────────────────────────────────────
    const handleOpenStats = async (cls) => {
        setSelectedClass(cls);
        setView('stats');
        setStatsLoading(true);
        const { data } = await fetchClassStats(cls.id);
        setClassStats(data);
        setStatsLoading(false);
    };

    // ── 승인 + 문자 발송 ────────────────────────────────────────────────────
    const handleApprove = (app) => {
        const defaultMsg = getApproveMessage(app, 'option1');
        setApproveModal({ isOpen: true, app, type: 'option1', messageText: defaultMsg });
    };

    const handleConfirmApprove = async () => {
        const { app, messageText } = approveModal;
        if (!app) return;
        setIsSubmitting(true);
        try {
            const { error: updateErr } = await supabase
                .from('class_applications')
                .update({ approval_status: 'approved', payment_status: 'pending', approved_at: new Date().toISOString() })
                .eq('id', app.id);
            if (updateErr) throw updateErr;

            const phone = (app.users?.phone || app.user_phone || '').replace(/-/g, '');
            if (phone && messageText.trim()) {
                await sendBulkMessage([phone], messageText.trim(), 'sms');
            }

            setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, approval_status: 'approved' } : a));
            const name = app.users?.name || app.users?.nickname || '회원';
            setSuccessMsg(`✅ ${name}님 승인 완료 + 문자 발송 성공!`);
            setApproveModal({ isOpen: false, app: null, type: 'option1', messageText: '' });
        } catch (err) {
            alert('승인 처리 중 오류: ' + (err.message || JSON.stringify(err)));
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setSuccessMsg(''), 4000);
        }
    };

    const handleConfirmPayment = async (app) => {
        if (!window.confirm(`[${app.users?.name || app.users?.nickname}] 참석 확정 처리 하시겠습니까?`)) return;
        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from('class_applications')
                .update({ approval_status: 'paid', payment_status: 'paid', paid_at: new Date().toISOString() })
                .eq('id', app.id);
            if (error) throw error;

            const name = app.users?.name || app.users?.nickname || '회원';
            const phone = (app.users?.phone || app.user_phone || '').replace(/-/g, '');
            const classTitle = selectedClass?.title || '클래스';
            if (phone) {
                const msg = `[아임모델 MOCA] 수강 확정 안내\n\n${name}님 참석 확정이 완료되었습니다.\n${classTitle} 수강이 최종 확정되었습니다.\n\n수업 당일 뵙겠습니다 😊`;
                await sendBulkMessage([phone], msg, 'sms').catch(console.error);
            }

            setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, approval_status: 'paid', payment_status: 'paid' } : a));
            setSuccessMsg(`✅ ${name}님 참석 확정 완료!`);
        } catch (err) {
            alert('오류: ' + err.message);
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setSuccessMsg(''), 4000);
        }
    };

    const handleCancelApplication = async (app) => {
        if (!window.confirm(`[${app.users?.name || app.users?.nickname}] 취소 처리하시겠습니까?`)) return;
        const { error } = await supabase
            .from('class_applications')
            .update({ approval_status: 'cancelled', payment_status: 'cancelled' })
            .eq('id', app.id);
        if (!error) {
            setApplicants(prev => prev.map(a => a.id === app.id ? { ...a, approval_status: 'cancelled', payment_status: 'cancelled' } : a));
            setSuccessMsg('✅ 취소 처리 완료');
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    const handleDeleteClass = async (id) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;
        const { error } = await deleteClass(id);
        if (!error) {
            setClasses(prev => prev.filter(c => c.id !== id));
            setSuccessMsg('✅ 삭제 완료');
        }
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const toggleDay = (dayIndex) => {
        setNewClass(prev => ({
            ...prev,
            day_of_week: prev.day_of_week.includes(dayIndex)
                ? prev.day_of_week.filter(d => d !== dayIndex)
                : [...prev.day_of_week, dayIndex].sort()
        }));
    };

    const handleDownloadExcel = () => {
        if (!selectedClass || applicants.length === 0) { alert('다운로드할 신청자 데이터가 없습니다.'); return; }
        const headers = ['번호', '이름', '연락처', '멤버등급', '승인상태'];
        const rows = applicants.map((app, idx) => {
            const status = app.approval_status || (app.payment_status === 'paid' ? 'paid' : 'pending');
            const statusLabel = status === 'paid' ? '수강확정' : status === 'approved' ? '승인완료' : status === 'cancelled' ? '취소' : '신청대기';
            return [applicants.length - idx, app.users?.name || app.users?.nickname || '-', app.users?.phone || '-', getApplicantGrade(app), statusLabel];
        });
        const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${selectedClass.title}_신청자_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── 클래스 목록 분류 ──────────────────────────────────────────────────────
    const activeClasses = classes.filter(c => (c.status || 'active') === 'active');
    const completedClasses = classes.filter(c => c.status === 'completed');

    const showBackButton = view !== 'list';

    return (
        <div className="animate-fadeIn min-h-screen pb-20">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-indigo-500 text-2xl font-black">school</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-[var(--moca-text)] tracking-tight">모카 클래스 관리</h2>
                        <p className="text-[var(--moca-text-3)] text-xs font-bold leading-none mt-1.5 opacity-70">체계적인 교육 시스템 관리 및 정산</p>
                    </div>
                </div>
                {view === 'list' ? (
                    <button
                        onClick={() => { resetForm(); setView('create'); }}
                        className="flex items-center gap-2 bg-[var(--moca-text)] text-white px-6 py-3 rounded-2xl font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-500/10"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        개설하기
                    </button>
                ) : (
                    <button
                        onClick={() => { resetForm(); setView('list'); setSelectedClass(null); }}
                        className="px-5 py-2.5 rounded-xl border border-[var(--moca-border)] bg-white text-xs font-bold text-[var(--moca-text-2)] hover:bg-gray-50 flex items-center gap-2 transition-all"
                    >
                        <span className="material-symbols-outlined text-[16px]">keyboard_backspace</span>
                        목록으로
                    </button>
                )}
            </div>

            {/* Notification Area */}
            {successMsg && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-[var(--moca-text)] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-2xl animate-bounce-short">{successMsg}</div>}

            {/* ── 클래스 목록 ── */}
            {view === 'list' && (
                <div>
                    {/* 탭: 진행 중 / 완료 */}
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit mb-8">
                        <button
                            onClick={() => setClassTab('active')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${classTab === 'active' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                            진행 중 ({activeClasses.length})
                        </button>
                        <button
                            onClick={() => setClassTab('completed')}
                            className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${classTab === 'completed' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <span className="material-symbols-outlined text-[14px] text-green-500">check_circle</span>
                            완료된 클래스 ({completedClasses.length})
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {loading ? (
                            [1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-white border border-[var(--moca-border)] animate-pulse" />)
                        ) : (classTab === 'active' ? activeClasses : completedClasses).length === 0 ? (
                            <div className="col-span-full py-24 text-center border-2 border-dashed border-[var(--moca-border)] rounded-[40px] bg-white/50">
                                <span className="material-symbols-outlined text-6xl text-indigo-200 mb-4 block">{classTab === 'active' ? 'explore_off' : 'task_alt'}</span>
                                <p className="text-[var(--moca-text-3)] font-black text-lg">
                                    {classTab === 'active' ? '아직 개설된 클래스가 없습니다' : '완료된 클래스가 없습니다'}
                                </p>
                                {classTab === 'active' && (
                                    <button onClick={() => setView('create')} className="mt-6 text-indigo-500 font-black text-sm hover:underline underline-offset-4">클래스 개설 시작하기 →</button>
                                )}
                            </div>
                        ) : (
                            (classTab === 'active' ? activeClasses : completedClasses).map(cls => (
                                <div key={cls.id} className="group bg-white border border-[var(--moca-border)] rounded-[32px] overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all flex flex-col h-full active:scale-[0.995]">
                                    <div className="aspect-[16/10] bg-gray-50 relative overflow-hidden">
                                        {cls.image_url ? (
                                            <img src={cls.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-indigo-50/50">
                                                <span className="material-symbols-outlined text-indigo-200 text-5xl">auto_stories</span>
                                            </div>
                                        )}
                                        {/* 상태 배지 */}
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md ${cls.schedule_type === 'weekly' ? 'bg-indigo-500/80 text-white border-white/20' : 'bg-white/80 text-[var(--moca-text)] border-[var(--moca-border)]'}`}>
                                                {cls.schedule_type === 'weekly' ? '정기강좌' : '원데이'}
                                            </span>
                                            {cls.status === 'completed' && (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black border bg-green-500/80 text-white border-white/20 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[11px]">check_circle</span>
                                                    완료
                                                </span>
                                            )}
                                        </div>
                                        {/* 감사 메시지 발송 여부 */}
                                        {cls.status === 'completed' && cls.thank_you_sent_at && (
                                            <div className="absolute top-4 right-4">
                                                <span className="px-2 py-1 rounded-full text-[9px] font-black bg-amber-400/90 text-white border border-white/20 backdrop-blur-md flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[10px]">mail</span>
                                                    후기알림 발송됨
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-black text-[var(--moca-text)] line-clamp-1 mb-3">{cls.title}</h3>
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center gap-2 text-xs text-[var(--moca-text-2)] font-bold">
                                                    <span className="material-symbols-outlined text-[16px] text-indigo-400">event</span>
                                                    {cls.class_date}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-[var(--moca-text-3)] font-bold">
                                                    <span className="material-symbols-outlined text-[16px] text-indigo-300">location_on</span>
                                                    {cls.location}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-[var(--moca-text-3)] font-bold">
                                                    <span className="material-symbols-outlined text-[16px] text-indigo-300">payments</span>
                                                    참가비: {cls.price_info || '무료'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* 진행 중 클래스 버튼 */}
                                        {cls.status !== 'completed' && (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleViewApplicants(cls)} className="flex-1 bg-indigo-50 text-indigo-600 font-black py-3 rounded-2xl text-[13px] hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100">
                                                        신청 관리
                                                    </button>
                                                    <button
                                                        onClick={() => handleCompleteClass(cls)}
                                                        disabled={isSubmitting}
                                                        className="flex-1 bg-green-50 text-green-600 font-black py-3 rounded-2xl text-[13px] hover:bg-green-500 hover:text-white transition-all border border-green-100 flex items-center justify-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-[15px]">task_alt</span>
                                                        클래스 완료
                                                    </button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => { const shareUrl = `${window.location.origin}/home/class/${cls.id}`; navigator.share ? navigator.share({ title: `🎓 모카 클래스 - ${cls.title}`, url: shareUrl }).catch(() => {}) : navigator.clipboard.writeText(shareUrl).then(() => { setSuccessMsg('✅ 공유 링크가 복사되었습니다!'); setTimeout(() => setSuccessMsg(''), 2500); }); }} className="flex-1 flex flex-col items-center justify-center py-2 rounded-2xl border border-[var(--moca-border)] text-[var(--moca-text-3)] hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all font-bold">
                                                        <span className="material-symbols-outlined text-[18px] mb-0.5">share</span>
                                                        <span className="text-[9px]">공유</span>
                                                    </button>
                                                    <button onClick={() => handleEditClass(cls)} className="flex-1 flex flex-col items-center justify-center py-2 rounded-2xl border border-[var(--moca-border)] text-[var(--moca-text-3)] hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all font-bold">
                                                        <span className="material-symbols-outlined text-[18px] mb-0.5">edit</span>
                                                        <span className="text-[9px]">수정</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteClass(cls.id)} className="flex-1 flex flex-col items-center justify-center py-2 rounded-2xl border border-[var(--moca-border)] text-[var(--moca-text-3)] hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all font-bold">
                                                        <span className="material-symbols-outlined text-[18px] mb-0.5">delete_sweep</span>
                                                        <span className="text-[9px]">삭제</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* 완료된 클래스 버튼 */}
                                        {cls.status === 'completed' && (
                                            <div className="space-y-2">
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button onClick={() => handleOpenThankYou(cls)} className="flex flex-col items-center justify-center py-3 rounded-2xl bg-amber-50 text-amber-600 font-black text-[11px] hover:bg-amber-500 hover:text-white transition-all border border-amber-100 gap-1">
                                                        <span className="material-symbols-outlined text-[18px]">notification_important</span>
                                                        후기 재알림
                                                    </button>
                                                    <button onClick={() => handleOpenFeedback(cls)} className="flex flex-col items-center justify-center py-3 rounded-2xl bg-purple-50 text-purple-600 font-black text-[11px] hover:bg-purple-500 hover:text-white transition-all border border-purple-100 gap-1">
                                                        <span className="material-symbols-outlined text-[18px]">star</span>
                                                        피드백
                                                    </button>
                                                    <button onClick={() => handleOpenStats(cls)} className="flex flex-col items-center justify-center py-3 rounded-2xl bg-blue-50 text-blue-600 font-black text-[11px] hover:bg-blue-500 hover:text-white transition-all border border-blue-100 gap-1">
                                                        <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                                                        통계
                                                    </button>
                                                </div>
                                                <button onClick={() => handleReopenClass(cls)} className="w-full py-2 rounded-xl border border-slate-200 text-[11px] font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                                                    진행 중으로 되돌리기
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ── 클래스 개설/수정 폼 ── */}
            {view === 'create' && (
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-2xl">
                        <div className="p-8 lg:p-12">
                            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                <span className="w-2 h-8 bg-moca-primary rounded-full" />
                                클래스 설정 {editingClassId ? '(수정)' : '(개설)'}
                            </h3>

                            <form onSubmit={handleCreateClass} className="space-y-10">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-black text-slate-700 mb-3">클래스 제목</label>
                                            <input type="text" required value={newClass.title} onChange={e => setNewClass({ ...newClass, title: e.target.value })} placeholder="예: 실전 광고 모델 워크숍 1기" className="w-full bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold transition-all outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-black text-slate-700 mb-3">스케줄 유형</label>
                                            <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1 border border-slate-200">
                                                <button type="button" onClick={() => setNewClass({ ...newClass, schedule_type: 'one_time' })} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${newClass.schedule_type === 'one_time' ? 'bg-white shadow-sm text-moca-primary' : 'text-slate-500 hover:text-slate-800'}`}>단발성 (One-Day)</button>
                                                <button type="button" onClick={() => setNewClass({ ...newClass, schedule_type: 'weekly' })} className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${newClass.schedule_type === 'weekly' ? 'bg-white shadow-sm text-moca-primary' : 'text-slate-500 hover:text-slate-800'}`}>정기 (Weekly)</button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-black text-slate-700 mb-3">강의 장소</label>
                                            <input type="text" required value={newClass.location} onChange={e => setNewClass({ ...newClass, location: e.target.value })} placeholder="예: 당산 연기 스튜디오" className="w-full bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold transition-all outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20" />
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                                        <label className="block text-xs font-black text-slate-500 mb-4 uppercase tracking-widest">신청 가능 등급 (선택)</label>
                                        <div className="flex gap-4">
                                            {[{ id: 'ALL', label: '전체등급신청' }, { id: 'GOLD', label: '골드회원등급' }, { id: 'EXCLUSIVE', label: '전속모델 등급신청' }].map(opt => (
                                                <label key={opt.id} className={`flex-1 cursor-pointer flex flex-col items-center justify-center p-4 border-2 rounded-2xl transition-all ${newClass.target_grade === opt.id ? 'border-moca-primary bg-moca-primary/5 text-moca-primary' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'}`}>
                                                    <input type="radio" name="target_grade" value={opt.id} checked={newClass.target_grade === opt.id} onChange={(e) => setNewClass({ ...newClass, target_grade: e.target.value })} className="hidden" />
                                                    <span className="font-bold text-sm">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-6">
                                        {newClass.schedule_type === 'one_time' ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">📅 일시 설정</label>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={newClass.use_datetime_picker}
                                                            onChange={e => setNewClass({ ...newClass, use_datetime_picker: e.target.checked })}
                                                            className="w-4 h-4 rounded accent-[var(--moca-primary)]"
                                                        />
                                                        <span className="text-xs font-bold text-slate-600">날짜/시간 지정</span>
                                                    </label>
                                                </div>

                                                {newClass.use_datetime_picker ? (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-600 mb-2">날짜</label>
                                                                <input
                                                                    type="date"
                                                                    required
                                                                    value={newClass.event_date}
                                                                    onChange={e => setNewClass({ ...newClass, event_date: e.target.value })}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[var(--moca-primary)] focus:ring-1 focus:ring-[var(--moca-primary)]/20"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-xs font-bold text-slate-600 mb-2">시작 시간</label>
                                                                <input
                                                                    type="time"
                                                                    required
                                                                    value={newClass.event_time}
                                                                    onChange={e => setNewClass({ ...newClass, event_time: e.target.value })}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[var(--moca-primary)] focus:ring-1 focus:ring-[var(--moca-primary)]/20"
                                                                />
                                                            </div>
                                                        </div>
                                                        {/* 미리보기 */}
                                                        {newClass.event_date && newClass.event_time && (() => {
                                                            const dt = new Date(`${newClass.event_date}T${newClass.event_time}:00`);
                                                            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                                                            const y = dt.getFullYear();
                                                            const m = dt.getMonth() + 1;
                                                            const d = dt.getDate();
                                                            const dayName = dayNames[dt.getDay()];
                                                            const previewText = `${y}년 ${m}월 ${d}일(${dayName}) ${newClass.event_time}`;
                                                            
                                                            const now = new Date();
                                                            const diffMs = dt.getTime() - now.getTime();
                                                            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                                                            let ddayLabel = '';
                                                            let ddayColor = 'text-blue-500';
                                                            if (diffDays < 0) { ddayLabel = '종료'; ddayColor = 'text-gray-400'; }
                                                            else if (diffDays === 0) { ddayLabel = 'D-DAY'; ddayColor = 'text-red-500'; }
                                                            else if (diffDays <= 3) { ddayLabel = `D-${diffDays}`; ddayColor = 'text-red-500'; }
                                                            else if (diffDays <= 6) { ddayLabel = `D-${diffDays}`; ddayColor = 'text-amber-500'; }
                                                            else { ddayLabel = `D-${diffDays}`; ddayColor = 'text-blue-500'; }

                                                            // 후기 알림 예정 시각 (시작+4시간)
                                                            const reminderDt = new Date(dt.getTime() + 4 * 60 * 60 * 1000);
                                                            const reminderTime = `${String(reminderDt.getHours()).padStart(2, '0')}:${String(reminderDt.getMinutes()).padStart(2, '0')}`;

                                                            return (
                                                                <div className="bg-white rounded-xl p-4 border border-indigo-100 space-y-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="material-symbols-outlined text-[16px] text-indigo-400">visibility</span>
                                                                        <span className="text-xs font-black text-slate-500">미리보기</span>
                                                                    </div>
                                                                    <p className="text-sm font-black text-[var(--moca-text)]">{previewText}</p>
                                                                    <div className="flex items-center gap-3 flex-wrap">
                                                                        <span className={`text-xs font-black ${ddayColor}`}>📌 {ddayLabel}</span>
                                                                        <span className="text-xs font-bold text-slate-400">⏰ 후기 알림 예정: {reminderTime} (시작+4시간)</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="block text-xs font-bold text-slate-600 mb-2">날짜/시간 (자유 입력)</label>
                                                        <input type="text" required value={newClass.class_date} onChange={e => setNewClass({ ...newClass, class_date: e.target.value })} placeholder="예: 4월 25일(토) 14:00" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-[var(--moca-primary)] focus:ring-1 focus:ring-[var(--moca-primary)]/20" />
                                                        <p className="text-[10px] text-amber-500 font-bold mt-2">⚠️ 자유 입력 시 D-day 표시 및 후기 자동 알림이 작동하지 않습니다.</p>
                                                    </div>
                                                )}

                                            {/* 후기 자동 알림 메시지 편집 */}
                                            {newClass.use_datetime_picker && (
                                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="material-symbols-outlined text-[16px] text-amber-500">notification_important</span>
                                                            <span className="text-xs font-black text-amber-700">자동 후기 알림 메시지</span>
                                                        </div>
                                                        <span className="text-[10px] font-bold text-amber-400">강의 시작 +4시간 후 자동 발송</span>
                                                    </div>
                                                    <textarea
                                                        rows={5}
                                                        value={newClass.review_message || `[아임모델 MOCA] ${newClass.title || '클래스'} 수강 감사 안내\n\n안녕하세요!\n[${newClass.title || '클래스'}] 클래스에 참여해 주셔서 진심으로 감사드립니다. 🎉\n\n수강하신 경험에 대한 소중한 피드백을 남겨주시면,\n더 좋은 클래스를 준비하는 데 큰 도움이 됩니다 😊\n\n▶ 후기 남기기: (앱에서 자동 연결)\n\n문의: 카카오채널 @아임모델`}
                                                        onChange={e => setNewClass({ ...newClass, review_message: e.target.value })}
                                                        placeholder="후기 알림 메시지를 입력하세요"
                                                        className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-xs font-bold transition-all outline-none resize-none leading-relaxed focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
                                                    />
                                                    <p className="text-[10px] text-amber-500 font-bold">💡 비워두면 기본 메시지가 사용됩니다. 후기 링크는 자동으로 추가됩니다.</p>
                                                </div>
                                            )}
                                        </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">강의 요일 선택 (중복 가능)</label>
                                                    <div className="flex gap-2">
                                                        {DAYS.map((d, i) => (
                                                            <button key={d} type="button" onClick={() => toggleDay(i)} className={`w-10 h-10 rounded-xl font-black text-xs border transition-all ${newClass.day_of_week.includes(i) ? 'bg-moca-primary text-white border-moca-primary shadow-md shadow-moca-primary/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{d}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <div className="col-span-full lg:col-span-1">
                                                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">시작 시간</label>
                                                        <input type="time" value={newClass.start_time} onChange={e => setNewClass({ ...newClass, start_time: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">시작일</label>
                                                        <input type="date" value={newClass.start_date} onChange={e => setNewClass({ ...newClass, start_date: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">종료일 (선택)</label>
                                                        <input type="date" value={newClass.end_date} onChange={e => setNewClass({ ...newClass, end_date: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20" />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="pt-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">수강 정원</label>
                                                <span className="text-sm font-black text-moca-primary">{newClass.capacity}명</span>
                                            </div>
                                            <input type="range" min="1" max="100" value={newClass.capacity} onChange={e => setNewClass({ ...newClass, capacity: e.target.value })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-moca-primary" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <ClassPosterUploader value={newClass.image_url} onChange={url => setNewClass({ ...newClass, image_url: url })} onError={setFormError} />
                                    
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-6">
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">참가비 설정 방식</label>
                                            <div className="flex gap-2 p-1 bg-slate-200/50 rounded-2xl w-fit">
                                                <button
                                                    type="button"
                                                    onClick={() => setPriceType('flat')}
                                                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${priceType === 'flat' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                                                >
                                                    단일 참가비 (모두 동일)
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setPriceType('grade')}
                                                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all ${priceType === 'grade' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                                                >
                                                    등급별 차등 적용
                                                </button>
                                            </div>
                                        </div>

                                        {priceType === 'flat' ? (
                                            <div className="animate-fadeIn">
                                                <label className="block text-sm font-black text-slate-700 mb-2.5">참가비 금액 (원)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1000"
                                                    required
                                                    value={newClass.price_info && !isNaN(newClass.price_info) ? newClass.price_info : ''}
                                                    onChange={e => setNewClass({ ...newClass, price_info: e.target.value })}
                                                    placeholder="예: 10000 (무료인 경우 0 입력)"
                                                    className="w-full bg-white border-2 border-slate-200 focus:bg-white rounded-2xl px-5 py-4 text-sm font-black outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20"
                                                />
                                                <p className="text-[10px] text-slate-400 font-bold mt-2">* 모든 등급에 동일한 금액이 원 단위로 청구됩니다. (0원인 경우 무료로 표기됨)</p>
                                            </div>
                                        ) : (
                                            <div className="animate-fadeIn space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">등급별 참가비 설정</label>
                                                    <span className="text-[10px] text-slate-400 font-bold">회원 등급에 따라 자동으로 금액이 차등 청구됩니다.</span>
                                                </div>
                                                {pricing.map((p, idx) => {
                                                    const gradeColors = { 'SILVER': { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-600', focus: 'focus:border-blue-400' }, 'GOLD': { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-600', focus: 'focus:border-amber-400' } };
                                                    const key = p.grade_label.toUpperCase().includes('SILVER') ? 'SILVER' : p.grade_label.toUpperCase().includes('GOLD') ? 'GOLD' : 'DEFAULT';
                                                    const c = gradeColors[key] || { bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-600', focus: 'focus:border-indigo-400' };
                                                    return (
                                                        <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border ${c.bg} ${c.border}`}>
                                                            <span className={`px-3 py-1 rounded-full text-xs font-black whitespace-nowrap ${c.badge}`}>{p.grade_label}</span>
                                                            <input
                                                                type="number" min="0" step="1000"
                                                                required
                                                                value={p.price}
                                                                onChange={e => setPricing(prev => prev.map((item, i) => i === idx ? { ...item, price: e.target.value } : item))}
                                                                placeholder="0"
                                                                className={`flex-1 bg-white border rounded-xl px-4 py-2.5 text-sm font-black outline-none transition-all ${c.border} ${c.focus}`}
                                                            />
                                                            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">원</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-black text-slate-700 mb-3">클래스 상세 설명</label>
                                    <textarea
                                        rows={6}
                                        value={newClass.description}
                                        onChange={e => setNewClass({ ...newClass, description: e.target.value })}
                                        placeholder="클래스 진행 내용, 준비물, 주의사항 등을 자세하게 입력해주세요."
                                        className="w-full bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold transition-all outline-none resize-none leading-relaxed focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20"
                                    />
                                </div>

                                {formError && <p className="text-red-500 text-sm font-bold">{formError}</p>}

                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => { resetForm(); setView('list'); }} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-2xl transition-all">취소</button>
                                    <button type="submit" disabled={isSubmitting} className="flex-1 py-4 bg-moca-primary hover:opacity-90 text-white font-black text-sm rounded-2xl transition-all shadow-xl shadow-moca-primary/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                        {isSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />처리 중...</> : <><span className="material-symbols-outlined text-[16px]">check</span>{editingClassId ? '수정 완료' : '클래스 개설'}</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 신청자 관리 ── */}
            {view === 'applicants' && selectedClass && (
                <div className="bg-white border border-[var(--moca-border)] rounded-[40px] overflow-hidden shadow-xl">
                    <div className="p-8 border-b border-[var(--moca-border)] bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2">Class Management</p>
                                <h3 className="text-2xl font-black">{selectedClass.title}</h3>
                                <p className="text-indigo-200 text-sm font-bold mt-1">{selectedClass.class_date} · {selectedClass.location}</p>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleDownloadExcel} className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-black transition-all backdrop-blur-md">
                                    <span className="material-symbols-outlined text-[16px]">download</span>
                                    엑셀 다운
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                            <div className="bg-white/10 border border-white/20 p-4 rounded-3xl text-center min-w-[90px]">
                                <p className="text-[10px] font-black text-white/40 mb-1 uppercase tracking-tighter">신청</p>
                                <p className="text-xl font-black">{applicants.length}명</p>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl text-center min-w-[90px]">
                                <p className="text-[10px] font-black text-amber-400/60 mb-1 uppercase tracking-tighter">승인</p>
                                <p className="text-xl font-black text-amber-400">{applicants.filter(a => a.approval_status === 'approved').length}명</p>
                            </div>
                            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-3xl text-center min-w-[90px]">
                                <p className="text-[10px] font-black text-green-400/60 mb-1 uppercase tracking-tighter">수강확정</p>
                                <p className="text-xl font-black text-green-400">{applicants.filter(a => a.approval_status === 'paid').length}명</p>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-3xl text-center min-w-[90px]">
                                <p className="text-[10px] font-black text-red-400/60 mb-1 uppercase tracking-tighter">취소</p>
                                <p className="text-xl font-black text-red-400">{applicants.filter(a => a.approval_status === 'cancelled').length}명</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 overflow-x-auto">
                        {loading ? (
                            <div className="py-16 text-center text-[var(--moca-text-3)] font-black">불러오는 중...</div>
                        ) : applicants.length === 0 ? (
                            <div className="py-16 text-center">
                                <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">inbox</span>
                                <p className="text-[var(--moca-text-3)] font-black">아직 신청자가 없습니다</p>
                            </div>
                        ) : (
                            <table className="w-full min-w-[900px]">
                                <thead>
                                    <tr className="border-b border-[var(--moca-border)] text-left">
                                        <th className="px-4 py-5 text-[11px] font-black text-[var(--moca-text-3)] text-center w-12">번호</th>
                                        <th className="px-4 py-5 text-[11px] font-black text-[var(--moca-text-3)] uppercase tracking-widest">신청자</th>
                                        <th className="px-4 py-5 text-[11px] font-black text-[var(--moca-text-3)] uppercase">등급</th>
                                        <th className="px-4 py-5 text-[11px] font-black text-[var(--moca-text-3)] text-center">상태</th>
                                        <th className="px-4 py-5 text-[11px] font-black text-[var(--moca-text-3)] text-center">관리</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--moca-border)]">
                                    {applicants.map((app, idx) => {
                                        const status = app.approval_status || (app.payment_status === 'paid' ? 'paid' : 'pending');
                                        const isPending = status === 'pending';
                                        const isApproved = status === 'approved';
                                        const isPaid = status === 'paid';
                                        const isCancelled = status === 'cancelled';
                                        const statusBadge = isPaid ? { label: '수강확정', cls: 'bg-green-50 text-green-600 border-green-200' } : isApproved ? { label: '승인완료', cls: 'bg-amber-50 text-amber-600 border-amber-200' } : isCancelled ? { label: '취소', cls: 'bg-red-50 text-red-500 border-red-100' } : { label: '신청대기', cls: 'bg-blue-50 text-blue-500 border-blue-100' };
                                        return (
                                            <tr key={app.id} className={`transition-colors group ${isCancelled ? 'opacity-40' : 'hover:bg-gray-50/50'}`}>
                                                <td className="px-4 py-5 text-center text-xs font-bold text-[var(--moca-text-3)]">{applicants.length - idx}</td>
                                                <td className="px-4 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-500 text-xs flex-shrink-0">
                                                            {(app.users?.name || app.users?.nickname || '?')[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-[var(--moca-text)]">{app.users?.name || app.users?.nickname}</p>
                                                            <p className="text-[11px] font-bold text-[var(--moca-text-3)]">{app.users?.phone || app.user_phone}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-5">
                                                    <span className="px-2.5 py-1 rounded-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[10px] font-black text-[var(--moca-text-2)] uppercase">{getApplicantGrade(app)}</span>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border ${statusBadge.cls}`}>{statusBadge.label}</span>
                                                </td>
                                                <td className="px-4 py-5">
                                                    <div className="flex justify-center gap-2">
                                                        {isPending && <button onClick={() => handleApprove(app)} disabled={isSubmitting} className="px-3 py-2 rounded-xl text-[11px] font-black bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50">승인 + 문자발송</button>}
                                                        {isApproved && <button onClick={() => handleConfirmPayment(app)} disabled={isSubmitting} className="px-3 py-2 rounded-xl text-[11px] font-black bg-green-500 text-white hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50">참석확정</button>}
                                                        {isPaid && <span className="px-3 py-2 rounded-xl text-[11px] font-black bg-gray-100 text-[var(--moca-text-3)]">완료</span>}
                                                        {!isCancelled && !isPaid && <button onClick={() => handleCancelApplication(app)} className="px-3 py-2 rounded-xl text-[11px] font-black bg-red-50 text-red-400 hover:bg-red-100 border border-red-100 transition-all">취소</button>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ── 감사 메시지 발송 화면 ── */}
            {view === 'thank_you' && selectedClass && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-[32px] p-8 text-white shadow-2xl shadow-amber-500/20">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-3xl">notification_important</span>
                            <div>
                                <p className="text-amber-100 text-xs font-black uppercase tracking-widest">Review Reminder</p>
                                <h3 className="text-xl font-black">감사 + 후기 재알림 발송</h3>
                            </div>
                        </div>
                        <p className="text-amber-100 text-sm font-bold">{selectedClass.title}</p>
                        <div className="flex gap-3 mt-3 flex-wrap">
                            {selectedClass.review_notification_sent && (
                                <div className="px-3 py-2 bg-white/20 rounded-xl text-xs font-bold backdrop-blur-md border border-white/20 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                    자동 알림 발송됨: {selectedClass.review_notification_sent_at ? new Date(selectedClass.review_notification_sent_at).toLocaleString('ko-KR') : ''}
                                </div>
                            )}
                            {selectedClass.thank_you_sent_at && (
                                <div className="px-3 py-2 bg-white/20 rounded-xl text-xs font-bold backdrop-blur-md border border-white/20">
                                    이전 수동 발송: {new Date(selectedClass.thank_you_sent_at).toLocaleString('ko-KR')}
                                </div>
                            )}
                        </div>
                        <div className="mt-4 px-4 py-3 bg-white/15 rounded-2xl border border-white/20 backdrop-blur-md">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-[10px] font-bold text-white/60">수강확정</p>
                                    <p className="text-lg font-black">{paidApplicants.length}명</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-white/60">후기 미작성</p>
                                    <p className="text-lg font-black text-yellow-200">{nonReviewerCount}명</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-white/60">후기 완료</p>
                                    <p className="text-lg font-black text-green-200">{paidApplicants.length - nonReviewerCount}명</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 수신자 선택 */}
                    <div className="bg-white border border-[var(--moca-border)] rounded-[28px] p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-black text-[var(--moca-text)]">수신자 선택</h4>
                            <div className="flex gap-2">
                                <button onClick={() => setSelectedRecipients(nonReviewerIds)} className="text-xs font-black text-red-500 hover:underline">미작성자만</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => setSelectedRecipients(paidApplicants.map(a => a.user_id))} className="text-xs font-black text-indigo-500 hover:underline">전체 선택</button>
                                <span className="text-slate-300">|</span>
                                <button onClick={() => setSelectedRecipients([])} className="text-xs font-black text-slate-400 hover:underline">전체 해제</button>
                            </div>
                        </div>
                        {loading ? (
                            <div className="py-8 text-center text-slate-400 font-bold">불러오는 중...</div>
                        ) : paidApplicants.length === 0 ? (
                            <div className="py-8 text-center">
                                <span className="material-symbols-outlined text-4xl text-gray-200 block mb-2">person_off</span>
                                <p className="text-slate-400 font-bold text-sm">수강 확정된 수강생이 없습니다</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                                {paidApplicants.map(app => {
                                    const isSelected = selectedRecipients.includes(app.user_id);
                                    const name = app.users?.name || app.users?.nickname || '회원';
                                    const phone = app.users?.phone || '-';
                                    return (
                                        <label key={app.user_id} className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${isSelected ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-transparent hover:border-slate-200'}`}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => setSelectedRecipients(prev => isSelected ? prev.filter(id => id !== app.user_id) : [...prev, app.user_id])}
                                                className="w-4 h-4 accent-amber-500"
                                            />
                                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black text-sm flex-shrink-0">{name[0]}</div>
                                            <div className="flex-1">
                                                <p className="text-sm font-black text-[var(--moca-text)]">{name}</p>
                                                <p className="text-[11px] font-bold text-[var(--moca-text-3)]">{phone}</p>
                                            </div>
                                            {nonReviewerIds.includes(app.user_id) ? (
                                                <span className="text-[9px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded-full">후기안씀</span>
                                            ) : (
                                                <span className="text-[9px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded-full">후기완료</span>
                                            )}
                                            {isSelected && <span className="material-symbols-outlined text-amber-500 text-[18px]">check_circle</span>}
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400">선택된 수신자</span>
                            <span className="text-sm font-black text-amber-500">{selectedRecipients.length}명</span>
                        </div>
                    </div>

                    {/* 메시지 편집 */}
                    <div className="bg-white border border-[var(--moca-border)] rounded-[28px] p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-black text-[var(--moca-text)]">발송 메시지 편집</h4>
                            <span className="text-[10px] font-bold text-slate-400">{thankYouMessage.length}자</span>
                        </div>
                        <textarea
                            value={thankYouMessage}
                            onChange={e => setThankYouMessage(e.target.value)}
                            rows={10}
                            className="w-full bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-2xl px-4 py-3 text-xs font-bold transition-all outline-none resize-none leading-relaxed focus:border-amber-400 focus:ring-1 focus:ring-amber-400/20"
                        />
                        <p className="text-[10px] text-slate-400 font-bold mt-2">* 피드백 링크는 메시지에 자동 포함됩니다. 내용을 자유롭게 수정하실 수 있습니다.</p>
                    </div>

                    <button
                        onClick={handleSendThankYou}
                        disabled={isSubmitting || selectedRecipients.length === 0}
                        className="w-full py-5 bg-amber-500 hover:bg-amber-600 text-white font-black text-base rounded-[24px] transition-all shadow-xl shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />발송 중...</>
                        ) : (
                            <>{selectedRecipients.length}명에게 감사+후기 요청 SMS 발송</>
                        )}
                    </button>
                </div>
            )}

            {/* ── 피드백 관리 ── */}
            {view === 'feedback' && selectedClass && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-[32px] p-8 text-white shadow-2xl shadow-purple-500/20">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-3xl">star</span>
                            <div>
                                <p className="text-purple-200 text-xs font-black uppercase tracking-widest">Feedback Management</p>
                                <h3 className="text-xl font-black">피드백 관리</h3>
                            </div>
                        </div>
                        <p className="text-purple-200 text-sm font-bold">{selectedClass.title}</p>
                        {feedbacks.length > 0 && (
                            <div className="mt-4 flex gap-4">
                                <div className="bg-white/10 border border-white/20 px-4 py-3 rounded-2xl text-center backdrop-blur-md">
                                    <p className="text-[10px] text-purple-200 font-black uppercase mb-1">총 피드백</p>
                                    <p className="text-2xl font-black">{feedbacks.length}</p>
                                </div>
                                <div className="bg-white/10 border border-white/20 px-4 py-3 rounded-2xl text-center backdrop-blur-md">
                                    <p className="text-[10px] text-purple-200 font-black uppercase mb-1">평균 평점</p>
                                    <p className="text-2xl font-black text-amber-300">
                                        {(feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length).toFixed(1)} ⭐
                                    </p>
                                </div>
                                <div className="bg-white/10 border border-white/20 px-4 py-3 rounded-2xl text-center backdrop-blur-md">
                                    <p className="text-[10px] text-purple-200 font-black uppercase mb-1">공개</p>
                                    <p className="text-2xl font-black text-green-300">{feedbacks.filter(f => f.is_visible).length}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {feedbackLoading ? (
                        <div className="py-16 text-center text-slate-400 font-bold">피드백을 불러오는 중...</div>
                    ) : feedbacks.length === 0 ? (
                        <div className="py-16 text-center bg-white border border-[var(--moca-border)] rounded-[28px]">
                            <span className="material-symbols-outlined text-5xl text-gray-200 block mb-3">rate_review</span>
                            <p className="text-slate-400 font-black">아직 피드백이 없습니다</p>
                            <p className="text-slate-300 text-sm font-bold mt-1">수강생에게 감사 메시지를 보내 피드백을 요청해보세요</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {feedbacks.map(fb => {
                                const name = fb.users?.name || fb.users?.nickname || '회원';
                                return (
                                    <div key={fb.id} className={`bg-white border rounded-[24px] overflow-hidden shadow-sm transition-all ${fb.is_visible ? 'border-[var(--moca-border)]' : 'border-slate-200 opacity-60'}`}>
                                        <div className="p-5">
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-black text-sm flex-shrink-0">{name[0]}</div>
                                                    <div>
                                                        <p className="text-sm font-black text-[var(--moca-text)]">{name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{new Date(fb.created_at).toLocaleDateString('ko-KR')}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <StarRating rating={fb.rating} size="sm" />
                                                    <span className="text-sm font-black text-amber-500">{fb.rating}.0</span>
                                                </div>
                                            </div>
                                            {fb.comment && <p className="text-sm text-slate-600 font-medium leading-relaxed mb-3 bg-slate-50 rounded-xl p-3">{fb.comment}</p>}
                                            {fb.image_url && <img src={fb.image_url} alt="" className="w-full max-h-48 object-cover rounded-xl mb-3" />}

                                            {/* 어드민 답변 */}
                                            {fb.admin_reply && (
                                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-3">
                                                    <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">어드민 답변</p>
                                                    <p className="text-sm text-indigo-700 font-medium">{fb.admin_reply}</p>
                                                </div>
                                            )}

                                            {/* 답변 입력 */}
                                            <div className="flex gap-2 mt-3">
                                                <input
                                                    type="text"
                                                    value={replyInputs[fb.id] || ''}
                                                    onChange={e => setReplyInputs(prev => ({ ...prev, [fb.id]: e.target.value }))}
                                                    placeholder={fb.admin_reply ? '답변 수정하기...' : '답변 달기...'}
                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-300 transition-all"
                                                    onKeyDown={e => e.key === 'Enter' && handleSubmitReply(fb)}
                                                />
                                                <button onClick={() => handleSubmitReply(fb)} className="px-3 py-2 bg-indigo-500 text-white rounded-xl text-xs font-black hover:bg-indigo-600 transition-all">
                                                    등록
                                                </button>
                                            </div>

                                            {/* 어드민 액션 버튼들 */}
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                                                <button
                                                    onClick={() => handleToggleVisibility(fb)}
                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${fb.is_visible ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">{fb.is_visible ? 'visibility' : 'visibility_off'}</span>
                                                    {fb.is_visible ? '공개' : '비공개'}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteFeedback(fb)}
                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black bg-red-50 text-red-400 hover:bg-red-100 transition-all ml-auto"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── 통계 대시보드 ── */}
            {view === 'stats' && selectedClass && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-[32px] p-8 text-white shadow-2xl shadow-blue-500/20">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="material-symbols-outlined text-3xl">bar_chart</span>
                            <div>
                                <p className="text-blue-200 text-xs font-black uppercase tracking-widest">Statistics</p>
                                <h3 className="text-xl font-black">클래스 통계</h3>
                            </div>
                        </div>
                        <p className="text-blue-200 text-sm font-bold">{selectedClass.title}</p>
                        <p className="text-blue-300 text-xs font-bold mt-1">완료일: {selectedClass.completed_at ? new Date(selectedClass.completed_at).toLocaleDateString('ko-KR') : '-'}</p>
                    </div>

                    {statsLoading ? (
                        <div className="py-16 text-center text-slate-400 font-bold">통계를 불러오는 중...</div>
                    ) : classStats ? (
                        <>
                            {/* 핵심 지표 카드 */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {[
                                    { label: '총 신청자', value: `${classStats.totalApplicants}명`, icon: 'group', color: 'bg-blue-50 text-blue-600 border-blue-100' },
                                    { label: '수강 확정', value: `${classStats.confirmedCount}명`, icon: 'check_circle', color: 'bg-green-50 text-green-600 border-green-100' },
                                    { label: '승인 대기', value: `${classStats.approvedCount}명`, icon: 'pending', color: 'bg-amber-50 text-amber-600 border-amber-100' },
                                    { label: '취소', value: `${classStats.cancelledCount}명`, icon: 'cancel', color: 'bg-red-50 text-red-500 border-red-100' },
                                    { label: '피드백 수', value: `${classStats.feedbackCount}건`, icon: 'rate_review', color: 'bg-purple-50 text-purple-600 border-purple-100' },
                                    { label: '총 수익', value: classStats.totalRevenue > 0 ? `${classStats.totalRevenue.toLocaleString()}원` : '무료', icon: 'payments', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                                ].map(item => (
                                    <div key={item.label} className={`bg-white border rounded-[20px] p-5 flex flex-col gap-2 ${item.color.split(' ')[2]}`}>
                                        <div className="flex items-center gap-2">
                                            <span className={`material-symbols-outlined text-[20px] ${item.color.split(' ')[1]}`}>{item.icon}</span>
                                            <span className="text-xs font-black text-slate-500">{item.label}</span>
                                        </div>
                                        <p className={`text-2xl font-black ${item.color.split(' ')[1]}`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* 평균 평점 */}
                            {classStats.avgRating && (
                                <div className="bg-white border border-[var(--moca-border)] rounded-[24px] p-6 shadow-sm">
                                    <h4 className="font-black text-[var(--moca-text)] mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-400">star</span>
                                        평균 평점
                                    </h4>
                                    <div className="flex items-center gap-4 mb-4">
                                        <span className="text-5xl font-black text-amber-400">{classStats.avgRating}</span>
                                        <div>
                                            <StarRating rating={Math.round(Number(classStats.avgRating))} />
                                            <p className="text-xs text-slate-400 font-bold mt-1">총 {classStats.feedbackCount}개 평가</p>
                                        </div>
                                    </div>
                                    {/* 별점 분포 바 */}
                                    <div className="space-y-2">
                                        {[5, 4, 3, 2, 1].map(star => {
                                            const count = classStats.ratingDistribution[star] || 0;
                                            const pct = classStats.feedbackCount > 0 ? Math.round((count / classStats.feedbackCount) * 100) : 0;
                                            return (
                                                <div key={star} className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-amber-400 w-4 text-right">{star}★</span>
                                                    <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                                        <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400 w-8 text-right">{count}명</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* 등급별 신청 분포 */}
                            {Object.keys(classStats.gradeBreakdown).length > 0 && (
                                <div className="bg-white border border-[var(--moca-border)] rounded-[24px] p-6 shadow-sm">
                                    <h4 className="font-black text-[var(--moca-text)] mb-4 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-400">workspace_premium</span>
                                        등급별 신청 분포
                                    </h4>
                                    <div className="space-y-3">
                                        {Object.entries(classStats.gradeBreakdown).sort((a, b) => b[1] - a[1]).map(([grade, count]) => {
                                            const pct = classStats.totalApplicants > 0 ? Math.round((count / classStats.totalApplicants) * 100) : 0;
                                            return (
                                                <div key={grade} className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-slate-600 w-28 truncate">{grade}</span>
                                                    <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                        <div className="bg-indigo-400 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400 w-12 text-right">{count}명 ({pct}%)</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-16 text-center bg-white border border-[var(--moca-border)] rounded-[28px]">
                            <p className="text-slate-400 font-black">통계 데이터를 불러올 수 없습니다</p>
                        </div>
                    )}
                </div>
            )}

            {/* 승인 문자 발송 모달 */}
            {approveModal.isOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white border border-slate-200 rounded-[32px] w-full max-w-xl overflow-hidden shadow-2xl p-8 max-h-[90vh] flex flex-col mx-4 animate-scaleUp">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">sms</span>
                                승인 및 문자 발송 설정
                            </h3>
                            <button onClick={() => setApproveModal({ isOpen: false, app: null, type: 'option1', messageText: '' })} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                <p className="text-xs text-indigo-500 font-black uppercase tracking-wider mb-1">수강 신청자 정보</p>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-black text-slate-800">
                                        {approveModal.app?.users?.name || approveModal.app?.users?.nickname || '회원'} 
                                        <span className="text-xs text-slate-500 font-bold ml-1.5">({approveModal.app?.users?.phone || approveModal.app?.user_phone || '-'})</span>
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black">{getApplicantGrade(approveModal.app)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 mb-3 uppercase tracking-wider">참가비 표시 방식 선택</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button type="button" onClick={() => { const nextType = 'option1'; setApproveModal(prev => ({ ...prev, type: nextType, messageText: getApproveMessage(prev.app, nextType) })); }} className={`p-4 rounded-2xl border-2 text-left transition-all ${approveModal.type === 'option1' ? 'border-indigo-500 bg-indigo-50/20 text-indigo-950 font-black' : 'border-slate-200 hover:border-slate-300 text-slate-600 font-bold'}`}>
                                        <p className="text-xs font-black text-indigo-500 mb-1">시안 1 (개별 금액)</p>
                                        <p className="text-sm">실제 결제 금액 표시</p>
                                    </button>
                                    <button type="button" onClick={() => { const nextType = 'option2'; setApproveModal(prev => ({ ...prev, type: nextType, messageText: getApproveMessage(prev.app, nextType) })); }} className={`p-4 rounded-2xl border-2 text-left transition-all ${approveModal.type === 'option2' ? 'border-indigo-500 bg-indigo-50/20 text-indigo-950 font-black' : 'border-slate-200 hover:border-slate-300 text-slate-600 font-bold'}`}>
                                        <p className="text-xs font-black text-indigo-500 mb-1">시안 2 (대표 문구)</p>
                                        <p className="text-sm">클래스 대표 문구 표시</p>
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">발송 문자 내용 (수정 가능)</label>
                                    <span className="text-[10px] text-slate-400 font-bold">수동으로 내용을 직접 수정할 수 있습니다.</span>
                                </div>
                                <textarea value={approveModal.messageText} onChange={(e) => setApproveModal(prev => ({ ...prev, messageText: e.target.value }))} rows={8} className="w-full bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-2xl px-4 py-3 text-xs font-bold transition-all outline-none resize-none leading-relaxed focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20" />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex gap-3 mt-4">
                            <button type="button" onClick={() => setApproveModal({ isOpen: false, app: null, type: 'option1', messageText: '' })} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-2xl transition-all">취소</button>
                            <button type="button" onClick={handleConfirmApprove} disabled={isSubmitting} className="flex-1 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-sm rounded-2xl transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />처리 중...</> : <><span className="material-symbols-outlined text-[16px]">send</span>승인 및 문자 발송</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminClasses;
