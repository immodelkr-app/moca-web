import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { fetchAgencyDiaryFeed } from '../services/diaryService';
import { AI_TREND_CATEGORIES as CATEGORIES } from '../constants/diaryCategories';

const AgencyTrendModal = ({ agency, userGrade, onClose }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');
    const [feed, setFeed] = useState([]);

    // 아임모델/전속모델 등급부터 '다양한 회원들의 방문 후기' 원문 공개
    const isDeepAccess = userGrade === 'IMODEL' || userGrade === 'VIP';

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            setError('');
            try {
                const { data, error: fnErr } = await supabase.functions.invoke('ai-diary-summary', {
                    body: { agencyName: agency.name }
                });
                if (fnErr) throw fnErr;
                if (!data?.success) throw new Error(data?.error || 'AI 분석에 실패했습니다.');
                if (!cancelled) setSummary(data.summary);
            } catch (err) {
                if (!cancelled) setError(err.message || '분석 중 오류가 발생했습니다.');
            } finally {
                if (!cancelled) setLoading(false);
            }

            if (isDeepAccess) {
                const rows = await fetchAgencyDiaryFeed(agency.name, 8);
                if (!cancelled) setFeed(rows);
            }
        })();

        return () => { cancelled = true; };
    }, [agency.name, isDeepAccess]);

    const goToClass = () => {
        onClose();
        navigate('/home/class');
    };

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E8E0FA] flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between bg-gradient-to-r from-violet-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md shadow-purple-500/20">
                            <span className="text-2xl">🤖</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-[#1F1235] leading-tight">AI 에이전시 동향분석</h2>
                            <p className="text-[12px] text-violet-500 font-bold mt-0.5">{agency.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors shrink-0"
                    >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <span className="material-symbols-outlined text-[32px] text-violet-400 animate-spin">progress_activity</span>
                            <p className="text-gray-400 text-sm font-bold">최근 투어일지를 분석하고 있어요...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                            <span className="material-symbols-outlined text-[40px] text-gray-300">inbox</span>
                            <p className="text-gray-400 text-sm font-bold">{error}</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2.5">
                                {CATEGORIES.map(item => (
                                    <div key={item.key} className={`p-3.5 rounded-xl border ${item.color}`}>
                                        <p className="text-[11px] font-black mb-1">{item.icon} {item.label}</p>
                                        <p className="text-[13px] leading-relaxed">{summary?.[item.key] || '정보 없음'}</p>
                                    </div>
                                ))}
                            </div>

                            {/* 회원별 방문 후기 - IMODEL/VIP 전용, GOLD는 잠금 티저 */}
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2.5">
                                    다양한 회원들의 방문 후기
                                </h3>
                                {isDeepAccess ? (
                                    feed.length > 0 ? (
                                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                                            {feed.map((d) => (
                                                <div key={d.id} className="bg-[#F9FAFB] p-3 rounded-xl border border-gray-100">
                                                    <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1">
                                                        <span className="font-bold text-violet-500">{d.nickname || '익명'}</span>
                                                        <span>{d.date || ''}</span>
                                                    </div>
                                                    <p className="text-[12px] text-[#1F1235] leading-relaxed line-clamp-2">{d.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 font-bold py-3">아직 등록된 방문 후기가 없습니다.</p>
                                    )
                                ) : (
                                    <div className="relative rounded-2xl overflow-hidden border border-[#F3E8FF]">
                                        <div className="p-4 blur-[3px] select-none pointer-events-none opacity-70 bg-[#F9FAFB]">
                                            <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1">
                                                <span className="font-bold text-violet-500">●●●●</span>
                                                <span>0월 00일</span>
                                            </div>
                                            <p className="text-[12px] text-[#1F1235]">●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●●</p>
                                        </div>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40 px-5 text-center">
                                            <span className="text-2xl">🌸</span>
                                            <p className="text-[#1F1235] text-xs font-black leading-snug">
                                                다양한 회원들의 생생한 방문 후기는<br />아임모델 등급부터 확인할 수 있어요
                                            </p>
                                            <button
                                                onClick={goToClass}
                                                className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white text-[11px] font-black shadow-md shadow-pink-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                🌸 아임모델 등급 안내 보기
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <p className="text-[10px] text-gray-300 text-center">최근 60일 투어일지 기반 · Gemini AI 분석</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgencyTrendModal;
