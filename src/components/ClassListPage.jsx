import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClasses } from '../services/classService';
import { supabase } from '../services/supabaseClient';

const ClassListPage = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [myApplications, setMyApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        // 1. 유저 정보 (등급 확인용)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: userData } = await supabase
                .from('users')
                .select('grade')
                .eq('id', user.id)
                .single();
            setCurrentUser({ id: user.id, grade: userData?.grade || 'SILVER' });

            // 2. 내가 신청한 클래스 목록
            const { data: apps } = await supabase
                .from('class_applications')
                .select('class_id')
                .eq('user_id', user.id);
            if (apps) setMyApplications(apps.map(a => a.class_id));
        }

        // 3. 클래스 목록
        const { data } = await fetchClasses();
        if (data) setClasses(data);
        setLoading(false);
    };

    const getPriceForMe = (pricing) => {
        if (!pricing || !currentUser) return null;
        const myGrade = currentUser.grade;
        const p = pricing.find(item => item.grade === myGrade);
        return p ? p.price : null;
    };

    return (
        <div className="min-h-screen bg-[var(--moca-bg)] pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[var(--moca-border)] px-5 py-4 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="material-symbols-outlined text-[var(--moca-text-2)]">arrow_back</button>
                <h1 className="text-lg font-black text-[var(--moca-text)]">모카 클래스</h1>
            </div>

            <div className="px-5 py-6">
                {/* Banner */}
                <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl p-6 mb-8 text-white shadow-xl shadow-indigo-500/20">
                    <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-[10px] font-black mb-2 uppercase tracking-wider">Education</span>
                    <h2 className="text-xl font-black mb-1">성장을 위한 완벽한 기회</h2>
                    <p className="text-indigo-100 text-xs font-bold">모카 전문 강사진의 클래스를 만나보세요.</p>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--moca-text-3)]">
                        <span className="material-symbols-outlined text-4xl animate-spin mb-3">progress_activity</span>
                        <p className="text-sm font-bold">클래스를 불러오는 중...</p>
                    </div>
                ) : classes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[var(--moca-text-3)]">
                        <span className="material-symbols-outlined text-5xl mb-3 opacity-20">school</span>
                        <p className="text-sm font-bold">진행 중인 클래스가 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {classes.map(cls => {
                            const myPrice = getPriceForMe(cls.class_pricing);
                            const isApplied = myApplications.includes(cls.id);
                            
                            return (
                                <div 
                                    key={cls.id} 
                                    onClick={() => navigate(`/home/class/${cls.id}`)}
                                    className="bg-white rounded-3xl overflow-hidden border border-[var(--moca-border)] shadow-sm active:scale-[0.98] transition-all relative"
                                >
                                    {isApplied && (
                                        <div className="absolute top-4 right-4 z-10 bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg">
                                            신청완료
                                        </div>
                                    )}
                                    <div className="aspect-[16/9] w-full bg-gray-100 relative">
                                        {cls.image_url ? (
                                            <img src={cls.image_url} alt={cls.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                                                <span className="material-symbols-outlined text- indigo-200 text-6xl">school</span>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                                            <span className="inline-block px-2 py-0.5 rounded-lg bg-indigo-500 text-white text-[9px] font-black mb-1">
                                                {cls.class_date.split(' ')[0]} {/* 날짜만 간략히 */}
                                            </span>
                                            <h3 className="text-white font-black text-lg line-clamp-1">{cls.title}</h3>
                                        </div>
                                    </div>
                                    <div className="p-5 flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[11px] text-[var(--moca-text-3)] font-bold flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                {cls.location}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1.5 py-0.5 rounded font-black border border-indigo-100">
                                                    {currentUser?.grade} 회원가
                                                </span>
                                                <span className="text-lg font-black text-[var(--moca-text)]">
                                                    {myPrice ? `${myPrice.toLocaleString()}원` : '문의'}
                                                </span>
                                            </div>
                                        </div>
                                        <button className="w-10 h-10 rounded-full bg-[var(--moca-surface-2)] flex items-center justify-center text-[var(--moca-text-3)]">
                                            <span className="material-symbols-outlined">chevron_right</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClassListPage;
