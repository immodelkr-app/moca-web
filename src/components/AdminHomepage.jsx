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
        <div className="animate-fadeIn max-w-7xl mx-auto mt-4 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Form */}
                <div className="lg:col-span-5 bg-white border border-[var(--moca-border)] rounded-2xl p-6 shadow-sm h-fit">
                    <div className="flex items-center gap-3 mb-6 border-b border-[var(--moca-border)] pb-4">
                        <span className="material-symbols-outlined text-[var(--moca-primary)] text-3xl">home</span>
                        <div>
                            <h2 className="text-xl font-black text-[var(--moca-text)]">홈화면 관리</h2>
                            <p className="text-sm text-[var(--moca-text-3)] mt-1">홈화면의 텍스트와 설정을 변경합니다.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <section className="bg-[var(--moca-bg)] p-4 rounded-2xl border border-[var(--moca-border)]">
                            <h2 className="text-md font-bold text-[var(--moca-text)] flex items-center gap-2 mb-3">
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

                        <section className="bg-[var(--moca-bg)] p-4 rounded-2xl border border-[var(--moca-border)]">
                            <h2 className="text-md font-bold text-[var(--moca-text)] flex items-center gap-2 mb-3">
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

                        <section className="bg-[var(--moca-bg)] p-4 rounded-2xl border border-[var(--moca-border)]">
                            <h2 className="text-md font-bold text-[var(--moca-text)] flex items-center gap-2 mb-3">
                                🃏 주요 기능 카드 설정
                            </h2>
                            
                            <div className="space-y-4">
                                <div className="p-3 bg-white/50 rounded-xl border border-[var(--moca-border)]">
                                    <h3 className="font-bold text-xs text-[var(--moca-primary)] mb-2">기능 1</h3>
                                    <Field label="아이콘" hint="Material Icon 이름" value={content.feature1Icon} onChange={v => update('feature1Icon', v)} />
                                    <Field label="제목" value={content.feature1Title} onChange={v => update('feature1Title', v)} />
                                    <Field label="설명" value={content.feature1Desc} onChange={v => update('feature1Desc', v)} large />
                                </div>
                                <div className="p-3 bg-white/50 rounded-xl border border-[var(--moca-border)]">
                                    <h3 className="font-bold text-xs text-[var(--moca-primary)] mb-2">기능 2</h3>
                                    <Field label="아이콘" hint="Material Icon 이름" value={content.feature2Icon} onChange={v => update('feature2Icon', v)} />
                                    <Field label="제목" value={content.feature2Title} onChange={v => update('feature2Title', v)} />
                                    <Field label="설명" value={content.feature2Desc} onChange={v => update('feature2Desc', v)} large />
                                </div>
                                <div className="p-3 bg-white/50 rounded-xl border border-[var(--moca-border)]">
                                    <h3 className="font-bold text-xs text-[var(--moca-primary)] mb-2">기능 3</h3>
                                    <Field label="아이콘" hint="Material Icon 이름" value={content.feature3Icon} onChange={v => update('feature3Icon', v)} />
                                    <Field label="제목" value={content.feature3Title} onChange={v => update('feature3Title', v)} />
                                    <Field label="설명" value={content.feature3Desc} onChange={v => update('feature3Desc', v)} large />
                                </div>
                            </div>
                        </section>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-gradient-to-r from-[var(--moca-accent)] to-[var(--moca-primary)] text-black font-black py-3 px-6 rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 text-sm"
                            >
                                {isSaving ? (
                                    '저장 중...'
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[16px]">save</span>
                                        설정 저장
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right: Preview */}
                <div className="lg:col-span-7 bg-white border border-[var(--moca-border)] rounded-2xl p-6 shadow-sm sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto hide-scrollbar">
                    <div className="flex items-center gap-3 mb-6 border-b border-[var(--moca-border)] pb-4">
                        <span className="material-symbols-outlined text-[var(--moca-accent)] text-3xl">visibility</span>
                        <div>
                            <h2 className="text-xl font-black text-[var(--moca-text)]">실시간 미리보기</h2>
                            <p className="text-sm text-[var(--moca-text-3)] mt-1">사용자에게 보여지는 화면입니다.</p>
                        </div>
                    </div>

                    {/* Mock Browser/Device Frame */}
                    <div className="border border-[var(--moca-border)] rounded-xl overflow-hidden shadow-lg">
                        {/* Browser Header */}
                        <div className="bg-[var(--moca-surface-2)] px-4 py-2 flex items-center gap-2 border-b border-[var(--moca-border)]">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <div className="bg-white rounded-md flex-1 mx-4 px-3 py-0.5 text-xs text-[var(--moca-text-3)] truncate">
                                https://immoca.kr
                            </div>
                        </div>

                        {/* Content (Mock AgencyLanding) */}
                        <div className="bg-[var(--moca-bg)] min-h-[500px] font-display overflow-y-auto" style={{ maxHeight: '600px' }}>
                            {/* Nav Bar Mock */}
                            <nav className="bg-white/80 backdrop-blur-md border-b border-[#E8E0FA] flex items-center justify-between px-5 py-3">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9333EA] to-[#C084FC] text-xl font-black tracking-tighter">MOCA</span>
                                <div className="flex items-center gap-2">
                                    <div className="text-[#5B4E7A] font-bold text-xs px-2 py-1">로그인</div>
                                    <div className="bg-[#9333EA] text-white px-3 py-1 rounded-full font-black text-xs">회원가입</div>
                                </div>
                            </nav>

                            {/* Hero Section */}
                            <section className="pt-12 pb-10 px-5 text-center">
                                <span className="inline-block px-3 py-1 rounded-full bg-[#F3E8FF] text-[#9333EA] text-[10px] font-black tracking-widest mb-3 uppercase">
                                    {content.heroBadgeGuest}
                                </span>
                                <h1 className="text-2xl md:text-3xl font-black text-[#1F1235] leading-tight tracking-tight mb-4">
                                    {content.heroTitle1?.split('\n').map((line, i) => (
                                        <React.Fragment key={i}>{line}<br /></React.Fragment>
                                    ))}
                                    <span className="text-[#9333EA]">
                                        {content.heroTitle2?.split('\n').map((line, i) => (
                                            <React.Fragment key={i}>{line}{i < content.heroTitle2.split('\n').length - 1 ? <br /> : ''}</React.Fragment>
                                        ))}
                                    </span>
                                </h1>
                                <p className="text-[#5B4E7A] text-xs max-w-lg mx-auto mb-6 leading-relaxed font-medium">
                                    {content.heroSubtitle1}
                                    <br />
                                    {content.heroSubtitle2}
                                </p>
                                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                                    <div className="w-full sm:w-auto px-5 py-2 rounded-full bg-[#9333EA] text-white font-black text-xs">
                                        에이전시 투어 시작하기
                                    </div>
                                    <div className="w-full sm:w-auto px-5 py-2 rounded-full bg-white border border-[#E8E0FA] text-[#1F1235] font-black text-xs">
                                        스마트 프로필 만들기
                                    </div>
                                </div>
                            </section>

                            {/* Features Section */}
                            <section className="py-10 bg-white">
                                <div className="max-w-6xl mx-auto px-5">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA]">
                                            <span className="material-symbols-outlined text-[#9333EA] text-2xl mb-2">{content.feature1Icon || 'apartment'}</span>
                                            <h3 className="text-sm font-black text-[#1F1235] mb-1">{content.feature1Title || '전국 에이전시 리스트'}</h3>
                                            <p className="text-[#5B4E7A] text-[10px] leading-relaxed font-medium">
                                                {content.feature1Desc}
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA]">
                                            <span className="material-symbols-outlined text-[#9333EA] text-2xl mb-2">{content.feature2Icon || 'forward_to_inbox'}</span>
                                            <h3 className="text-sm font-black text-[#1F1235] mb-1">{content.feature2Title || '간편 프로필 발송'}</h3>
                                            <p className="text-[#5B4E7A] text-[10px] leading-relaxed font-medium">
                                                {content.feature2Desc}
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA]">
                                            <span className="material-symbols-outlined text-[#9333EA] text-2xl mb-2">{content.feature3Icon || 'event_note'}</span>
                                            <h3 className="text-sm font-black text-[#1F1235] mb-1">{content.feature3Title || '모델 다이어리 & 캘린더'}</h3>
                                            <p className="text-[#5B4E7A] text-[10px] leading-relaxed font-medium">
                                                {content.feature3Desc}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminHomepage;
