import React, { useState, useEffect, useRef } from 'react';
import { fetchClasses, createClass, deleteClass, fetchApplications, updatePaymentStatus, sendClassApplicationNotification } from '../services/classService';
import { supabase } from '../services/supabaseClient';

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

    const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); };
    const clear = () => { setPreview(''); onChange(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

    return (
        <div>
            <label className="block text-sm font-black text-[var(--moca-text-2)] mb-2">클래스 포스터 이미지</label>
            <div className="flex gap-3 items-start">
                <div className="relative w-24 h-32 rounded-xl overflow-hidden bg-indigo-50 border border-[var(--moca-border)] flex-shrink-0 flex items-center justify-center">
                    {preview ? (
                        <>
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={clear} className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center hover:text-red-400">
                                <span className="material-symbols-outlined text-white text-[12px]">close</span>
                            </button>
                        </>
                    ) : <span className="material-symbols-outlined text-indigo-200 text-[40px]">image</span>}
                    {uploading && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" /></div>}
                </div>
                <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`flex-1 h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all
                        ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-[var(--moca-border)] bg-gray-50 hover:border-indigo-400/50'}
                        ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                >
                    <span className="material-symbols-outlined text-indigo-400 text-3xl">cloud_upload</span>
                    <p className="text-[var(--moca-text-3)] text-[11px] font-black">{uploading ? '업로드 중...' : '클릭하거나 드래그해서 업로드'}</p>
                    <p className="text-[var(--moca-text-3)] text-[10px]">JPG · PNG · WEBP · 최대 10MB</p>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                </div>
            </div>
        </div>
    );
};

const AdminClasses = () => {
    const [view, setView] = useState('list'); // 'list', 'create', 'applicants'
    const [classes, setClasses] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [error, setError] = useState('');

    // 생성용 폼 상태
    const [newClass, setNewClass] = useState({
        title: '',
        description: '',
        class_date: '',
        location: '',
        capacity: 20,
        image_url: ''
    });
    const [formError, setFormError] = useState('');
    // 등급별 가격 상태
    const [pricing, setPricing] = useState({
        SILVER: 50000,
        GOLD: 30000,
        VIP: 10000
    });

    useEffect(() => {
        loadClasses();
    }, []);

    const loadClasses = async () => {
        setLoading(true);
        const { data, error } = await fetchClasses();
        if (data) setClasses(data);
        if (error) setError(error.message);
        setLoading(false);
    };

    const handleCreateClass = async (e) => {
        e.preventDefault();
        setFormError('');
        setIsSubmitting(true);
        const { error } = await createClass(newClass, pricing);
        if (error) {
            setFormError(error.message || JSON.stringify(error));
        } else {
            setSuccessMsg('✅ 클래스가 성공적으로 개설되었습니다!');
            setView('list');
            loadClasses();
            // Reset form
            setNewClass({ title: '', description: '', class_date: '', location: '', capacity: 20, image_url: '' });
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
        if (error) setError(error.message);
        setLoading(false);
    };

    const handleUpdatePayment = async (appId, status) => {
        if (!window.confirm(`${status === 'paid' ? '입금 확인' : '대기 처리'} 하시겠습니까?`)) return;
        const { error } = await updatePaymentStatus(appId, status);
        if (error) {
            setError(error.message);
        } else {
            setApplicants(prev => prev.map(a => a.id === appId ? { ...a, payment_status: status } : a));
            setSuccessMsg('✅ 결제 상태가 업데이트되었습니다.');
            setTimeout(() => setSuccessMsg(''), 3000);

            // 승인 시 클래스 신청 완료 알림톡 자동 발송
            if (status === 'paid' && selectedClass) {
                const app = applicants.find(a => a.id === appId);
                if (app?.users?.phone) {
                    sendClassApplicationNotification({
                        userName:   app.users.name || app.users.nickname || '회원',
                        phone:      app.users.phone,
                        classTitle: selectedClass.title,
                        classDate:  selectedClass.class_date,
                        location:   selectedClass.location,
                        paidPrice:  app.applied_price || 0,
                    })
                        .then(() => console.log('클래스 확정 알림톡 발송 완료'))
                        .catch(err => console.error('알림톡 발송 오류:', err));
                }
            }
        }
    };

    const handleDeleteClass = async (id) => {
        if (!window.confirm('정말 이 클래스를 삭제하시겠습니까? 관련 신청 데이터도 모두 삭제될 수 있습니다.')) return;
        const { error } = await deleteClass(id);
        if (error) {
            setError(error.message);
        } else {
            setClasses(prev => prev.filter(c => c.id !== id));
            setSuccessMsg('✅ 클래스가 삭제되었습니다.');
            setTimeout(() => setSuccessMsg(''), 3000);
        }
    };

    const GRADE_EMOJI = { SILVER: '🥈', GOLD: '🌟', VIP: '👑' };

    return (
        <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-indigo-500 text-3xl">school</span>
                    <div>
                        <h2 className="text-2xl font-black text-[var(--moca-text)]">모카 클래스 관리</h2>
                        <p className="text-[var(--moca-text-3)] text-sm mt-1">모카 전문 강사진의 클래스를 오픈하고 신청자를 관리합니다.</p>
                    </div>
                </div>
                {view === 'list' ? (
                    <button
                        onClick={() => setView('create')}
                        className="flex items-center gap-2 bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-indigo-600 transition-all shadow-lg"
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        새 클래스 개설
                    </button>
                ) : (
                    <button
                        onClick={() => { setView('list'); setSelectedClass(null); }}
                        className="text-sm font-bold text-[var(--moca-text-3)] hover:text-[var(--moca-text)] transition-colors flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                        목록으로 돌아가기
                    </button>
                )}
            </div>

            {successMsg && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl mb-6 font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    {successMsg}
                </div>
            )}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-6 font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">error</span>
                    {error}
                </div>
            )}

            {/* 목록 뷰 */}
            {view === 'list' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loading ? (
                        <div className="col-span-full py-20 text-center text-[var(--moca-text-3)]">데이터를 불러오는 중...</div>
                    ) : classes.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-[var(--moca-text-3)] border border-dashed border-[var(--moca-border)] rounded-2xl">
                            <span className="material-symbols-outlined text-6xl mb-4 block">event_busy</span>
                            <p className="font-bold">개설된 클래스가 없습니다.</p>
                        </div>
                    ) : (
                        classes.map(cls => (
                            <div key={cls.id} className="bg-white border border-[var(--moca-border)] rounded-2xl overflow-hidden hover:shadow-xl transition-all group">
                                {cls.image_url ? (
                                    <div className="aspect-video w-full bg-gray-100 relative overflow-hidden">
                                        <img src={cls.image_url} alt={cls.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                ) : (
                                    <div className="aspect-video w-full bg-indigo-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[var(--moca-primary)] text-5xl opacity-30">school</span>
                                    </div>
                                )}
                                <div className="p-5">
                                    <h3 className="text-lg font-black text-[var(--moca-text)] mb-2 line-clamp-1">{cls.title}</h3>
                                    <div className="space-y-1.5 mb-4 text-xs text-[var(--moca-text-3)]">
                                        <p className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                            {cls.class_date}
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">location_on</span>
                                            {cls.location}
                                        </p>
                                        <p className="flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-[14px]">group</span>
                                            정원 {cls.capacity}명
                                        </p>
                                    </div>

                                    {/* 등급별 가격 요약 */}
                                    <div className="bg-[var(--moca-surface-2)] rounded-xl p-3 mb-4 grid grid-cols-3 gap-1 text-center">
                                        {cls.class_pricing?.map(p => (
                                            <div key={p.id}>
                                                <p className="text-[10px] font-bold text-[var(--moca-text-3)]">{p.grade}</p>
                                                <p className="text-[11px] font-black text-indigo-500">{p.price.toLocaleString()}원</p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewApplicants(cls)}
                                            className="flex-1 bg-indigo-500/10 text-indigo-500 border border-indigo-500/30 font-bold py-2 rounded-lg text-sm hover:bg-indigo-500 hover:text-white transition-all"
                                        >
                                            신청자 관리
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClass(cls.id)}
                                            className="px-3 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* 생성 뷰 */}
            {view === 'create' && (
                <div className="max-w-3xl mx-auto bg-white border border-[var(--moca-border)] rounded-2xl p-8 shadow-2xl">
                    <h3 className="text-xl font-black text-[var(--moca-text)] mb-6">새 클래스 만들기</h3>
                    <form onSubmit={handleCreateClass} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-full">
                                <label className="block text-sm font-black text-[var(--moca-text-2)] mb-2">클래스 제목</label>
                                <input
                                    type="text"
                                    required
                                    value={newClass.title}
                                    onChange={e => setNewClass({ ...newClass, title: e.target.value })}
                                    placeholder="예: 원데이 프로필 영상 촬영 워크숍"
                                    className="w-full bg-[var(--moca-bg)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-[var(--moca-text-2)] mb-2">날짜 및 시간</label>
                                <input
                                    type="text"
                                    required
                                    value={newClass.class_date}
                                    onChange={e => setNewClass({ ...newClass, class_date: e.target.value })}
                                    placeholder="예: 4월 15일(토) 14:00"
                                    className="w-full bg-[var(--moca-bg)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-[var(--moca-text-2)] mb-2">장소</label>
                                <input
                                    type="text"
                                    required
                                    value={newClass.location}
                                    onChange={e => setNewClass({ ...newClass, location: e.target.value })}
                                    placeholder="예: MOCA 강남 스튜디오"
                                    className="w-full bg-[var(--moca-bg)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-black text-[var(--moca-text-2)] mb-2">정원 (명)</label>
                                <input
                                    type="number"
                                    required
                                    value={newClass.capacity}
                                    onChange={e => setNewClass({ ...newClass, capacity: e.target.value })}
                                    className="w-full bg-[var(--moca-bg)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="col-span-full">
                                <ClassPosterUploader
                                    value={newClass.image_url}
                                    onChange={(url) => setNewClass(prev => ({ ...prev, image_url: url }))}
                                    onError={(msg) => setFormError(msg)}
                                />
                            </div>
                            {formError && (
                                <div className="col-span-full text-red-500 text-sm font-bold bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</div>
                            )}
                        </div>

                        <div className="border-t border-[var(--moca-border)] pt-6">
                            <h4 className="font-black text-[var(--moca-text)] mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-500">payments</span>
                                등급별 참가비 설정
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {['SILVER', 'GOLD', 'VIP'].map(grade => (
                                    <div key={grade}>
                                        <label className="block text-xs font-bold text-[var(--moca-text-3)] mb-1.5">{GRADE_EMOJI[grade]} {grade} 회원</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                required
                                                value={pricing[grade]}
                                                onChange={e => setPricing({ ...pricing, [grade]: e.target.value })}
                                                className="w-full bg-[var(--moca-bg)] border border-[var(--moca-border)] rounded-xl pl-4 pr-10 py-3 text-sm font-black focus:outline-none focus:border-indigo-500"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--moca-text-3)] font-bold">원</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="col-span-full">
                            <label className="block text-sm font-black text-[var(--moca-text-2)] mb-2">상세 설명</label>
                            <textarea
                                value={newClass.description}
                                onChange={e => setNewClass({ ...newClass, description: e.target.value })}
                                rows={6}
                                placeholder="프로그램 내용, 준비물, 주의사항 등을 적어주세요."
                                className="w-full bg-[var(--moca-bg)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-indigo-500 text-white font-black py-4 rounded-2xl hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50"
                        >
                            {isSubmitting ? '개설하는 중...' : '클래스 개설 완료'}
                        </button>
                    </form>
                </div>
            )}

            {/* 신청자 뷰 */}
            {view === 'applicants' && selectedClass && (
                <div className="bg-white border border-[var(--moca-border)] rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-indigo-500 text-white px-8 py-6">
                        <h3 className="text-xl font-black mb-1">{selectedClass.title}</h3>
                        <p className="text-indigo-100 text-sm">{selectedClass.class_date} · 신청자 현황</p>
                    </div>

                    <div className="p-8">
                        {loading ? (
                            <div className="text-center py-12 text-[var(--moca-text-3)]">신청자 목록을 불러오는 중...</div>
                        ) : applicants.length === 0 ? (
                            <div className="text-center py-12 text-[var(--moca-text-3)]">
                                <span className="material-symbols-outlined text-4xl mb-2 block">person_off</span>
                                <p>아직 신청자가 없습니다.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--moca-border)] text-[var(--moca-text-3)] uppercase tracking-wider">
                                            <th className="px-4 py-3 text-left">닉네임/이름</th>
                                            <th className="px-4 py-3 text-left">연락처</th>
                                            <th className="px-4 py-3 text-center">등급</th>
                                            <th className="px-4 py-3 text-right">결제금액</th>
                                            <th className="px-4 py-3 text-center">결제상태</th>
                                            <th className="px-4 py-3 text-center">신청일</th>
                                            <th className="px-4 py-3 text-center">관리</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--moca-border)]">
                                        {applicants.map(app => (
                                            <tr key={app.id} className="hover:bg-[var(--moca-primary-lt)]/30 transition-colors">
                                                <td className="px-4 py-4 font-bold text-[var(--moca-text)]">
                                                    {app.users?.name || app.users?.nickname}
                                                    <span className="block text-[11px] font-normal text-[var(--moca-text-3)]">@{app.users?.nickname}</span>
                                                </td>
                                                <td className="px-4 py-4 text-[var(--moca-text-2)]">{app.users?.phone}</td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className="px-2 py-1 rounded-lg bg-[var(--moca-surface-2)] text-[10px] font-black border border-[var(--moca-border)]">
                                                        {GRADE_EMOJI[app.user_grade]} {app.user_grade}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right font-black text-indigo-500">
                                                    {app.applied_price?.toLocaleString()}원
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                                                        app.payment_status === 'paid' 
                                                            ? 'bg-green-500/10 text-green-500 border border-green-500/30' 
                                                            : app.payment_status === 'pending_card'
                                                                ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/30'
                                                                : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30'
                                                    }`}>
                                                        {app.payment_status === 'paid' ? '입금확인' : app.payment_status === 'pending_card' ? '카드결제대기' : '무통장대기'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-center text-[var(--moca-text-3)] text-[11px]">
                                                    {new Date(app.created_at).toLocaleDateString('ko-KR')}
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    {app.payment_status === 'paid' ? (
                                                        <button
                                                            onClick={() => handleUpdatePayment(app.id, 'pending')}
                                                            className="px-3 py-1 bg-gray-100 text-[var(--moca-text-3)] text-[11px] font-black rounded-lg hover:bg-gray-200 transition-all"
                                                        >
                                                            대기처리
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUpdatePayment(app.id, 'paid')}
                                                            className="px-3 py-1 bg-green-500 text-white text-[11px] font-black rounded-lg hover:bg-green-600 transition-all"
                                                        >
                                                            입금확인
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminClasses;
