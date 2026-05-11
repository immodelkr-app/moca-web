import React, { useState, useEffect } from 'react';
import { fetchHomepageSettings, updateHomepageSettings } from '../services/settingsService';

const Field = ({ label, hint, value, onChange, large }) => (
    <div className="mb-6">
        <label className="block text-sm font-bold text-[var(--moca-text-2)] mb-1">
            {label}
        </label>
        {hint && <p className="text-[11px] text-[var(--moca-text-3)] mb-2">{hint}</p>}
        {large ? (
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                rows={3}
                className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors resize-none"
            />
        ) : (
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-[var(--moca-surface-2)] border border-[var(--moca-border)] rounded-xl px-4 py-3 text-[var(--moca-text)] placeholder-[var(--moca-text-3)] focus:outline-none focus:border-[var(--moca-primary)] transition-colors"
            />
        )}
    </div>
);

const AdminHomepage = ({ setSuccessMsg, setError }) => {
    const [content, setContent] = useState({
        brandPrompt: '',
        heroBadgeGuest: 'I\'m Model Agency Platform',
        heroTitle1: '',
        heroTitle2: '',
        heroHighlightWord: '',
        heroSubtitle1: '',
        heroSubtitle2: '',
        feature1Icon: 'verified',
        feature1Title: '',
        feature1Desc: '',
        feature2Icon: 'group',
        feature2Title: '',
        feature2Desc: '',
        feature3Icon: 'auto_graph',
        feature3Title: '',
        feature3Desc: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        const { data, error } = await fetchHomepageSettings();
        if (error) {
            setError?.('홈화면 설정을 불러오는데 실패했습니다: ' + error.message);
        } else if (data) {
            setContent(prev => ({ ...prev, ...data }));
        }
        setIsLoading(false);
    };

    const update = (key, value) => {
        setContent(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError?.('');
        const { error } = await updateHomepageSettings(content);
        if (error) {
            setError?.('설정 저장에 실패했습니다: ' + error.message);
        } else {
            setSuccessMsg?.('✅ 홈화면 설정이 저장되었습니다.');
            setTimeout(() => setSuccessMsg?.(''), 3000);
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-[var(--moca-primary)]/30 border-t-[var(--moca-primary)] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="animate-fadeIn max-w-3xl mx-auto mt-4 space-y-6">
            <div className="bg-white border border-[var(--moca-border)] rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 border-b border-[var(--moca-border)] pb-4">
                    <span className="material-symbols-outlined text-[var(--moca-primary)] text-3xl">home</span>
                    <div>
                        <h2 className="text-xl font-black text-[var(--moca-text)]">홈화면 관리</h2>
                        <p className="text-sm text-[var(--moca-text-3)] mt-1">홈화면의 텍스트와 설정을 변경합니다.</p>
                    </div>
                </div>

                <div className="space-y-8">
                    <section className="bg-[var(--moca-bg)] p-6 rounded-2xl border border-[var(--moca-border)]">
                        <h2 className="text-lg font-bold text-[var(--moca-text)] flex items-center gap-2 mb-4">
                            ✨ 브랜딩 컨셉 및 프롬프트
                        </h2>
                        <Field
                            label="AI 브랜딩 프롬프트"
                            hint="이 앱의 핵심 성격과 톤앤매너를 정의하세요."
                            value={content.brandPrompt}
                            onChange={v => update('brandPrompt', v)}
                            large
                        />
                    </section>

                    <section className="bg-[var(--moca-bg)] p-6 rounded-2xl border border-[var(--moca-border)]">
                        <h2 className="text-lg font-bold text-[var(--moca-text)] flex items-center gap-2 mb-4">
                            🏠 히어로 섹션 설정
                        </h2>
                        <Field 
                            label="히어로 뱃지" 
                            value={content.heroBadgeGuest} 
                            onChange={v => update('heroBadgeGuest', v)} 
                        />
                        <Field 
                            label="메인 슬로건 (첫 줄)" 
                            value={content.heroTitle1} 
                            onChange={v => update('heroTitle1', v)} 
                        />
                        <Field 
                            label="브랜드 타이틀 (둘째 줄)" 
                            value={content.heroTitle2} 
                            onChange={v => update('heroTitle2', v)} 
                            large
                        />
                        <Field 
                            label="강조 키워드" 
                            value={content.heroHighlightWord} 
                            onChange={v => update('heroHighlightWord', v)} 
                        />
                        <Field 
                            label="부제목 (첫 줄)" 
                            value={content.heroSubtitle1} 
                            onChange={v => update('heroSubtitle1', v)} 
                        />
                        <Field 
                            label="부제목 (둘째 줄)" 
                            value={content.heroSubtitle2} 
                            onChange={v => update('heroSubtitle2', v)} 
                        />
                    </section>

                    <section className="bg-[var(--moca-bg)] p-6 rounded-2xl border border-[var(--moca-border)]">
                        <h2 className="text-lg font-bold text-[var(--moca-text)] flex items-center gap-2 mb-4">
                            🃏 주요 기능 카드 설정
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-4 p-4 bg-white/50 rounded-xl border border-[var(--moca-border)]">
                                <h3 className="font-bold text-sm text-[var(--moca-primary)]">기능 1</h3>
                                <Field label="아이콘" hint="Material Icon 이름" value={content.feature1Icon} onChange={v => update('feature1Icon', v)} />
                                <Field label="제목" value={content.feature1Title} onChange={v => update('feature1Title', v)} />
                                <Field label="설명" value={content.feature1Desc} onChange={v => update('feature1Desc', v)} large />
                            </div>
                            <div className="space-y-4 p-4 bg-white/50 rounded-xl border border-[var(--moca-border)]">
                                <h3 className="font-bold text-sm text-[var(--moca-primary)]">기능 2</h3>
                                <Field label="아이콘" hint="Material Icon 이름" value={content.feature2Icon} onChange={v => update('feature2Icon', v)} />
                                <Field label="제목" value={content.feature2Title} onChange={v => update('feature2Title', v)} />
                                <Field label="설명" value={content.feature2Desc} onChange={v => update('feature2Desc', v)} large />
                            </div>
                            <div className="space-y-4 p-4 bg-white/50 rounded-xl border border-[var(--moca-border)]">
                                <h3 className="font-bold text-sm text-[var(--moca-primary)]">기능 3</h3>
                                <Field label="아이콘" hint="Material Icon 이름" value={content.feature3Icon} onChange={v => update('feature3Icon', v)} />
                                <Field label="제목" value={content.feature3Title} onChange={v => update('feature3Title', v)} />
                                <Field label="설명" value={content.feature3Desc} onChange={v => update('feature3Desc', v)} large />
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-gradient-to-r from-[var(--moca-accent)] to-[var(--moca-primary)] text-black font-black py-3 px-8 rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {isSaving ? (
                                '저장 중...'
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">save</span>
                                    설정 저장
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminHomepage;
