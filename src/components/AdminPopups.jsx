import React, { useState, useEffect } from 'react';
import { fetchAllPopups, createPopup, updatePopup, deletePopup } from '../services/popupService';

const EMPTY_FORM = {
    title: '',
    content: '',
    image_url: '',
    link_url: '',
    is_active: true,
    start_date: '',
    end_date: '',
};

const AdminPopups = () => {
    const [popups, setPopups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    const load = async () => {
        setLoading(true);
        const data = await fetchAllPopups();
        setPopups(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const openCreate = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        setShowForm(true);
    };

    const openEdit = (popup) => {
        setEditingId(popup.id);
        setForm({
            title: popup.title || '',
            content: popup.content || '',
            image_url: popup.image_url || '',
            link_url: popup.link_url || '',
            is_active: popup.is_active ?? true,
            start_date: popup.start_date || '',
            end_date: popup.end_date || '',
        });
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!form.title.trim()) { setMsg('제목을 입력해주세요.'); return; }
        setSaving(true);
        try {
            const payload = {
                ...form,
                start_date: form.start_date || null,
                end_date: form.end_date || null,
            };
            if (editingId) {
                await updatePopup(editingId, payload);
            } else {
                await createPopup(payload);
            }
            setShowForm(false);
            setMsg(editingId ? '팝업이 수정되었습니다.' : '팝업이 생성되었습니다.');
            await load();
        } catch (e) {
            setMsg('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
            setTimeout(() => setMsg(''), 3000);
        }
    };

    const handleToggle = async (popup) => {
        await updatePopup(popup.id, { is_active: !popup.is_active });
        await load();
    };

    const handleDelete = async (popup) => {
        if (!window.confirm(`'${popup.title}' 팝업을 삭제하시겠습니까?`)) return;
        await deletePopup(popup.id);
        await load();
    };

    const handleImageFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setForm(f => ({ ...f, image_url: ev.target.result }));
        reader.readAsDataURL(file);
    };

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-white font-black text-lg">팝업 관리</h2>
                    <p className="text-white/40 text-xs mt-0.5">immoca.kr 팝업을 등록하고 관리합니다</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6C63FF] hover:bg-[#5B52E8] text-white font-bold text-sm transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    팝업 추가
                </button>
            </div>

            {/* Success/Error msg */}
            {msg && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold">
                    {msg}
                </div>
            )}

            {/* Popup list */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
                </div>
            ) : popups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <span className="material-symbols-outlined text-[48px] text-white/20">campaign</span>
                    <p className="text-white/30 text-sm">등록된 팝업이 없습니다</p>
                    <button onClick={openCreate} className="mt-2 text-[#818CF8] text-sm font-bold hover:underline">+ 첫 팝업 만들기</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {popups.map(popup => (
                        <div key={popup.id} className={`rounded-2xl border ${popup.is_active ? 'border-[#6C63FF]/30 bg-[#6C63FF]/5' : 'border-white/10 bg-white/3'} p-5 flex flex-col gap-3`}>
                            {/* Image preview */}
                            {popup.image_url && (
                                <div className="w-full h-36 rounded-xl overflow-hidden bg-white/5">
                                    <img src={popup.image_url} alt={popup.title} className="w-full h-full object-cover" />
                                </div>
                            )}
                            {/* Info */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h3 className="text-white font-black text-sm truncate">{popup.title}</h3>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${popup.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/30'}`}>
                                            {popup.is_active ? '활성' : '비활성'}
                                        </span>
                                    </div>
                                    {popup.content && <p className="text-white/40 text-xs mt-1 line-clamp-2">{popup.content}</p>}
                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        {popup.start_date && <span className="text-white/25 text-[10px]">시작: {popup.start_date}</span>}
                                        {popup.end_date && <span className="text-white/25 text-[10px]">종료: {popup.end_date}</span>}
                                        {popup.link_url && (
                                            <span className="text-[#818CF8] text-[10px] truncate max-w-[140px]">🔗 {popup.link_url}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {/* Actions */}
                            <div className="flex gap-2 mt-1">
                                <button
                                    onClick={() => handleToggle(popup)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-colors border ${popup.is_active ? 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}
                                >
                                    {popup.is_active ? '비활성화' : '활성화'}
                                </button>
                                <button
                                    onClick={() => openEdit(popup)}
                                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#6C63FF]/10 border border-[#6C63FF]/20 text-[#818CF8] hover:bg-[#6C63FF]/20 transition-colors"
                                >
                                    수정
                                </button>
                                <button
                                    onClick={() => handleDelete(popup)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create / Edit Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowForm(false)} />
                    <div className="relative z-10 w-full max-w-lg rounded-3xl bg-[#13131f] border border-white/10 overflow-y-auto max-h-[90vh] shadow-2xl">
                        <div className="p-6 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-white font-black text-base">{editingId ? '팝업 수정' : '새 팝업 만들기'}</h3>
                                <button onClick={() => setShowForm(false)} className="text-white/30 hover:text-white">
                                    <span className="material-symbols-outlined text-[22px]">close</span>
                                </button>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="text-white/50 text-xs font-bold mb-1.5 block">팝업 제목 *</label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    placeholder="예) 3월 특별 이벤트"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#6C63FF]/50"
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className="text-white/50 text-xs font-bold mb-1.5 block">팝업 내용 (선택)</label>
                                <textarea
                                    value={form.content}
                                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                                    placeholder="팝업에 표시할 설명 문구를 입력하세요"
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#6C63FF]/50 resize-none"
                                />
                            </div>

                            {/* Image */}
                            <div>
                                <label className="text-white/50 text-xs font-bold mb-1.5 block">팝업 이미지 (선택)</label>
                                <input
                                    type="text"
                                    value={form.image_url.startsWith('data:') ? '' : form.image_url}
                                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                                    placeholder="이미지 URL을 입력하거나 아래에서 파일 업로드"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#6C63FF]/50 mb-2"
                                />
                                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-dashed border-white/20 cursor-pointer hover:bg-white/8 transition-colors">
                                    <span className="material-symbols-outlined text-[18px] text-white/40">upload</span>
                                    <span className="text-white/40 text-sm font-bold">파일에서 업로드</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                                </label>
                                {form.image_url && (
                                    <div className="mt-2 w-full h-32 rounded-xl overflow-hidden bg-white/5">
                                        <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            {/* Link URL */}
                            <div>
                                <label className="text-white/50 text-xs font-bold mb-1.5 block">클릭 시 이동 링크 (선택)</label>
                                <input
                                    type="text"
                                    value={form.link_url}
                                    onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
                                    placeholder="예) /home/dashboard 또는 외부 URL"
                                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#6C63FF]/50"
                                />
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-white/50 text-xs font-bold mb-1.5 block">시작일 (선택)</label>
                                    <input
                                        type="date"
                                        value={form.start_date}
                                        onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                                        className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C63FF]/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-white/50 text-xs font-bold mb-1.5 block">종료일 (선택)</label>
                                    <input
                                        type="date"
                                        value={form.end_date}
                                        onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                                        className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6C63FF]/50"
                                    />
                                </div>
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                                <div>
                                    <p className="text-white font-bold text-sm">팝업 활성화</p>
                                    <p className="text-white/30 text-xs">비활성화하면 사이트에 표시되지 않습니다</p>
                                </div>
                                <button
                                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                                    className={`w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-[#6C63FF]' : 'bg-white/20'} relative flex-shrink-0`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${form.is_active ? 'left-6' : 'left-0.5'}`} />
                                </button>
                            </div>

                            {/* Save button */}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-3.5 rounded-2xl bg-[#6C63FF] hover:bg-[#5B52E8] text-white font-black text-sm transition-colors disabled:opacity-50 mt-1"
                            >
                                {saving ? '저장 중...' : editingId ? '수정 완료' : '팝업 생성'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPopups;
