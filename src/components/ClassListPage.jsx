import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchClasses } from '../services/classService';
import { supabase } from '../services/supabaseClient';

import { getUser, syncUserGrade } from '../services/userService';

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
        // 1. 유저 정보 (등급 확인용) - 최신 등급 DB 동기화
        await syncUserGrade();
        const localUser = getUser();
        if (localUser && localUser.id) {
            setCurrentUser({ id: localUser.id, grade: localUser.grade || 'SILVER' });

            // 2. 내가 신청한 클래스 목록
            const { data: apps } = await supabase
                .from('class_applications')
                .select('class_id')
                .eq('user_id', localUser.id);
            if (apps) setMyApplications(apps.map(a => a.class_id));
        } else if (localUser) {
            setCurrentUser({ id: localUser.id, grade: localUser.grade || 'SILVER' });
        }

        // 3. 클래스 목록
        const { data } = await fetchClasses();
        if (data) setClasses(data);
        setLoading(false);
    };

    const getPriceForMe = (pricing) => {
        if (!pricing || pricing.length === 0) return null;
        if (!currentUser || !currentUser.grade) return pricing[0];

        const myGrade = currentUser.grade.toUpperCase();
        let searchTerms = [myGrade];

        if (myGrade === 'GUEST' || myGrade === 'MEMBER') searchTerms.push('일반', '비회원', '기본', '베이직');
        if (myGrade === 'SILVER') searchTerms.push('실버', 'SILVER');
        if (myGrade === 'GOLD') searchTerms.push('골드', 'GOLD');
        if (myGrade === 'VIP' || myGrade === 'VVIP') searchTerms.push('VIP', 'VVIP', '브이아이피', '전속모델', '전속');

        const p = pricing.find(item => 
            searchTerms.some(term => item.grade_label.toUpperCase().includes(term))
        );
        
        return p ? { price: p.price, label: p.grade_label } : { price: pricing[0].price, label: pricing[0].grade_label };
    };

    return (
        <div className="min-h-screen bg-[var(--moca-bg)] pb-24">
            {/* Header */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[var(--moca-border)] px-5 py-4 flex items-center gap-3">
                <button onClick={() => navigate(-1)} className="material-symbols-outlined text-[var(--moca-text-2)]">arrow_back</button>
                <h1 className="text-lg font-black text-[var(--moca-text)]">모카 클래스</h1>
            </div>

            <div className="px-5 py-8">
                {/* Banner */}
                <div className="bg-gradient-to-br from-[#9333EA] to-[#7C3AED] rounded-3xl p-6 mb-8 text-white shadow-xl shadow-[#9333EA]/20 relative overflow-hidden">
                    <div className="relative z-10">
                        <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-[10px] font-black mb-3 uppercase tracking-wider backdrop-blur-md border border-white/20">Education</span>
                        <h2 className="text-2xl font-black mb-2 tracking-tight">성장을 위한 특권</h2>
                        <p className="text-indigo-100 text-[13px] font-bold">오직 아임모델 멤버만을 위한 프라이빗 클래스</p>
                    </div>
                    <span className="material-symbols-outlined absolute -bottom-4 -right-2 text-[100px] text-white/10 rotate-[-15deg]">school</span>
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
                            const myPriceInfo = getPriceForMe(cls.class_pricing);
                            const isApplied = myApplications.includes(cls.id);
                            
                            return (
                                <div 
                                    key={cls.id} 
                                    onClick={() => navigate(`/home/class/${cls.id}`)}
                                    className="bg-white rounded-3xl overflow-hidden shadow-moca-sm active:scale-[0.98] transition-all relative border border-[#E8E0FA]"
                                >
                                    {isApplied && (
                                        <div className="absolute top-4 right-4 z-10 bg-[#7C3AED] text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                            신청완료
                                        </div>
                                    )}
                                    {/* 이미지 영역 축소 */}
                                    <div className="aspect-[2/1] w-full bg-[#F8F5FF] relative overflow-hidden">
                                        {cls.image_url ? (
                                            <img src={cls.image_url} alt={cls.title} className="w-full h-full object-cover object-top opacity-90" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[#E8E0FA] text-6xl">school</span>
                                            </div>
                                        )}
                                        {/* 오버레이 제거됨 */}
                                    </div>
                                    
                                    {/* 정보 영역 (흰색 배경) */}
                                    <div className="p-6">
                                        <div className="mb-4">
                                            <span className="inline-block px-3 py-1 rounded-full bg-[#F3E8FF] text-[#7C3AED] text-[10px] font-black mb-3">
                                                {cls.schedule_type === 'weekly' ? '정기강좌' : '원데이'}
                                            </span>
                                            {/* 보라색 계열 텍스트 적용 */}
                                            <h3 className="text-[#5B4E7A] font-black text-[18px] sm:text-xl leading-snug mb-2 break-keep">{cls.title}</h3>
                                            <p className="text-[#7C3AED] text-[13px] font-bold flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                                {cls.class_date}
                                            </p>
                                        </div>

                                        <div className="border-t border-[#E8E0FA] pt-4 mt-2 flex items-center justify-between">
                                            <div className="space-y-1.5 w-full">
                                                <p className="text-[11px] text-[#9CA3AF] font-bold flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                    {cls.location}
                                                </p>
                                                <div className="flex items-center justify-between w-full">
                                                    <div className="flex items-center gap-2">
                                                        {myPriceInfo ? (
                                                            <>
                                                                <span className="text-[10px] bg-[#EDE8FF] text-[#7C3AED] px-2 py-0.5 rounded-md font-black inline-block align-middle mr-1.5">
                                                                    {myPriceInfo.label}
                                                                </span>
                                                                <span className="text-[18px] font-black text-[#7C3AED] tracking-tight align-middle">
                                                                    ₩{myPriceInfo.price.toLocaleString()}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="text-[13px] font-black text-[#7C3AED]">로그인 필요</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 bg-[#F8F5FF] px-3 py-1.5 rounded-full text-[#7C3AED]">
                                                        <span className="text-[11px] font-black">수강신청</span>
                                                        <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
