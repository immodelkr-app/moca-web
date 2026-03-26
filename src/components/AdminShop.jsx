import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { MOCK_PRODUCTS, fetchAllReviews, toggleReviewApproval, deleteReview } from '../services/shopService';
import { sendFriendtalk } from '../services/aligoService';

const BUCKET = 'shop-images';
const MAX_FILE_MB = 5;
const GRADE_OPTIONS = ['SILVER', 'GOLD', 'VIP', 'VVIP'];
const ALL_GRADES = ['ALL', ...GRADE_OPTIONS];
const STATUS_MAP = { pending: '결제대기', paid: '결제완료', cancelled: '취소', refunded: '환불' };
const STATUS_COLOR = {
    pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    paid: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    cancelled: 'text-red-400 bg-red-500/10 border-red-500/30',
    refunded: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
};

const emptyProduct = {
    title: '', subtitle: '', image_url: '', detail_content: '',
    original_price: '', sale_price: '', discount_type: 'pct', discount_value: '', stock: '',
    sale_start: '', sale_end: '', min_grade: 'SILVER',
    badge: '', is_active: true,
};

// ── 썸네일 업로더 (파일 전용) ─────────────────────────────────────────────────
const ThumbnailUploader = ({ value, onChange, onError }) => {
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
            const fileName = `thumb_${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(fileName, file, { upsert: true, contentType: file.type });
            if (uploadErr) throw uploadErr;
            const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
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
        <div className="sm:col-span-2">
            <label className="text-white/50 text-xs mb-2 block">썸네일 이미지 <span className="text-white/25">(파일 업로드 전용)</span></label>
            <div className="flex gap-3 items-start">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                    {preview ? (
                        <>
                            <img src={preview} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={clear} className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white/80 hover:text-red-400">
                                <span className="material-symbols-outlined text-[12px]">close</span>
                            </button>
                        </>
                    ) : <span className="material-symbols-outlined text-white/20 text-3xl">image</span>}
                    {uploading && <div className="absolute inset-0 bg-black/70 flex items-center justify-center"><div className="w-5 h-5 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" /></div>}
                </div>
                <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`flex-1 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all
                        ${dragOver ? 'border-orange-400 bg-orange-500/10' : 'border-white/15 bg-black/20 hover:border-orange-400/50'}
                        ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                >
                    <span className="material-symbols-outlined text-white/40 text-2xl">cloud_upload</span>
                    <p className="text-white/40 text-[11px]">{uploading ? '업로드 중...' : '클릭하거나 드래그해서 업로드'}</p>
                    <p className="text-white/20 text-[10px]">JPG · PNG · WEBP · 최대 5MB</p>
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                </div>
            </div>
        </div>
    );
};

// ── 상세 페이지 업로더 (이미지 or 외부 URL) ──────────────────────────────────
const DetailContentUploader = ({ value, onChange, onError }) => {
    const [mode, setMode] = useState('image'); // 'image' | 'url'
    const [preview, setPreview] = useState('');
    const [urlInput, setUrlInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!value) { setPreview(''); setUrlInput(''); return; }
        if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(value)) { setMode('image'); setPreview(value); }
        else { setMode('url'); setUrlInput(value); }
    }, [value]);

    const handleFile = async (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { onError('이미지 파일만 업로드 가능합니다.'); return; }
        const localUrl = URL.createObjectURL(file);
        setPreview(localUrl);
        if (!supabase) { onChange(localUrl); return; }
        setUploading(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `detail_${Date.now()}.${ext}`;
            const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(fileName, file, { upsert: true, contentType: file.type });
            if (uploadErr) throw uploadErr;
            const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
            setPreview(data.publicUrl);
            onChange(data.publicUrl);
        } catch (e) {
            onError('업로드 실패: ' + e.message);
        } finally { setUploading(false); }
    };

    const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); };
    const clear = () => { setPreview(''); setUrlInput(''); onChange(''); if (fileInputRef.current) fileInputRef.current.value = ''; };

    return (
        <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
                <label className="text-white/50 text-xs">상세 페이지 <span className="text-white/25">(썸네일 클릭 시 표시)</span></label>
                <div className="flex gap-1 bg-black/40 border border-white/10 rounded-lg p-0.5">
                    {[{ id: 'image', label: '🖼 이미지 업로드' }, { id: 'url', label: '🔗 외부 URL' }].map(m => (
                        <button key={m.id} type="button" onClick={() => setMode(m.id)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all ${mode === m.id ? 'bg-indigo-500/40 text-indigo-300' : 'text-white/40 hover:text-white'}`}>
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            {mode === 'image' ? (
                <div className="flex gap-3 items-start">
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                        {preview ? (
                            <>
                                <img src={preview} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={clear} className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white/80 hover:text-red-400">
                                    <span className="material-symbols-outlined text-[12px]">close</span>
                                </button>
                            </>
                        ) : <span className="material-symbols-outlined text-white/20 text-2xl">description</span>}
                        {uploading && <div className="absolute inset-0 bg-black/70 flex items-center justify-center"><div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" /></div>}
                    </div>
                    <div
                        onClick={() => !uploading && fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`flex-1 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all
                            ${dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/15 bg-black/20 hover:border-indigo-400/50'}
                            ${uploading ? 'pointer-events-none opacity-60' : ''}`}
                    >
                        <span className="material-symbols-outlined text-white/40 text-2xl">image</span>
                        <p className="text-white/40 text-[11px]">{uploading ? '업로드 중...' : '세로 긴 상세 이미지 업로드'}</p>
                        <p className="text-white/20 text-[10px]">JPG · PNG · WEBP (세로 형태 권장)</p>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <input type="url" value={urlInput}
                        onChange={(e) => { setUrlInput(e.target.value); onChange(e.target.value); }}
                        placeholder="https://d.cafe24.com/sample?productCode=..."
                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-indigo-400 transition-colors"
                    />
                    <p className="text-white/30 text-[10px]">cafe24, 스마트스토어 등 상품 상세페이지 URL을 입력하세요. 회원이 썸네일을 누르면 앱 내에서 표시됩니다.</p>
                    {urlInput && (
                        <button type="button" onClick={clear} className="text-[11px] text-red-400/70 hover:text-red-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">close</span> URL 초기화
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
const AdminShop = ({ successMsg, setSuccessMsg }) => {
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [coupons, setCoupons] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [subTab, setSubTab] = useState('products');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState(emptyProduct);
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const emptyCoupon = { code: '', description: '', discount_type: 'pct', discount_value: '', min_price: 0, target_grade: 'ALL', max_uses: '', expires_at: '', is_active: true };
    const [couponForm, setCouponForm] = useState(emptyCoupon);
    const [showCouponForm, setShowCouponForm] = useState(false);
    const [savingCoupon, setSavingCoupon] = useState(false);
    const [couponEditingId, setCouponEditingId] = useState(null);

    useEffect(() => { loadAll(); }, []);

    const loadAll = async () => {
        setLoading(true);
        setError('');
        try {
            if (!supabase) { setProducts(MOCK_PRODUCTS); setLoading(false); return; }
            const { data: pData, error: pErr } = await supabase.from('shop_products').select('*').order('sale_start', { ascending: false });
            if (pErr) throw pErr;
            setProducts(pData || []);
            const { data: oData, error: oErr } = await supabase.from('shop_orders').select('*, shop_products(title)').order('created_at', { ascending: false });
            if (oErr) throw oErr;
            setOrders(oData || []);
            const { data: cData } = await supabase.from('shop_coupon_codes').select('*').order('created_at', { ascending: false });
            setCoupons(cData || []);
            const { data: rData } = await fetchAllReviews();
            setReviews(rData || []);
        } catch (e) {
            setError('데이터 로드 실패: ' + e.message);
        } finally { setLoading(false); }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => {
            const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };
            // 멤버가 자동 계산
            const origPrice = Number(name === 'original_price' ? value : prev.original_price);
            const discType = name === 'discount_type' ? value : prev.discount_type;
            const discVal = Number(name === 'discount_value' ? value : prev.discount_value);
            if (origPrice > 0 && discVal > 0) {
                if (discType === 'pct') {
                    updated.sale_price = Math.round(origPrice * (1 - discVal / 100));
                } else {
                    updated.sale_price = origPrice - discVal;
                }
            }
            return updated;
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.title || !form.original_price || !form.discount_value || !form.stock || !form.sale_start || !form.sale_end || !(Number(form.sale_price) > 0)) {
            setError('필수 항목을 모두 입력해주세요. (멤버가 할인값을 확인하세요)');
            return;
        }
        setSaving(true);
        setError('');
        try {
            // eslint-disable-next-line no-unused-vars
        const { discount_type, discount_value, ...formData } = form;
        const payload = {
                ...formData,
                original_price: Number(form.original_price),
                sale_price: Number(form.sale_price),
                stock: Number(form.stock),
                sale_start: new Date(form.sale_start).toISOString(),
                sale_end: new Date(form.sale_end).toISOString(),
                badge: form.badge || null,
                image_url: form.image_url || null,
                detail_content: form.detail_content || null,
            };
            if (!supabase) {
                setProducts(prev => editingId ? prev.map(p => p.id === editingId ? { ...p, ...payload } : p) : [{ id: Date.now().toString(), ...payload }, ...prev]);
                setSuccessMsg(editingId ? '상품이 수정되었습니다!' : '상품이 등록되었습니다!');
                resetForm();
                return;
            }
            if (editingId) {
                const { data, error: uErr } = await supabase.from('shop_products').update(payload).eq('id', editingId).select();
                if (uErr) throw uErr;
                if (!data || data.length === 0) throw new Error("권한(보안 정책)으로 인해 상품 업데이트에 실패했습니다. Supabase 설정을 확인하세요.");

                setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...payload } : p));
                setSuccessMsg('상품이 수정되었습니다!');
            } else {
                const { data, error: iErr } = await supabase.from('shop_products').insert([payload]).select().single();
                if (iErr) throw iErr;
                if (!data) throw new Error("새 상품 등록에 실패했습니다.");

                setProducts(prev => [data, ...prev]);
                setSuccessMsg('상품이 등록되었습니다!');

                // 전체 회원 모카 에디트 신규 상품 알림톡 발송
                const saleEndStr = new Date(payload.sale_end).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const discountPct = Math.round((1 - payload.sale_price / payload.original_price) * 100);
                const { data: allUsers } = await supabase.from('users').select('name, nickname, phone').not('phone', 'is', null);
                if (allUsers && allUsers.length > 0) {
                    const receivers = allUsers
                        .filter(u => u.phone)
                        .map(u => {
                            const name = u.name || u.nickname || '회원';
                            return {
                                phone: u.phone,
                                content: `안녕하세요 ${name}님,\n모두의 캐스팅 매니저, 아임모카(IM MOCA)입니다.\n\n모카 에디트에 새로운 셀렉트 상품이 업데이트되었습니다.\n이번 에디션은 딱 3일간만 공개되니 늦기 전에 확인해 보세요!\n\n■ 상품명: ${payload.title}\n■ 정가: ${payload.original_price.toLocaleString()}원\n■ 모카멤버가: ${payload.sale_price.toLocaleString()}원 (${discountPct}% 할인)\n■ 판매 종료: ${saleEndStr}\n\n오직 모카 멤버만을 위해 엄선한 제품입니다.`,
                                buttons: [{
                                    buttonType: 'WL',
                                    buttonName: '모카 에디트 보러가기',
                                    linkMo: 'https://immoca.kr/home/shop',
                                    linkPc: 'https://immoca.kr/home/shop'
                                }]
                            };
                        });
                    sendFriendtalk(receivers)
                        .then(() => console.log(`모카 에디트 친구톡 ${receivers.length}명 발송 완료`))
                        .catch(err => console.error('모카 에디트 친구톡 발송 에러:', err));
                }
            }
            resetForm();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) {
            setError('저장 실패: ' + e.message);
        } finally { setSaving(false); }
    };

    const handleDelete = async (id, title, imageUrl) => {
        if (!window.confirm(`"${title}" 상품을 삭제하시겠습니까?`)) return;
        try {
            if (supabase) {
                // 스토리지 파일(이미지) 삭제 시도 (참고: 실패해도 상품 삭제는 진행)
                if (imageUrl && imageUrl.includes(BUCKET)) {
                    const path = imageUrl.split(`/${BUCKET}/`)[1];
                    if (path) await supabase.storage.from(BUCKET).remove([path]).catch(err => console.log('Image remove warning:', err));
                }
                const { data, error: dErr } = await supabase.from('shop_products').delete().eq('id', id).select();
                if (dErr) throw dErr;
                if (!data || data.length === 0) throw new Error("권한(보안 정책)으로 인해 상품 삭제에 실패했습니다. (DB상에 상품이 그대로 유지됨)");
            }

            // 삭제 검증 통과 후 화면에서 제거
            setProducts(prev => prev.filter(p => p.id !== id));
            setSuccessMsg('상품이 완전히 삭제되었습니다.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) { setError('삭제 실패: ' + e.message); }
    };

    const handleEdit = (product) => {
        const toLocal = (iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        };
        const discountPctCalc = Math.round((1 - product.sale_price / product.original_price) * 100);
        setForm({ ...product, sale_start: toLocal(product.sale_start), sale_end: toLocal(product.sale_end), badge: product.badge || '', image_url: product.image_url || '', detail_content: product.detail_content || '', discount_type: 'pct', discount_value: String(discountPctCalc) });
        setEditingId(product.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleToggleActive = async (product) => {
        try {
            if (supabase) await supabase.from('shop_products').update({ is_active: !product.is_active }).eq('id', product.id);
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p));
        } catch (e) { setError('상태 변경 실패: ' + e.message); }
    };

    const resetForm = () => { setForm(emptyProduct); setEditingId(null); setShowForm(false); };

    // ── 쿠폰 ──────────────────────────────────────────────────────────────────
    const handleSaveCoupon = async (e) => {
        e.preventDefault();
        if (!couponForm.code || !couponForm.discount_value) { setError('쿠폰 코드와 할인 값은 필수입니다.'); return; }
        setSavingCoupon(true);
        setError('');
        try {
            const payload = {
                ...couponForm,
                code: couponForm.code.toUpperCase().trim(),
                discount_value: Number(couponForm.discount_value),
                min_price: Number(couponForm.min_price),
                max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null,
                expires_at: couponForm.expires_at ? new Date(couponForm.expires_at).toISOString() : null,
            };
            if (couponEditingId) {
                const { error: uErr } = await supabase.from('shop_coupon_codes').update(payload).eq('id', couponEditingId);
                if (uErr) throw uErr;
                setCoupons(prev => prev.map(c => c.id === couponEditingId ? { ...c, ...payload } : c));
                setSuccessMsg('쿠폰이 수정되었습니다!');
            } else {
                const { data, error: iErr } = await supabase.from('shop_coupon_codes').insert([payload]).select().single();
                if (iErr) throw iErr;
                setCoupons(prev => [data, ...prev]);
                setSuccessMsg('쿠폰이 등록되었습니다!');
            }
            resetCouponForm();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) {
            setError('쿠폰 저장 실패: ' + e.message);
        } finally { setSavingCoupon(false); }
    };

    const handleEditCoupon = (coupon) => {
        const toLocal = (iso) => { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
        setCouponForm({ ...coupon, expires_at: toLocal(coupon.expires_at) });
        setCouponEditingId(coupon.id);
        setShowCouponForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteCoupon = async (id, code) => {
        if (!window.confirm(`"${code}" 쿠폰을 삭제하시겠습니까?`)) return;
        try {
            const { error: dErr } = await supabase.from('shop_coupon_codes').delete().eq('id', id);
            if (dErr) throw dErr;
            setCoupons(prev => prev.filter(c => c.id !== id));
            setSuccessMsg('쿠폰이 삭제되었습니다.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) { setError('쿠폰 삭제 실패: ' + e.message); }
    };

    const handleToggleCouponActive = async (coupon) => {
        try {
            await supabase.from('shop_coupon_codes').update({ is_active: !coupon.is_active }).eq('id', coupon.id);
            setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c));
        } catch (e) { setError('쿠폰 상태 변경 실패: ' + e.message); }
    };

    const resetCouponForm = () => { setCouponForm(emptyCoupon); setCouponEditingId(null); setShowCouponForm(false); };

    // ── 리뷰 ──────────────────────────────────────────────────────────────────
    const handleToggleReviewApproval = async (review) => {
        try {
            const { error } = await toggleReviewApproval(review.id, review.is_approved);
            if (error) throw error;
            setReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_approved: !r.is_approved } : r));
        } catch (e) { setError('리뷰 상태 변경 실패: ' + e.message); }
    };

    const handleDeleteReview = async (reviewId, nickname) => {
        if (!window.confirm(`"${nickname}"의 리뷰를 삭제하시겠습니까?`)) return;
        try {
            const { error } = await deleteReview(reviewId);
            if (error) throw error;
            setReviews(prev => prev.filter(r => r.id !== reviewId));
            setSuccessMsg('리뷰가 삭제되었습니다.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) { setError('리뷰 삭제 실패: ' + e.message); }
    };

    // ── 주문 ──────────────────────────────────────────────────────────────────
    const handleOrderStatus = async (orderId, status) => {
        try {
            if (supabase) { const { error } = await supabase.from('shop_orders').update({ status }).eq('id', orderId); if (error) throw error; }
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
            setSuccessMsg('주문 상태가 변경되었습니다.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) { setError('상태 변경 실패: ' + e.message); }
    };

    const formatDate = (iso) => iso ? new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';
    const formatPrice = (n) => n ? Number(n).toLocaleString() + '원' : '-';
    const activeCount = products.filter(p => p.is_active).length;
    const activeCoupons = coupons.filter(c => c.is_active).length;

    return (
        <div className="animate-fadeIn">
            {/* 요약 카드 */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                {[
                    { label: '전체 상품', value: products.length, icon: 'inventory_2', color: 'text-indigo-400' },
                    { label: '판매중', value: activeCount, icon: 'local_fire_department', color: 'text-orange-400' },
                    { label: '전체 주문', value: orders.length, icon: 'receipt', color: 'text-blue-400' },
                    { label: '활성 쿠폰', value: activeCoupons, icon: 'local_activity', color: 'text-purple-400' },
                    { label: '전체 리뷰', value: reviews.length, icon: 'rate_review', color: 'text-yellow-400' },
                ].map(({ label, value, icon, color }) => (
                    <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`material-symbols-outlined text-sm ${color}`}>{icon}</span>
                            <span className="text-white/40 text-xs">{label}</span>
                        </div>
                        <p className="text-white font-black text-lg">{value}</p>
                    </div>
                ))}
            </div>

            {/* 서브탭 */}
            <div className="flex gap-3 mb-6 border-b border-white/10 overflow-x-auto">
                {[{ id: 'products', label: '📦 상품 관리' }, { id: 'orders', label: '🧾 주문 목록' }, { id: 'coupons', label: '🎟 쿠폰 관리' }, { id: 'reviews', label: '⭐ 리뷰 관리' }].map(t => (
                    <button key={t.id} onClick={() => setSubTab(t.id)}
                        className={`pb-3 px-1 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${subTab === t.id ? 'border-orange-400 text-orange-300' : 'border-transparent text-white/40 hover:text-white'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* 에러 */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 text-red-400 text-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span> {error}
                    <button onClick={() => setError('')} className="ml-auto"><span className="material-symbols-outlined text-sm">close</span></button>
                </div>
            )}

            {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" /></div>}

            {/* ══ 상품 관리 ══ */}
            {!loading && subTab === 'products' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-white/40 text-sm">총 <span className="text-white font-bold">{products.length}</span>개 상품</p>
                        <button onClick={() => { if (editingId) resetForm(); else setShowForm(v => !v); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${showForm ? 'bg-white/10 border-white/20 text-white/60' : 'bg-orange-500/20 border-orange-500/40 text-orange-300 hover:bg-orange-500/30'}`}>
                            <span className="material-symbols-outlined text-sm">{showForm ? 'close' : 'add'}</span>
                            {showForm ? '닫기' : '새 상품 등록'}
                        </button>
                    </div>

                    {showForm && (
                        <form onSubmit={handleSave} className="bg-[#1a1a24] border border-orange-500/20 rounded-2xl p-5 mb-6 space-y-4">
                            <h3 className="text-orange-300 font-black text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">inventory_2</span>
                                {editingId ? '상품 수정' : '새 상품 등록'}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField label="상품명 *" name="title" value={form.title} onChange={handleChange} placeholder="모카 프리미엄 촬영권" />
                                <FormField label="설명 (부제)" name="subtitle" value={form.subtitle} onChange={handleChange} placeholder="컨셉 촬영 2시간 포함" />
                                <FormField label="정가 (원) *" name="original_price" type="number" value={form.original_price} onChange={handleChange} placeholder="150000" />
                                <div>
                                    <label className="text-white/50 text-xs mb-2 block">멤버가 설정 *</label>
                                    <div className="flex gap-2 mb-2">
                                        <button type="button" onClick={() => handleChange({ target: { name: 'discount_type', value: 'pct', type: 'text' } })}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${form.discount_type === 'pct' ? 'bg-orange-500/30 border-orange-500/50 text-orange-300' : 'bg-black/30 border-white/15 text-white/40 hover:text-white/70'}`}>
                                            % 할인
                                        </button>
                                        <button type="button" onClick={() => handleChange({ target: { name: 'discount_type', value: 'won', type: 'text' } })}
                                            className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${form.discount_type === 'won' ? 'bg-orange-500/30 border-orange-500/50 text-orange-300' : 'bg-black/30 border-white/15 text-white/40 hover:text-white/70'}`}>
                                            원 할인
                                        </button>
                                    </div>
                                    <input
                                        type="number"
                                        name="discount_value"
                                        value={form.discount_value}
                                        onChange={handleChange}
                                        placeholder={form.discount_type === 'pct' ? '예: 30 (30% 할인)' : '예: 30000 (3만원 할인)'}
                                        min="1"
                                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-400"
                                    />
                                    {form.original_price && form.discount_value && Number(form.sale_price) > 0 && (
                                        <div className="mt-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between">
                                            <span className="text-white/50 text-xs">멤버가</span>
                                            <div className="text-right">
                                                <span className="text-orange-300 font-black text-sm">{Number(form.sale_price).toLocaleString()}원</span>
                                                <span className="text-orange-400/70 text-xs ml-2">
                                                    {form.discount_type === 'pct'
                                                        ? `(${form.discount_value}% 할인)`
                                                        : `(${Number(form.discount_value).toLocaleString()}원 할인)`}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <FormField label="재고 수량 *" name="stock" type="number" value={form.stock} onChange={handleChange} placeholder="5" />
                                <div>
                                    <label className="text-white/50 text-xs mb-1 block">최소 등급</label>
                                    <select name="min_grade" value={form.min_grade} onChange={handleChange} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-400">
                                        {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g === 'VIP' ? '전속모델' : g}</option>)}
                                    </select>
                                </div>
                                <FormField label="판매 시작 *" name="sale_start" type="datetime-local" value={form.sale_start} onChange={handleChange} />
                                <FormField label="판매 종료 *" name="sale_end" type="datetime-local" value={form.sale_end} onChange={handleChange} />
                                <div>
                                    <label className="text-white/50 text-xs mb-1 block">뱃지</label>
                                    <select name="badge" value={form.badge} onChange={handleChange} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-400">
                                        <option value="">없음</option>
                                        {['BEST', 'HOT', 'NEW', '전속모델 전용', 'VVIP 얼리버드'].map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                {/* 썸네일 업로더 — 파일 전용 */}
                                <ThumbnailUploader value={form.image_url} onChange={(url) => setForm(p => ({ ...p, image_url: url }))} onError={setError} />
                                {/* 상세 페이지 업로더 */}
                                <DetailContentUploader value={form.detail_content} onChange={(url) => setForm(p => ({ ...p, detail_content: url }))} onError={setError} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="is_active" name="is_active" checked={form.is_active} onChange={handleChange} className="w-4 h-4 accent-orange-400" />
                                <label htmlFor="is_active" className="text-white/70 text-sm">판매 활성화</label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={saving} className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-50">
                                    <span className="material-symbols-outlined text-sm">{saving ? 'hourglass_empty' : 'save'}</span>
                                    {saving ? '저장 중...' : (editingId ? '수정 완료' : '등록하기')}
                                </button>
                                <button type="button" onClick={resetForm} className="px-4 py-3 rounded-xl border border-white/15 text-white/50 text-sm hover:text-white">취소</button>
                            </div>
                        </form>
                    )}

                    <div className="space-y-3">
                        {products.length === 0 ? (
                            <div className="text-center py-16 text-white/30"><span className="material-symbols-outlined text-4xl block mb-2">inventory_2</span><p>등록된 상품이 없습니다</p></div>
                        ) : products.map(product => {
                            const now = new Date();
                            const isOnSale = new Date(product.sale_start) <= now && now <= new Date(product.sale_end);
                            const discountPct = Math.round((1 - product.sale_price / product.original_price) * 100);
                            return (
                                <div key={product.id} className={`bg-[#1a1a24] border rounded-2xl p-4 transition-all ${product.is_active ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
                                    <div className="flex items-start gap-4">
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-900 to-purple-900 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
                                            {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-white/30 text-2xl">image</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="text-white font-bold text-sm truncate">{product.title}</span>
                                                {product.badge && <span className="text-[10px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-full px-2 py-0.5">{product.badge}</span>}
                                                <span className={`text-[10px] font-black rounded-full px-2 py-0.5 border ${isOnSale && product.is_active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/30 border-white/10'}`}>
                                                    {isOnSale && product.is_active ? '🔥 판매중' : product.is_active ? '대기' : '비활성'}
                                                </span>
                                                {product.detail_content && <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full px-2 py-0.5">📄 상세</span>}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/40">
                                                <span>정가 <span className="line-through">{Number(product.original_price).toLocaleString()}원</span></span>
                                                <span className="text-orange-400 font-bold">멤버가 {Number(product.sale_price).toLocaleString()}원 ({discountPct}%↓)</span>
                                                <span>재고 {product.stock}개</span>
                                            </div>
                                            <div className="text-[11px] text-white/30 mt-1">{formatDate(product.sale_start)} ~ {formatDate(product.sale_end)}</div>
                                        </div>
                                        <div className="flex flex-col gap-1.5 shrink-0">
                                            <button onClick={() => handleToggleActive(product)}
                                                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${product.is_active ? 'bg-white/10 border-white/20 text-white/60 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}>
                                                {product.is_active ? '비활성화' : '활성화'}
                                            </button>
                                            <button onClick={() => handleEdit(product)} className="text-[11px] font-bold px-3 py-1.5 rounded-lg border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all">수정</button>
                                            <button onClick={() => handleDelete(product.id, product.title, product.image_url)} className="text-[11px] font-bold px-3 py-1.5 rounded-lg border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">삭제</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ══ 주문 목록 ══ */}
            {!loading && subTab === 'orders' && (
                <>
                    <p className="text-white/40 text-sm mb-4">총 <span className="text-white font-bold">{orders.length}</span>건 주문</p>
                    <div className="space-y-3">
                        {orders.length === 0 ? (
                            <div className="text-center py-16 text-white/30"><span className="material-symbols-outlined text-4xl block mb-2">receipt_long</span><p>주문 내역이 없습니다</p></div>
                        ) : orders.map(order => (
                            <div key={order.id} className="bg-[#1a1a24] border border-white/10 rounded-2xl p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-white font-bold text-sm">{order.user_nickname}</span>
                                            <span className={`text-[10px] font-black rounded-full px-2 py-0.5 border ${STATUS_COLOR[order.status] || STATUS_COLOR.pending}`}>{STATUS_MAP[order.status] || order.status}</span>
                                        </div>
                                        <p className="text-white/60 text-xs mb-1">{order.shop_products?.title || '상품 정보 없음'}</p>
                                        <div className="flex flex-wrap gap-x-3 text-xs text-white/40">
                                            <span>결제 <span className="text-emerald-400 font-bold">{formatPrice(order.final_price)}</span></span>
                                            <span>{order.recipient_name} | {order.recipient_phone}</span>
                                            <span className="text-white/20">{formatDate(order.created_at)}</span>
                                        </div>
                                        {order.order_id && <p className="text-white/20 text-[10px] mt-1 font-mono">주문번호: {order.order_id}</p>}
                                        {order.address && <p className="text-white/30 text-[11px] mt-1">📦 {order.address} {order.address_detail || ''}</p>}
                                        {order.delivery_memo && <p className="text-white/25 text-[11px]">📝 {order.delivery_memo}</p>}
                                    </div>
                                    <select value={order.status} onChange={e => handleOrderStatus(order.id, e.target.value)}
                                        className="bg-black/40 border border-white/15 rounded-xl px-2 py-1.5 text-white text-xs focus:outline-none focus:border-orange-400 shrink-0">
                                        {Object.entries(STATUS_MAP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ══ 쿠폰 관리 ══ */}
            {!loading && subTab === 'coupons' && (
                <>
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-white/40 text-sm">총 <span className="text-white font-bold">{coupons.length}</span>개 쿠폰</p>
                        <button onClick={() => { if (couponEditingId) resetCouponForm(); else setShowCouponForm(v => !v); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${showCouponForm ? 'bg-white/10 border-white/20 text-white/60' : 'bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30'}`}>
                            <span className="material-symbols-outlined text-sm">{showCouponForm ? 'close' : 'add'}</span>
                            {showCouponForm ? '닫기' : '쿠폰 발급'}
                        </button>
                    </div>

                    {showCouponForm && (
                        <form onSubmit={handleSaveCoupon} className="bg-[#1a1a24] border border-purple-500/20 rounded-2xl p-5 mb-6 space-y-4">
                            <h3 className="text-purple-300 font-black text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">local_activity</span>
                                {couponEditingId ? '쿠폰 수정' : '새 쿠폰 발급'}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-white/50 text-xs mb-1 block">쿠폰 코드 *</label>
                                    <input value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value.toUpperCase().trim() }))} placeholder="MOCA2024"
                                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-400 tracking-widest uppercase" />
                                </div>
                                <div>
                                    <label className="text-white/50 text-xs mb-1 block">설명</label>
                                    <input value={couponForm.description} onChange={e => setCouponForm(p => ({ ...p, description: e.target.value }))} placeholder="모카앱 10% 할인 쿠폰"
                                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="text-white/50 text-xs mb-1 block">할인 방식 *</label>
                                    <select value={couponForm.discount_type} onChange={e => setCouponForm(p => ({ ...p, discount_type: e.target.value }))} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400">
                                        <option value="pct">정률 (%)</option><option value="amount">정액 (원)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-white/50 text-xs mb-1 block">할인 값 * {couponForm.discount_type === 'pct' ? '(%)' : '(원)'}</label>
                                    <input type="number" value={couponForm.discount_value} onChange={e => setCouponForm(p => ({ ...p, discount_value: e.target.value }))} placeholder={couponForm.discount_type === 'pct' ? '10' : '5000'} min="1"
                                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="text-white/50 text-xs mb-1 block">최소 구매금액 (원)</label>
                                    <input type="number" value={couponForm.min_price} onChange={e => setCouponForm(p => ({ ...p, min_price: e.target.value }))} placeholder="0 = 제한없음" min="0"
                                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="text-white/50 text-xs mb-1 block">대상 등급</label>
                                    <select value={couponForm.target_grade} onChange={e => setCouponForm(p => ({ ...p, target_grade: e.target.value }))} className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400">
                                        {ALL_GRADES.map(g => <option key={g} value={g}>{g === 'ALL' ? '전체 (ALL)' : g === 'VIP' ? '전속모델' : g}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-white/50 text-xs mb-1 block">최대 사용 횟수 <span className="text-white/25">(비워두면 무제한)</span></label>
                                    <input type="number" value={couponForm.max_uses} onChange={e => setCouponForm(p => ({ ...p, max_uses: e.target.value }))} placeholder="무제한" min="1"
                                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-400" />
                                </div>
                                <div>
                                    <label className="text-white/50 text-xs mb-1 block">만료일 <span className="text-white/25">(비워두면 무기한)</span></label>
                                    <input type="datetime-local" value={couponForm.expires_at} onChange={e => setCouponForm(p => ({ ...p, expires_at: e.target.value }))}
                                        className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-400" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="coupon_is_active" checked={couponForm.is_active} onChange={e => setCouponForm(p => ({ ...p, is_active: e.target.checked }))} className="w-4 h-4 accent-purple-400" />
                                <label htmlFor="coupon_is_active" className="text-white/70 text-sm">쿠폰 활성화</label>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" disabled={savingCoupon} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-50">
                                    <span className="material-symbols-outlined text-sm">{savingCoupon ? 'hourglass_empty' : 'save'}</span>
                                    {savingCoupon ? '저장 중...' : (couponEditingId ? '수정 완료' : '쿠폰 발급')}
                                </button>
                                <button type="button" onClick={resetCouponForm} className="px-4 py-3 rounded-xl border border-white/15 text-white/50 text-sm hover:text-white">취소</button>
                            </div>
                        </form>
                    )}

                    <div className="space-y-3">
                        {coupons.length === 0 ? (
                            <div className="text-center py-16 text-white/30"><span className="material-symbols-outlined text-4xl block mb-2">local_activity</span><p>발급된 쿠폰이 없습니다</p></div>
                        ) : coupons.map(coupon => {
                            const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                            const isFull = coupon.max_uses !== null && coupon.used_count >= coupon.max_uses;
                            return (
                                <div key={coupon.id} className={`bg-[#1a1a24] border rounded-2xl p-4 transition-all ${coupon.is_active && !isExpired && !isFull ? 'border-purple-500/20' : 'border-white/5 opacity-60'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="text-white font-black text-sm tracking-widest">{coupon.code}</span>
                                                <span className={`text-[10px] font-black rounded-full px-2 py-0.5 border ${coupon.discount_type === 'pct' ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
                                                    {coupon.discount_type === 'pct' ? `${coupon.discount_value}% 할인` : `${Number(coupon.discount_value).toLocaleString()}원 할인`}
                                                </span>
                                                {isExpired && <span className="text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5">만료</span>}
                                                {isFull && <span className="text-[10px] font-black bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded-full px-2 py-0.5">소진</span>}
                                                {!coupon.is_active && <span className="text-[10px] font-black bg-white/10 text-white/30 border border-white/10 rounded-full px-2 py-0.5">비활성</span>}
                                            </div>
                                            {coupon.description && <p className="text-white/50 text-xs mb-1">{coupon.description}</p>}
                                            <div className="flex flex-wrap gap-x-3 text-xs text-white/30">
                                                <span>사용: {coupon.used_count}/{coupon.max_uses ?? '∞'}</span>
                                                {coupon.min_price > 0 && <span>최소구매 {Number(coupon.min_price).toLocaleString()}원</span>}
                                                <span>대상: {coupon.target_grade}</span>
                                                {coupon.expires_at && <span>만료: {formatDate(coupon.expires_at)}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5 shrink-0">
                                            <button onClick={() => handleToggleCouponActive(coupon)} className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${coupon.is_active ? 'bg-white/10 border-white/20 text-white/60 hover:bg-red-500/20 hover:text-red-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                                                {coupon.is_active ? '비활성화' : '활성화'}
                                            </button>
                                            <button onClick={() => handleEditCoupon(coupon)} className="text-[11px] font-bold px-3 py-1.5 rounded-lg border bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 transition-all">수정</button>
                                            <button onClick={() => handleDeleteCoupon(coupon.id, coupon.code)} className="text-[11px] font-bold px-3 py-1.5 rounded-lg border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">삭제</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ══ 리뷰 관리 ══ */}
            {!loading && subTab === 'reviews' && (
                <>
                    <p className="text-white/40 text-sm mb-4">총 <span className="text-white font-bold">{reviews.length}</span>개 리뷰</p>
                    <div className="space-y-3">
                        {reviews.length === 0 ? (
                            <div className="text-center py-16 text-white/30">
                                <span className="material-symbols-outlined text-4xl block mb-2">rate_review</span>
                                <p>등록된 리뷰가 없습니다</p>
                            </div>
                        ) : reviews.map(review => {
                            const productTitle = review.shop_products?.title || '상품 정보 없음';
                            return (
                                <div key={review.id} className={`bg-[#1a1a24] border rounded-2xl p-4 transition-all ${review.is_approved ? 'border-yellow-500/20' : 'border-white/5 opacity-60'}`}>
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center flex-shrink-0 text-white font-bold">
                                            {review.user_nickname.charAt(0)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="text-white font-bold text-sm">{review.user_nickname}</span>
                                                <span className="text-[10px] font-bold bg-white/10 text-white/50 px-1.5 py-0.5 rounded">{review.user_grade === 'VIP' ? '전속모델' : review.user_grade}</span>
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <span key={s} className={`text-sm ${s <= review.rating ? 'text-yellow-400' : 'text-white/15'}`}>★</span>
                                                    ))}
                                                </div>
                                                {!review.is_approved && (
                                                    <span className="text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5">숨김</span>
                                                )}
                                            </div>
                                            <p className="text-white/50 text-xs mb-2">📦 {productTitle}</p>
                                            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap mb-2">{review.content}</p>
                                            {review.review_coupon_code && (
                                                <p className="text-yellow-400/60 text-[11px]">🎁 발급 쿠폰: {review.review_coupon_code}</p>
                                            )}
                                            <p className="text-white/25 text-[11px] mt-1">{formatDate(review.created_at)}</p>
                                        </div>
                                        <div className="flex flex-col gap-1.5 shrink-0">
                                            <button
                                                onClick={() => handleToggleReviewApproval(review)}
                                                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all ${review.is_approved ? 'bg-white/10 border-white/20 text-white/60 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'}`}
                                            >
                                                {review.is_approved ? '숨김' : '공개'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteReview(review.id, review.user_nickname)}
                                                className="text-[11px] font-bold px-3 py-1.5 rounded-lg border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

const FormField = ({ label, name, value, onChange, placeholder, type = 'text' }) => (
    <div>
        <label className="text-white/50 text-xs mb-1 block">{label}</label>
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
            className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-400 transition-colors" />
    </div>
);

export default AdminShop;
