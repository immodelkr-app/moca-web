import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchPublicProfiles } from '../services/publicProfileService';
import { getUser } from '../services/userService';

const chip = (on) => `px-3.5 py-1.5 rounded-lg text-xs font-bold border ${on ? 'bg-[#9333EA] text-white border-[#9333EA]' : 'bg-white text-[#5B4E7A] border-[#E8E0FA]'}`;

// /home/profiles (모델) 와 /company/profiles (업체) 에서 같이 사용
const PublicProfileList = () => {
    const navigate = useNavigate();
    const base = useLocation().pathname.startsWith('/company') ? '/company/profiles' : '/home/profiles';
    const isModel = getUser()?.user_type !== 'company';
    const [gender, setGender] = useState('');
    const [sort, setSort] = useState('recent');
    const [items, setItems] = useState(null);

    useEffect(() => {
        setItems(null);
        fetchPublicProfiles({ gender, sort }).then(setItems);
    }, [gender, sort]);

    return (
        <div className="px-4 py-5">
            <div className="flex items-end justify-between mb-4">
                <h1 className="text-xl font-black text-[#1F1235]">모델 프로필 <span className="text-xs font-medium text-gray-400">{items ? `: ${items.length} posts` : ''}</span></h1>
                {isModel && (
                    <button onClick={() => navigate('/home/my-profile')}
                        className="px-3 py-2 rounded-lg bg-[#9333EA] text-white text-xs font-black">✎ 내 프로필 등록</button>
                )}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
                {[['', '전체'], ['남', '남자'], ['여', '여자']].map(([v, l]) => (
                    <button key={v} onClick={() => setGender(v)} className={chip(gender === v)}>{l}</button>
                ))}
                <span className="w-px bg-[#E8E0FA] mx-1" />
                {[['recent', '등록순'], ['views', '인기순']].map(([v, l]) => (
                    <button key={v} onClick={() => setSort(v)} className={chip(sort === v)}>{l}</button>
                ))}
            </div>
            {items === null ? <p className="text-center text-sm text-gray-400 py-10">불러오는 중...</p>
                : items.length === 0 ? <p className="text-center text-sm text-gray-400 py-10">등록된 프로필이 없습니다.</p>
                : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {items.map(p => (
                            <button key={p.id} onClick={() => navigate(`${base}/${p.id}`)}
                                className="text-left bg-white border border-[#E8E0FA] rounded-xl overflow-hidden active:scale-[0.98] transition-transform">
                                <div className="aspect-[3/4] bg-[#F3E8FF]">
                                    {p.cover_url && <img src={p.cover_url} alt={p.display_name} loading="lazy" className="w-full h-full object-cover" />}
                                </div>
                                <div className="py-2 text-center text-sm font-bold text-[#1F1235] border-b border-[#F0EAFB]">
                                    {p.display_name} <span className="text-[11px] font-medium text-gray-400">♡ {p.view_count}</span>
                                </div>
                                <div className="py-1.5 text-center text-xs text-[#5B4E7A]">{p.age ? `${p.age}세` : ' '}</div>
                            </button>
                        ))}
                    </div>
                )}
        </div>
    );
};

export default PublicProfileList;
