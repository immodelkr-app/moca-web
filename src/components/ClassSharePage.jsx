import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { fetchClasses } from '../services/classService';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.immodel.mocapp';
const IS_NATIVE_APP = Capacitor.isNativePlatform();
const IS_ANDROID_WEB = !IS_NATIVE_APP && /android/i.test(navigator.userAgent || '');

// 앱 안(웹뷰)이면 바로 클래스 상세로, 안드로이드 웹이면 intent 링크로 앱 실행(미설치 시 구글플레이),
// 그 외(PC/iOS)는 웹 클래스 상세로 이동
function getApplyHref(classId) {
    const path = `home/class/${classId}`;
    if (IS_ANDROID_WEB) {
        return `intent://${path}#Intent;scheme=immodel;package=com.immodel.mocapp;S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;
    }
    return `/${path}`;
}

// D-day 계산 (ClassListPage.jsx와 동일한 로직)
function getDday(cls) {
    const now = new Date();
    let targetDate = null;

    if (cls.schedule_type === 'one_time' && cls.event_datetime) {
        targetDate = new Date(cls.event_datetime);
    } else if (cls.schedule_type === 'weekly' && cls.day_of_week?.length > 0) {
        const today = now.getDay();
        const sortedDays = [...cls.day_of_week].sort((a, b) => a - b);
        let nextDay = sortedDays.find(d => d > today);
        if (nextDay === undefined) nextDay = sortedDays[0];
        let daysUntil = nextDay - today;
        if (daysUntil <= 0) daysUntil += 7;
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysUntil);
        if (cls.end_date && targetDate > new Date(cls.end_date)) return null;
    }

    if (!targetDate) return null;

    const diffMs = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return null;
    if (diffDays === 0) return { label: 'D-DAY', type: 'today' };
    if (diffDays <= 3) return { label: `D-${diffDays}`, type: 'urgent' };
    if (diffDays <= 6) return { label: `D-${diffDays}`, type: 'warning' };
    return { label: `D-${diffDays}`, type: 'normal' };
}

const ClassSharePage = () => {
    const navigate = useNavigate();
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClasses().then(({ data }) => {
            setClasses(data || []);
            setLoading(false);
        });
    }, []);

    const activeClasses = classes.filter(c => (c.status || 'active') === 'active');

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#F8F5FF] to-white pb-16">
            {/* 헤더 */}
            <div className="px-6 pt-14 pb-8 text-center bg-gradient-to-br from-[#1F1235] via-[#3B2A5E] to-[#5B3E99] rounded-b-[40px] shadow-lg">
                <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 mb-3">
                    <span className="text-[13px]">🎓</span>
                    <span className="text-white/90 text-[11px] font-black tracking-wide">MOCA CLASS</span>
                </div>
                <h1 className="text-white font-black text-2xl leading-tight mb-2 break-keep">
                    지금 진행 중인<br />모카클래스를 확인해보세요
                </h1>
                <p className="text-white/60 text-xs font-bold">
                    광고모델 활동에 필요한 실전 클래스, 아임모델 모카에서 신청하세요
                </p>
            </div>

            <div className="px-5 pt-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#9CA3AF]">
                        <span className="material-symbols-outlined text-4xl animate-spin mb-3">progress_activity</span>
                        <p className="text-sm font-bold">클래스를 불러오는 중...</p>
                    </div>
                ) : activeClasses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-[#9CA3AF]">
                        <span className="material-symbols-outlined text-5xl mb-3 opacity-20">school</span>
                        <p className="text-sm font-bold">현재 진행 중인 클래스가 없어요</p>
                        <p className="text-xs mt-1">곧 새로운 클래스로 찾아올게요!</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {activeClasses.map((cls) => {
                            const dday = getDday(cls);
                            const ddayColors = {
                                normal: 'bg-blue-500',
                                warning: 'bg-amber-500',
                                urgent: 'bg-red-500',
                                today: 'bg-red-500 animate-pulse',
                            };
                            return (
                                <div key={cls.id} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#E8E0FA]">
                                    <div className="aspect-[2/1] w-full bg-[#F8F5FF] relative overflow-hidden">
                                        {cls.image_url ? (
                                            <img src={cls.image_url} alt={cls.title} className="w-full h-full object-cover object-top" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[#E8E0FA] text-6xl">school</span>
                                            </div>
                                        )}
                                        {dday && (
                                            <div className={`absolute top-3 left-3 z-10 ${ddayColors[dday.type]} text-white px-3 py-1.5 rounded-full text-[11px] font-black shadow-lg`}>
                                                {dday.label}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-6">
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            <span className="inline-block px-3 py-1 rounded-full bg-[#F3E8FF] text-[#7C3AED] text-[10px] font-black">
                                                {cls.schedule_type === 'weekly' ? '정기강좌' : '원데이'}
                                            </span>
                                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black ${
                                                cls.target_grade === 'EXCLUSIVE' ? 'bg-indigo-900 text-yellow-300' :
                                                cls.target_grade === 'GOLD' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                {cls.target_grade === 'EXCLUSIVE' ? '신청가능 등급: 전속모델' :
                                                 cls.target_grade === 'GOLD' ? '신청가능 등급: 골드멤버' : '신청가능 등급: 전체등급'}
                                            </span>
                                        </div>
                                        <h3 className="text-[#1F1235] font-black text-lg leading-snug mb-2 break-keep">{cls.title}</h3>
                                        {cls.description && (
                                            <p className="text-[#5B4E7A] text-xs leading-relaxed mb-3 line-clamp-2 break-keep">{cls.description}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                            {cls.class_date && (
                                                <p className="text-[#7C3AED] text-[13px] font-bold flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                                    {cls.class_date.replace(/(\d{1,2}:\d{2}):\d{2}$/, '$1')}
                                                </p>
                                            )}
                                            {cls.location && (
                                                <p className="text-[#7C3AED] text-[13px] font-bold flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                                                    {cls.location}
                                                </p>
                                            )}
                                        </div>
                                        <a
                                            href={getApplyHref(cls.id)}
                                            onClick={(e) => {
                                                if (IS_ANDROID_WEB) return; // intent 링크는 브라우저에 맡김
                                                e.preventDefault();
                                                navigate(`/home/class/${cls.id}`);
                                            }}
                                            className="mt-4 w-full flex items-center justify-center gap-1.5 py-3.5 rounded-xl font-black text-[14px] bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white shadow-md shadow-purple-400/20 active:scale-[0.98] transition-all"
                                        >
                                            앱에서 신청하기
                                            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 하단 앱 설치 유도 (앱 안에서는 숨김) */}
            {!IS_NATIVE_APP && <div className="px-5 mt-10">
                <div className="bg-white rounded-3xl border border-[#E8E0FA] p-6 text-center shadow-sm">
                    <p className="text-[#1F1235] font-black text-base mb-1.5">모카 앱 설치하고</p>
                    <p className="text-[#5B4E7A] text-sm font-bold mb-5 break-keep">클래스 신청부터 에이전시 프로필 발송까지 한 번에</p>
                    <a
                        href={PLAY_STORE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#1F1235] text-white font-black text-sm shadow-lg active:scale-[0.98] transition-all"
                    >
                        <span className="material-symbols-outlined text-[18px]">download</span>
                        구글플레이에서 설치하기
                    </a>
                </div>
            </div>}
        </div>
    );
};

export default ClassSharePage;
