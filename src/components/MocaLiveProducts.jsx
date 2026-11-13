import React, { useEffect, useState } from 'react';
import { fetchModelBeautyProducts } from '../services/liveStreamService';
import { updateMocaLiveProducts } from '../services/mocaLiveService';
import { openModelBeautyWithLogin } from '../hooks/useModelBeautyDeepLink';

const won = (n) => `${Number(n || 0).toLocaleString()}원`;

// 시청자용 - 방송에 연결된 모델뷰티 상품 카드. 결제는 토스 심사 도메인(modelbeauty.kr)에서만 진행하므로
// 카드는 티켓 로그인으로 모델뷰티 상품 페이지를 열 뿐, 모카에서 결제창을 띄우지 않는다.
// DB에는 slug만 저장하고 열 때마다 모델뷰티 현재 상품·가격을 가져온다(삭제/판매중지 상품은 자동 숨김).
export const MocaLiveProductCards = ({ slugs }) => {
    const [products, setProducts] = useState([]);
    const key = (slugs || []).join(',');
    useEffect(() => {
        if (!key) { setProducts([]); return; }
        let alive = true;
        fetchModelBeautyProducts().then((all) => {
            if (alive) setProducts(key.split(',').map((s) => all.find((p) => p.slug === s)).filter(Boolean));
        });
        return () => { alive = false; };
    }, [key]);
    if (!products.length) return null;
    return (
        <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
            {products.map((p) => (
                <button
                    key={p.slug}
                    onClick={() => openModelBeautyWithLogin(`/products/${p.slug}`)}
                    className="flex-shrink-0 w-[220px] flex items-center gap-2.5 bg-white/10 rounded-xl p-2 text-left"
                >
                    {p.image && <img src={p.image} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />}
                    <span className="min-w-0">
                        <span className="block text-white text-[12px] font-black truncate">{p.name}</span>
                        <span className="block text-[12px] font-black text-[var(--moca-primary-light,#c4b5fd)]">{won(p.salePrice ?? p.basePrice)}</span>
                        <span className="block text-[10px] font-bold text-white/60">구매하기 ›</span>
                    </span>
                </button>
            ))}
        </div>
    );
};

// 어드민용 - 방송에 노출할 모델뷰티 상품 체크/저장
export const AdminMocaLiveProducts = ({ liveId, initial }) => {
    const [all, setAll] = useState([]);
    const [selected, setSelected] = useState(() => new Set(initial || []));
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => { fetchModelBeautyProducts().then(setAll); }, []);

    const toggle = (slug) => setSelected((prev) => {
        const next = new Set(prev);
        next.has(slug) ? next.delete(slug) : next.add(slug);
        return next;
    });

    const save = async () => {
        setSaving(true);
        const slugs = all.filter((p) => selected.has(p.slug)).map((p) => p.slug);
        const { error } = await updateMocaLiveProducts(liveId, slugs);
        setSaving(false);
        setMsg(error ? '저장 실패' : `저장됨 (${slugs.length}개)`);
    };

    return (
        <div className="bg-white rounded-2xl p-4 mb-4">
            <p className="text-[13px] font-black text-[var(--moca-text)] mb-2">🛍️ 방송 판매 상품 (모델뷰티)</p>
            {all.length === 0 && <p className="text-[12px] text-[var(--moca-text-3)]">상품을 불러오는 중이거나 없습니다.</p>}
            <div className="flex flex-wrap gap-2">
                {all.map((p) => (
                    <label key={p.slug} className="flex items-center gap-1.5 text-[12px] font-bold border border-[var(--moca-border)] rounded-lg px-2.5 py-1.5 cursor-pointer">
                        <input type="checkbox" checked={selected.has(p.slug)} onChange={() => toggle(p.slug)} />
                        {p.name} · {won(p.salePrice ?? p.basePrice)}
                    </label>
                ))}
            </div>
            <div className="flex items-center gap-3 mt-3">
                <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-[var(--moca-primary)] text-white text-[12px] font-black disabled:opacity-50">
                    {saving ? '저장 중...' : '저장'}
                </button>
                {msg && <span className="text-[12px] font-bold text-[var(--moca-text-3)]">{msg}</span>}
            </div>
        </div>
    );
};
