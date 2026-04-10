import React, { useState, useEffect, useRef } from 'react';
import { fetchClasses, createClass, updateClass, deleteClass, fetchApplications, updatePaymentStatus, sendClassApplicationNotification } from '../services/classService';
import { supabase } from '../services/supabaseClient';
import { sendBulkMessage } from '../services/aligoService';

const CLASS_BUCKET = 'class-images';
const MAX_FILE_MB = 10;

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

    const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

    // 생성용 폼 상태
    const [newClass, setNewClass] = useState({
        title: '',
        description: '',
        location: '',
        capacity: 20,
        image_url: '',
        schedule_type: 'one_time',
        class_date: '',
        start_date: '',
        end_date: '',
        day_of_week: [],
        start_time: '14:00'
    });

    const [pricing, setPricing] = useState([
        { grade_label: '🥈 SILVER', price: 50000 },
        { grade_label: '🌟 GOLD', price: 30000 },
        { grade_label: '👑 전속모델', price: 10000 }
    ]);

    const [formError, setFormError] = useState('');

    useEffect(() => { loadClasses(); }, []);

    const loadClasses = async () => {
        setLoading(true);
        const { data, error } = await fetchClasses();
        if (data) setClasses(data);
        if (error) setError(error.message);
        setLoading(false);
    };

    const resetForm = () => {
        setNewClass({ title: '', description: '', location: '', capacity: 20, image_url: '', schedule_type: 'one_time', class_date: '', start_date: '', end_date: '', day_of_week: [], start_time: '14:00' });
        setPricing([{ grade_label: '🥈 SILVER', price: 50000 }, { grade_label: '🌟 GOLD', price: 30000 }, { grade_label: '👑 전속모델', price: 10000 }]);
        setFormError('');
        setEditingClassId(null);
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setFormError('');
        setIsSubmitting(true);

        // 정기 클래스의 경우 class_date 자동 생성 시도
        let finalClassDate = newClass.class_date;
        if (newClass.schedule_type === 'weekly' && newClass.day_of_week.length > 0) {
            const daysStr = newClass.day_of_week.map(d => DAYS[d]).join(',');
            finalClassDate = `매주 ${daysStr} ${newClass.start_time}`;
        }

        if (editingClassId) {
            const { error } = await updateClass(editingClassId, { ...newClass, class_date: finalClassDate }, pricing);
            if (error) {
                setFormError(error.message);
            } else {
                setSuccessMsg('✅ 클래스가 성공적으로 수정되었습니다!');
                setView('list');
                loadClasses();
                resetForm();
            }
        } else {
            const { error } = await createClass({ ...newClass, class_date: finalClassDate }, pricing);
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

    const BANK_INFO = '카카오뱅크 3333-34-9903852 (아임모델 김대희)';

    // 승인 + 문자 발송
    const handleApprove = async (app) => {
        const blogpayUrl = window.prompt(
            `[${app.users?.name || app.users?.nickname}] 승인 처리\n\n블로그페이 카드결제 링크를 입력하세요.\n(없으면 빈칸으로 확인 클릭 → 무통장 안내만 발송)`,
            ''
        );
        if (blogpayUrl === null) return; // 취소

        setIsSubmitting(true);
        try {
            // DB 상태 업데이트
            const { error: updateErr } = await supabase
                .from('class_applications')
                .update({
                    approval_status: 'approved',
                    payment_status: 'pending',
                    blogpay_url: blogpayUrl || null,
                    approved_at: new Date().toISOString(),
                })
                .eq('id', app.id);
            if (updateErr) throw updateErr;

            // 문자 메시지 구성
            const name = app.users?.name || app.users?.nickname || '회원';
            const phone = (app.users?.phone || app.user_phone || '').replace(/-/g, '');
            const price = (app.applied_price || 0).toLocaleString();
            const classTitle = selectedClass?.title || '클래스';
            const classDate = selectedClass?.class_date || '';

            let msg = `[아임모델 MOCA] 수강 신청 승인 안내\n\n안녕하세요, ${name}님!\n${classTitle} 수강 신청이 승인되었습니다.\n\n💰 수강료: ${price}원\n\n[무통장 입금]\n${BANK_INFO}\n입금 후 담당자가 확정 안내 드립니다.`;

            if (blogpayUrl) {
                msg += `\n\n[카드결제]\n${blogpayUrl}`;
            }

            msg += `\n\n문의: 카카오채널 @아임모델MOCA`;

            if (phone) {
                await sendBulkMessage([phone], msg, 'sms');
            }

            setApplicants(prev => prev.map(a =>
                a.id === app.id ? { ...a, approval_status: 'approved', blogpay_url: blogpayUrl } : a
            ));
            setSuccessMsg(`✅ ${name}님 승인 완료 + 문자 발송 성공!`);
        } catch (err) {
            alert('승인 처리 중 오류: ' + (err.message || JSON.stringify(err)));
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setSuccessMsg(''), 4000);
        }
    };

    // 결제 확인 처리
    const handleConfirmPayment = async (app) => {
        if (!window.confirm(`[${app.users?.name || app.users?.nickname}] 입금 확인 처리 하시겠습니까?`)) return;
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
                const msg = `[아임모델 MOCA] 수강 확정 안내\n\n${name}님 입금 확인 완료!\n${classTitle} 수강이 최종 확정되었습니다.\n\n수업 당일 뵙겠습니다 😊`;
                await sendBulkMessage([phone], msg, 'sms').catch(console.error);
            }

            setApplicants(prev => prev.map(a =>
                a.id === app.id ? { ...a, approval_status: 'paid', payment_status: 'paid' } : a
            ));
            setSuccessMsg(`✅ ${name}님 입금 확인 완료!`);
        } catch (err) {
            alert('오류: ' + err.message);
        } finally {
            setIsSubmitting(false);
            setTimeout(() => setSuccessMsg(''), 4000);
        }
    };

    // 취소 처리
    const handleCancelApplication = async (app) => {
        if (!window.confirm(`[${app.users?.name || app.users?.nickname}] 취소 처리하시겠습니까?`)) return;
        const { error } = await supabase
            .from('class_applications')
            .update({ approval_status: 'cancelled', payment_status: 'cancelled' })
            .eq('id', app.id);
        if (!error) {
            setApplicants(prev => prev.map(a =>
                a.id === app.id ? { ...a, approval_status: 'cancelled', payment_status: 'cancelled' } : a
            ));
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

    const addPrice = () => {
        if (pricing.length >= 5) return;
        setPricing([...pricing, { grade_label: '새 등급', price: 0 }]);
    };

    const removePrice = (idx) => {
        setPricing(pricing.filter((_, i) => i !== idx));
    };

    const updatePrice = (idx, field, value) => {
        const next = [...pricing];
        next[idx][field] = value;
        setPricing(next);
    };

    const handleDownloadExcel = () => {
        if (!selectedClass || applicants.length === 0) {
            alert('다운로드할 신청자 데이터가 없습니다.');
            return;
        }

        const headers = ['번호', '이름', '연락처', '멤버등급', '수강금액(원)', '결제상태', '결제수단'];
        const rows = applicants.map((app, idx) => [
            applicants.length - idx,
            app.users?.name || app.users?.nickname || '-',
            app.users?.phone || '-',
            app.grade_label || app.users?.grade || 'SILVER',
            app.applied_price?.toLocaleString() || '0',
            app.payment_status === 'paid' ? '승인완료' : '입금대기',
            app.payment_type || '-'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

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
                        닫기
                    </button>
                )}
            </div>

            {/* Notification Area */}
            {successMsg && <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-[var(--moca-text)] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-2xl animate-bounce-short">{successMsg}</div>}

            {view === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {loading ? (
                        [1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-white border border-[var(--moca-border)] animate-pulse" />)
                    ) : classes.length === 0 ? (
                        <div className="col-span-full py-24 text-center border-2 border-dashed border-[var(--moca-border)] rounded-[40px] bg-white/50">
                            <span className="material-symbols-outlined text-6xl text-indigo-200 mb-4 block">explore_off</span>
                            <p className="text-[var(--moca-text-3)] font-black text-lg">아직 개설된 클래스가 없습니다</p>
                            <p className="text-[var(--moca-text-3)] text-sm opacity-60 mt-1">지금 바로 첫 클래스를 만들어보세요</p>
                            <button onClick={() => setView('create')} className="mt-6 text-indigo-500 font-black text-sm hover:underline underline-offset-4">클래스 개설 시작하기 →</button>
                        </div>
                    ) : (
                        classes.map(cls => (
                            <div key={cls.id} className="group bg-white border border-[var(--moca-border)] rounded-[32px] overflow-hidden hover:shadow-2xl hover:shadow-indigo-500/10 transition-all flex flex-col h-full active:scale-[0.995]">
                                <div className="aspect-[16/10] bg-gray-50 relative overflow-hidden">
                                    {cls.image_url ? (
                                        <img src={cls.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-indigo-50/50">
                                            <span className="material-symbols-outlined text-indigo-200 text-5xl">auto_stories</span>
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border backdrop-blur-md ${cls.schedule_type === 'weekly' ? 'bg-indigo-500/80 text-white border-white/20' : 'bg-white/80 text-[var(--moca-text)] border-[var(--moca-border)]'}`}>
                                            {cls.schedule_type === 'weekly' ? '정기강좌' : '원데이'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-black text-[var(--moca-text)] line-clamp-1 mb-3">{cls.title}</h3>
                                        <div className="space-y-2 mb-6">
                                            <div className="flex items-center gap-2 text-xs text-[var(--moca-text-2)] font-bold">
                                                <span className="material-symbols-outlined text-[16px] text-indigo-400">event</span>
                                                {cls.class_date}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-[var(--moca-text-3)] font-bold">
                                                <span className="material-symbols-outlined text-[16px] text-indigo-300">location_on</span>
                                                {cls.location}
                                            </div>
                                        </div>
                                        {/* Pricing Summary */}
                                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-dashed border-[var(--moca-border)] mb-6">
                                            {cls.class_pricing?.slice(0, 3).map((p, idx) => (
                                                <div key={idx} className="text-center">
                                                    <p className="text-[9px] font-black text-[var(--moca-text-3)] mb-0.5 truncate uppercase opacity-60">{p.grade_label.replace(/[🥈🌟👑\s]/g, '')}</p>
                                                    <p className="text-[11px] font-black text-indigo-600">₩{p.price.toLocaleString()}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewApplicants(cls)}
                                            className="flex-1 bg-indigo-50 text-indigo-600 font-black py-3 rounded-2xl text-[13px] hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                                        >
                                            신청 관리
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingClassId(cls.id);
                                                setNewClass({
                                                    title: cls.title || '',
                                                    description: cls.description || '',
                                                    location: cls.location || '',
                                                    capacity: cls.capacity || 20,
                                                    image_url: cls.image_url || '',
                                                    schedule_type: cls.schedule_type || 'one_time',
                                                    class_date: cls.class_date || '',
                                                    start_date: cls.start_date || '',
                                                    end_date: cls.end_date || '',
                                                    day_of_week: cls.day_of_week || [],
                                                    start_time: cls.start_time || '14:00'
                                                });
                                                setPricing(cls.class_pricing && cls.class_pricing.length > 0 ? cls.class_pricing.map(p => ({
                                                    grade_label: p.grade_label,
                                                    price: p.price
                                                })) : [{ grade_label: '🥈 SILVER', price: 50000 }, { grade_label: '🌟 GOLD', price: 30000 }, { grade_label: '👑 전속모델', price: 10000 }]);
                                                setView('create');
                                            }}
                                            className="w-[50px] flex flex-col items-center justify-center rounded-2xl border border-[var(--moca-border)] text-[var(--moca-text-3)] hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all font-bold"
                                        >
                                            <span className="material-symbols-outlined text-[18px] mb-0.5">edit</span>
                                            <span className="text-[9px]">수정</span>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClass(cls.id)}
                                            className="w-[50px] flex flex-col items-center justify-center rounded-2xl border border-[var(--moca-border)] text-[var(--moca-text-3)] hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-all font-bold"
                                        >
                                            <span className="material-symbols-outlined text-[18px] mb-0.5">delete_sweep</span>
                                            <span className="text-[9px]">삭제</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {view === 'create' && (
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-2xl">
                        <div className="p-8 lg:p-12">
                            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                                <span className="w-2 h-8 bg-moca-primary rounded-full" />
                                클래스 설정 {editingClassId ? '(수정)' : '(개설)'}
                            </h3>

                            <form onSubmit={handleCreateClass} className="space-y-10">
                                {/* Basic Info */}
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-black text-slate-700 mb-3">클래스 제목</label>
                                            <input
                                                type="text" required
                                                value={newClass.title} onChange={e => setNewClass({ ...newClass, title: e.target.value })}
                                                placeholder="예: 실전 광고 모델 워크숍 1기"
                                                className="w-full bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold transition-all outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-black text-slate-700 mb-3">스케줄 유형</label>
                                            <div className="bg-slate-50 p-1.5 rounded-2xl flex gap-1 border border-slate-200">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewClass({ ...newClass, schedule_type: 'one_time' })}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${newClass.schedule_type === 'one_time' ? 'bg-white shadow-sm text-moca-primary' : 'text-slate-500 hover:text-slate-800'}`}
                                                >단발성 (One-Day)</button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewClass({ ...newClass, schedule_type: 'weekly' })}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${newClass.schedule_type === 'weekly' ? 'bg-white shadow-sm text-moca-primary' : 'text-slate-500 hover:text-slate-800'}`}
                                                >정기 (Weekly)</button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-black text-slate-700 mb-3">강의 장소</label>
                                            <input
                                                type="text" required
                                                value={newClass.location} onChange={e => setNewClass({ ...newClass, location: e.target.value })}
                                                placeholder="예: 당산 연기 스튜디오"
                                                className="w-full bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold transition-all outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20"
                                            />
                                        </div>
                                    </div>

                                    {/* Schedule Details */}
                                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-6">
                                        {newClass.schedule_type === 'one_time' ? (
                                            <div>
                                                <label className="block text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">날짜/시간 입력</label>
                                                <div className="flex gap-4 items-center">
                                                    <input
                                                        type="text" required
                                                        value={newClass.class_date} onChange={e => setNewClass({ ...newClass, class_date: e.target.value })}
                                                        placeholder="예: 4월 25일(토) 14:00"
                                                        className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">강의 요일 선택 (중복 가능)</label>
                                                    <div className="flex gap-2">
                                                        {DAYS.map((d, i) => (
                                                            <button
                                                                key={d} type="button" onClick={() => toggleDay(i)}
                                                                className={`w-10 h-10 rounded-xl font-black text-xs border transition-all ${newClass.day_of_week.includes(i) ? 'bg-moca-primary text-white border-moca-primary shadow-md shadow-moca-primary/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                                            >{d}</button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                                    <div className="col-span-full lg:col-span-1">
                                                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">시작 시간</label>
                                                        <input
                                                            type="time" value={newClass.start_time} onChange={e => setNewClass({ ...newClass, start_time: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">시작일</label>
                                                        <input
                                                            type="date" value={newClass.start_date} onChange={e => setNewClass({ ...newClass, start_date: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">종료일 (선택)</label>
                                                        <input
                                                            type="date" value={newClass.end_date} onChange={e => setNewClass({ ...newClass, end_date: e.target.value })}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="pt-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">수강 정원</label>
                                                <span className="text-sm font-black text-moca-primary">{newClass.capacity}명</span>
                                            </div>
                                            <input
                                                type="range" min="1" max="100"
                                                value={newClass.capacity} onChange={e => setNewClass({ ...newClass, capacity: e.target.value })}
                                                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-moca-primary"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Poster & Pricing */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <ClassPosterUploader
                                        value={newClass.image_url}
                                        onChange={url => setNewClass({ ...newClass, image_url: url })}
                                        onError={setFormError}
                                    />

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-black text-slate-700">수강료 설정 (최대 5개)</label>
                                            <button type="button" onClick={addPrice} disabled={pricing.length >= 5} className="text-xs font-black text-moca-primary hover:underline disabled:opacity-30">+ 추가</button>
                                        </div>
                                        <div className="space-y-3">
                                            {pricing.map((p, i) => (
                                                <div key={i} className="flex gap-2 items-center group animate-fadeIn">
                                                    <input
                                                        type="text" value={p.grade_label} onChange={e => updatePrice(i, 'grade_label', e.target.value)}
                                                        className="w-1/3 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-black focus:outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20"
                                                        placeholder="회원 등급명"
                                                    />
                                                    <div className="flex-1 relative">
                                                        <input
                                                            type="number" value={p.price} onChange={e => updatePrice(i, 'price', e.target.value)}
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-[11px] font-black focus:outline-none focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20"
                                                            placeholder="60,000"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-black">원</span>
                                                    </div>
                                                    {pricing.length > 1 && (
                                                        <button type="button" onClick={() => removePrice(i)} className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="material-symbols-outlined text-[18px]">remove_circle_outline</span>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Description */}
                                <div>
                                    <label className="block text-sm font-black text-slate-700 mb-3">상세 내용 및 소개</label>
                                    <textarea
                                        value={newClass.description} onChange={e => setNewClass({ ...newClass, description: e.target.value })}
                                        rows={8} placeholder="클래스의 상세 커리큘럼, 준비물, 환불 규정 등을 설명해주세요."
                                        className="w-full bg-slate-50 border-2 border-slate-200 focus:bg-white rounded-[28px] px-6 py-5 text-sm font-medium transition-all outline-none resize-none leading-relaxed focus:border-moca-primary focus:ring-1 focus:ring-moca-primary/20"
                                    />
                                </div>

                                {formError && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-3 rounded-2xl border border-red-100">{formError}</p>}

                                <div className="pt-6">
                                    <button
                                        type="submit" disabled={isSubmitting}
                                        className="w-full bg-moca-primary text-white font-black py-5 rounded-[28px] text-[15px] shadow-2xl hover:bg-moca-primary-2 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                                    >{isSubmitting ? '클래스를 준비하는 중...' : '클래스 개설 완료하기'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {view === 'applicants' && selectedClass && (
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white border border-[var(--moca-border)] rounded-[40px] overflow-hidden shadow-2xl">
                        {/* Header Stats */}
                        <div className="bg-[var(--moca-text)] p-8 lg:p-12 text-white flex flex-col md:flex-row md:items-end justify-between gap-8">
                            <div className="max-w-xl">
                                <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-[10px] font-black border border-white/20 mb-3 tracking-widest uppercase">Class Dashboard</span>
                                <h3 className="text-2xl font-black mb-2 leading-tight">{selectedClass.title}</h3>
                                <p className="text-white/60 text-sm font-bold flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                                    {selectedClass.class_date}
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleDownloadExcel}
                                    className="flex items-center gap-2 bg-green-500 text-white px-5 py-3 rounded-2xl font-black text-sm hover:bg-green-600 transition-all shadow-lg shadow-green-500/20"
                                >
                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                    Excel 다운로드
                                </button>
                                <div className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center min-w-[90px]">
                                    <p className="text-[10px] font-black text-white/40 mb-1 uppercase tracking-tighter">신청</p>
                                    <p className="text-xl font-black">{applicants.length}명</p>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl text-center min-w-[90px]">
                                    <p className="text-[10px] font-black text-amber-400/60 mb-1 uppercase tracking-tighter">승인</p>
                                    <p className="text-xl font-black text-amber-400">{applicants.filter(a => a.approval_status === 'approved').length}명</p>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-3xl text-center min-w-[90px]">
                                    <p className="text-[10px] font-black text-green-400/60 mb-1 uppercase tracking-tighter">결제완료</p>
                                    <p className="text-xl font-black text-green-400">{applicants.filter(a => a.approval_status === 'paid').length}명</p>
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
                                            <th className="px-4 py-5 text-[11px] font-black text-[var(--moca-text-3)] text-right">수강료</th>
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

                                            const statusBadge = isPaid
                                                ? { label: '결제완료', cls: 'bg-green-50 text-green-600 border-green-200' }
                                                : isApproved
                                                ? { label: '승인완료', cls: 'bg-amber-50 text-amber-600 border-amber-200' }
                                                : isCancelled
                                                ? { label: '취소', cls: 'bg-red-50 text-red-500 border-red-100' }
                                                : { label: '신청대기', cls: 'bg-blue-50 text-blue-500 border-blue-100' };

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
                                                        <span className="px-2.5 py-1 rounded-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] text-[10px] font-black text-[var(--moca-text-2)] uppercase">
                                                            {app.grade_label || app.users?.grade || 'SILVER'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-5 text-right font-black text-sm text-[var(--moca-text)]">
                                                        {app.applied_price?.toLocaleString()}원
                                                    </td>
                                                    <td className="px-4 py-5 text-center">
                                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black border ${statusBadge.cls}`}>
                                                            {statusBadge.label}
                                                        </span>
                                                        {app.blogpay_url && (
                                                            <p className="text-[9px] text-indigo-400 font-bold mt-1 truncate max-w-[100px] mx-auto">
                                                                카드링크 있음
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-5">
                                                        <div className="flex justify-center gap-2">
                                                            {isPending && (
                                                                <button
                                                                    onClick={() => handleApprove(app)}
                                                                    disabled={isSubmitting}
                                                                    className="px-3 py-2 rounded-xl text-[11px] font-black bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                                                                >
                                                                    승인 + 문자발송
                                                                </button>
                                                            )}
                                                            {isApproved && (
                                                                <button
                                                                    onClick={() => handleConfirmPayment(app)}
                                                                    disabled={isSubmitting}
                                                                    className="px-3 py-2 rounded-xl text-[11px] font-black bg-green-500 text-white hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 disabled:opacity-50"
                                                                >
                                                                    입금확인
                                                                </button>
                                                            )}
                                                            {isPaid && (
                                                                <span className="px-3 py-2 rounded-xl text-[11px] font-black bg-gray-100 text-[var(--moca-text-3)]">
                                                                    완료
                                                                </span>
                                                            )}
                                                            {!isCancelled && !isPaid && (
                                                                <button
                                                                    onClick={() => handleCancelApplication(app)}
                                                                    className="px-3 py-2 rounded-xl text-[11px] font-black bg-red-50 text-red-400 hover:bg-red-100 border border-red-100 transition-all"
                                                                >
                                                                    취소
                                                                </button>
                                                            )}
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
                </div>
            )}
        </div>
    );
};

export default AdminClasses;
