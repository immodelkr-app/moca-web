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

export const FONT_OPTIONS = [
    { id: 'Pretendard', name: '프리텐다드 (기본)', family: "'Pretendard', sans-serif" },
    { id: 'GmarketSans', name: 'Gmarket Sans (제목강조)', family: "'GmarketSansMedium', 'GmarketSans', sans-serif" },
    { id: 'SUITE', name: 'SUITE (부드러움)', family: "'SUITE', sans-serif" },
    { id: 'BlackHanSans', name: '블랙한산 (강렬함)', family: "'Black Han Sans', sans-serif" },
    { id: 'NotoSansKR', name: 'Noto Sans KR (깔끔함)', family: "'Noto Sans KR', sans-serif" },
];

export const FONT_SIZE_OPTIONS = [
    { id: 'sm', label: '작게', heroClass: 'text-xl md:text-2xl' },
    { id: 'md', label: '보통', heroClass: 'text-2xl md:text-3xl' },
    { id: 'lg', label: '크게', heroClass: 'text-3xl md:text-4xl' },
    { id: 'xl', label: '매우 크게', heroClass: 'text-4xl md:text-5xl' },
];

export const GRADIENT_OPTIONS = [
    { id: 'purple', name: '퍼플', from: '#9333EA', to: '#C084FC', style: 'from-[#9333EA] to-[#C084FC]', text: 'text-[#9333EA]' },
    { id: 'blue', name: '블루', from: '#2563EB', to: '#38BDF8', style: 'from-[#2563EB] to-[#38BDF8]', text: 'text-[#2563EB]' },
    { id: 'sunset', name: '선셋', from: '#EA580C', to: '#FBBF24', style: 'from-[#EA580C] to-[#FBBF24]', text: 'text-[#EA580C]' },
    { id: 'emerald', name: '에메랄드', from: '#059669', to: '#34D399', style: 'from-[#059669] to-[#34D399]', text: 'text-[#059669]' },
    { id: 'rose', name: '로즈', from: '#E11D48', to: '#F472B6', style: 'from-[#E11D48] to-[#F472B6]', text: 'text-[#E11D48]' },
];

export const HIGHLIGHT_STYLE_OPTIONS = [
    { id: 'gradient', label: '그라데이션' },
    { id: 'solid', label: '단색' },
    { id: 'underline', label: '밑줄' },
    { id: 'glow', label: '네온 글로우' },
];

const AdminHomepage = ({ setSuccessMsg, setError }) => {
    const [content, setContent] = useState({
        brandPrompt: '',
        heroBadgeGuest: 'I\'m Model Agency Platform',
        heroTitle1: '',
        heroTitle2: '',
        heroHighlightWord: '',
        heroSubtitle1: '',
        heroSubtitle2: '',
        heroFontFamily: 'Pretendard',
        heroFontSize: 'md',
        heroHighlightGradient: 'purple',
        heroHighlightStyle: 'gradient',
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
                                hint="이 앱의 핵심 성격과 톤앤매너를 정의하세요. (입력 후 아래 [설정 저장] 버튼을 누르시면 적용됩니다)"
                                value={content.brandPrompt}
                                onChange={v => update('brandPrompt', v)}
                                large
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="bg-[#9333EA] text-white font-black py-2 px-4 rounded-xl shadow hover:bg-[#7C3AED] transition-all disabled:opacity-50 flex items-center gap-1.5 text-xs"
                                >
                                    <span className="material-symbols-outlined text-[14px]">save</span>
                                    {isSaving ? '저장 중...' : '프롬프트 저장'}
                                </button>
                            </div>
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

                        <section className="bg-[var(--moca-bg)] p-4 rounded-2xl border border-[var(--moca-border)] space-y-4">
                            <h2 className="text-md font-bold text-[var(--moca-text)] flex items-center gap-2 mb-1">
                                🎨 타이포그래피 & 폰트 스타일 설정
                            </h2>

                            {/* 글꼴 선택 */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">
                                    메인 타이틀 글꼴
                                </label>
                                <select
                                    value={content.heroFontFamily || 'Pretendard'}
                                    onChange={(e) => update('heroFontFamily', e.target.value)}
                                    className="w-full bg-white border border-[var(--moca-border)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--moca-text)] focus:outline-none focus:border-[var(--moca-primary)]"
                                >
                                    {FONT_OPTIONS.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 글자 크기 */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">
                                    타이틀 크기
                                </label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {FONT_SIZE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => update('heroFontSize', opt.id)}
                                            className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                (content.heroFontSize || 'md') === opt.id
                                                    ? 'bg-[var(--moca-primary)] text-white border-[var(--moca-primary)] shadow-sm'
                                                    : 'bg-white text-[var(--moca-text-2)] border-[var(--moca-border)] hover:bg-purple-50'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 강조 테마 색상 */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">
                                    강조 키워드 컬러 테마
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {GRADIENT_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => update('heroHighlightGradient', opt.id)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                                                (content.heroHighlightGradient || 'purple') === opt.id
                                                    ? 'ring-2 ring-[var(--moca-primary)] border-transparent bg-white shadow-sm'
                                                    : 'bg-white border-[var(--moca-border)] hover:opacity-80'
                                            }`}
                                        >
                                            <span
                                                className="w-3.5 h-3.5 rounded-full inline-block shadow-inner"
                                                style={{ background: `linear-gradient(135deg, ${opt.from}, ${opt.to})` }}
                                            />
                                            <span>{opt.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 강조 스타일 */}
                            <div>
                                <label className="block text-xs font-bold text-[var(--moca-text-2)] mb-1.5">
                                    강조 효과 스타일
                                </label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {HIGHLIGHT_STYLE_OPTIONS.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => update('heroHighlightStyle', opt.id)}
                                            className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                (content.heroHighlightStyle || 'gradient') === opt.id
                                                    ? 'bg-[var(--moca-text)] text-white border-[var(--moca-text)] shadow-sm'
                                                    : 'bg-white text-[var(--moca-text-2)] border-[var(--moca-border)] hover:bg-purple-50'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
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
                            {(() => {
                                const currentFont = FONT_OPTIONS.find(f => f.id === content.heroFontFamily) || FONT_OPTIONS[0];
                                const currentSize = FONT_SIZE_OPTIONS.find(s => s.id === content.heroFontSize) || FONT_SIZE_OPTIONS[1];
                                const currentGrad = GRADIENT_OPTIONS.find(g => g.id === content.heroHighlightGradient) || GRADIENT_OPTIONS[0];
                                const currentStyle = content.heroHighlightStyle || 'gradient';

                                const getHighlightClass = () => {
                                    if (currentStyle === 'solid') return currentGrad.text;
                                    if (currentStyle === 'underline') return `${currentGrad.text} underline underline-offset-4 decoration-4`;
                                    if (currentStyle === 'glow') return `text-transparent bg-clip-text bg-gradient-to-r ${currentGrad.style} drop-shadow-[0_2px_10px_rgba(147,51,234,0.5)]`;
                                    return `text-transparent bg-clip-text bg-gradient-to-r ${currentGrad.style}`;
                                };

                                return (
                                    <section className="pt-12 pb-10 px-5 text-center">
                                        <span className="inline-block px-3 py-1 rounded-full bg-[#F3E8FF] text-[#9333EA] text-[10px] font-black tracking-widest mb-3 uppercase">
                                            {content.heroBadgeGuest}
                                        </span>
                                        <h1
                                            className={`${currentSize.heroClass} font-black text-[#1F1235] leading-tight tracking-tight mb-4`}
                                            style={{ fontFamily: currentFont.family }}
                                        >
                                            {content.heroTitle1?.split('\n').map((line, i) => (
                                                <React.Fragment key={i}>{line}<br /></React.Fragment>
                                            ))}
                                            <span className={`inline-block ${getHighlightClass()}`}>
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
                                );
                            })()}

                            {/* Features Section */}
                            <section className="py-10 bg-white">
                                <div className="max-w-6xl mx-auto px-5">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-2xl bg-[#F8F5FF] border border-[#E8E0FA]">
                                            <span className="material-symbols-outlined text-[#9333EA] text-2xl mb-2">{content.feature1Icon || 'apartment'}</span>
                                            <h3 className="text-sm font-black text-[#1F1235] mb-1">{content.feature1Title || '중요 모델 에이전시 리스트'}</h3>
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
                                            <h3 className="text-sm font-black text-[#1F1235] mb-1">{content.feature3Title || '투어일지 & 캘린더'}</h3>
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
