import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';
import { fetchMyPublicProfile, saveMyPublicProfile } from '../services/publicProfileService';

const SHOW_FIELDS = [
    ['show_height', '신장'], ['show_weight', '체중'], ['show_shoe_size', '신발 사이즈'],
    ['show_instagram', '인스타그램'], ['show_portfolio', '포트폴리오 링크'], ['show_phone', '전화번호'],
];

const MyPublicProfile = () => {
    const navigate = useNavigate();
    const user = getUser();
    const [f, setF] = useState({
        display_name: user?.name || user?.nickname || '', gender: user?.gender || '', intro: '', specialties: '', career: '',
        is_public: false,
        show_height: true, show_weight: false, show_age: true, show_shoe_size: false,
        show_instagram: false, show_portfolio: false, show_phone: false,
    });
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (!user?.id) return;
        fetchMyPublicProfile(user.id).then(p => { if (p) setF(prev => ({ ...prev, ...p })); });
    }, []);

    const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

    const save = async () => {
        if (!f.display_name.trim()) return setMsg('표시 이름을 입력해주세요.');
        setBusy(true);
        const { id, user_id, view_count, created_at, updated_at, ...fields } = f;
        const err = await saveMyPublicProfile(user.id, fields);
        setBusy(false);
        setMsg(err ? `저장 실패: ${err}` : '저장되었습니다.');
    };

    const input = 'w-full px-3 py-2 rounded-xl border border-[#E8E0FA] text-sm bg-white';
    return (
        <div className="px-4 py-5 space-y-4">
            <button onClick={() => navigate(-1)} className="text-xs font-bold text-[#7C3AED]">← 뒤로</button>
            <h1 className="text-lg font-black text-[#1F1235]">내 공개 프로필</h1>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-[#F8F5FF] border border-[#E8E0FA] text-sm font-bold">
                <input type="checkbox" checked={f.is_public} onChange={e => set('is_public', e.target.checked)} />
                프로필 공개 (앱 회원과 업체가 볼 수 있어요)
            </label>

            <input className={input} placeholder="표시 이름" value={f.display_name} onChange={e => set('display_name', e.target.value)} />
            <div className="flex gap-2">
                {['남', '여'].map(g => (
                    <button key={g} onClick={() => set('gender', g)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold border ${f.gender === g ? 'bg-[#9333EA] text-white border-[#9333EA]' : 'bg-white border-[#E8E0FA]'}`}>{g}</button>
                ))}
            </div>
            <input className={input} type="number" inputMode="numeric" min="1950" max="2030" placeholder="활동년생 (예: 1999) - 실제 출생년도가 아니어도 돼요"
                value={f.activity_year || ''} onChange={e => set('activity_year', e.target.value ? Number(e.target.value) : null)} />
            <textarea className={input} rows={4} placeholder="자기소개" value={f.intro || ''} onChange={e => set('intro', e.target.value)} />
            <input className={input} placeholder="특기 (예: 댄스, 영어, 운전)" value={f.specialties || ''} onChange={e => set('specialties', e.target.value)} />
            <textarea className={input} rows={5} placeholder="경력 (광고·영상·화보 등)" value={f.career || ''} onChange={e => set('career', e.target.value)} />

            <button onClick={() => navigate('/home/smart-profile')}
                className="w-full py-3 rounded-xl bg-[#F3E8FF] text-[#7C3AED] text-sm font-black">
                사진은 스마트프로필 &gt; 프로필 사진에서 올려요 (최대 10장, 대표사진 설정) →
            </button>

            <div>
                <p className="text-sm font-black mb-1">공개할 정보 선택</p>
                <p className="text-xs text-gray-400 mb-2">값은 스마트프로필에 입력한 내용이 쓰입니다. 체크한 항목만 노출돼요.</p>
                <div className="grid grid-cols-2 gap-2">
                    {SHOW_FIELDS.map(([k, label]) => (
                        <label key={k} className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={!!f[k]} onChange={e => set(k, e.target.checked)} />{label}
                        </label>
                    ))}
                </div>
            </div>

            {msg && <p className="text-sm text-[#7C3AED] font-bold">{msg}</p>}
            <button onClick={save} disabled={busy}
                className="w-full py-3 rounded-2xl bg-[#9333EA] text-white font-black disabled:opacity-50">{busy ? '처리 중...' : '저장'}</button>
        </div>
    );
};

export default MyPublicProfile;
