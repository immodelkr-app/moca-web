// 투어일지 작성 섹션 & AI 에이전시 동향분석 카테고리 공통 정의.
// key를 일치시켜 회원이 작성하는 섹션과 AI 분석 결과가 1:1로 매핑되도록 한다.
const FIELD_META = [
    {
        key: 'auditioning',
        icon: '🎬',
        label: '영상촬영 진행',
        color: 'bg-purple-50 border-purple-200 text-purple-700',
        placeholder: '촬영 순서를 기재해주세요',
        rows: 3,
    },
    {
        key: 'tips',
        icon: '📋',
        label: '영상촬영 중 특이사항',
        color: 'bg-blue-50 border-blue-200 text-blue-700',
        placeholder: '촬영자의 주문내용을 기재해주세요',
        rows: 2,
    },
    {
        key: 'atmosphere',
        icon: '🏢',
        label: '에이전시 분위기',
        color: 'bg-green-50 border-green-200 text-green-700',
        placeholder: '촬영자의 친절도와 대기실 분위기 등을 기재해주세요',
        rows: 2,
    },
    {
        key: 'memo',
        icon: '📝',
        label: '기타메모',
        color: 'bg-amber-50 border-amber-200 text-amber-700',
        placeholder: '그 외 메모사항을 기재해주세요',
        rows: 2,
    },
];

// 투어일지 작성 폼에서 사용하는 4개 입력 섹션
export const DIARY_GUIDE_FIELDS = FIELD_META;

// AI 에이전시 동향분석 팝업에서 사용하는 5개 카테고리 (입력 섹션 4개 + AI 자동 생성 한줄요약)
export const AI_TREND_CATEGORIES = [
    ...FIELD_META.map(({ key, icon, label, color }) => ({ key, icon, label, color })),
    { key: 'overall', icon: '⚡', label: '한줄 요약', color: 'bg-orange-50 border-orange-200 text-orange-700' },
];

// 섹션별 입력값을 하나의 텍스트로 합산 (기존 저장 스키마인 content 컬럼 그대로 사용)
export const buildContentFromGuide = (fields) => {
    return DIARY_GUIDE_FIELDS
        .filter(f => fields[f.key]?.trim())
        .map(f => `${f.icon} ${f.label}\n${fields[f.key].trim()}`)
        .join('\n\n');
};

// 합산된 텍스트를 다시 섹션별로 분리 (수정 화면에서 사용)
export const parseGuideContent = (content) => {
    const result = emptyGuideFields();
    if (!content) return result;

    DIARY_GUIDE_FIELDS.forEach(field => {
        const marker = `${field.icon} ${field.label}`;
        const idx = content.indexOf(marker);
        if (idx === -1) return;
        const afterMarker = content.slice(idx + marker.length).trimStart();
        let end = afterMarker.length;
        for (const other of DIARY_GUIDE_FIELDS) {
            if (other.key === field.key) continue;
            const otherMarker = `${other.icon} ${other.label}`;
            const otherIdx = afterMarker.indexOf(otherMarker);
            if (otherIdx !== -1 && otherIdx < end) end = otherIdx;
        }
        result[field.key] = afterMarker.slice(0, end).trimEnd();
    });

    return result;
};

// 기존 content가 섹션 가이드 형식으로 작성되었는지 판단
export const isGuideFormat = (content) => {
    if (!content) return false;
    return DIARY_GUIDE_FIELDS.some(f => content.includes(`${f.icon} ${f.label}`));
};

export const emptyGuideFields = () => {
    const obj = {};
    DIARY_GUIDE_FIELDS.forEach(f => { obj[f.key] = ''; });
    return obj;
};
