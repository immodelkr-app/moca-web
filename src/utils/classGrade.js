// 클래스 신청 가능 등급 (moca_classes.target_grade)
// ALL = 전체, 그 외에는 해당 등급 회원만 신청 가능 (상위 등급 포함 X)
export const CLASS_GRADE_OPTIONS = [
    { id: 'ALL', label: '전체등급신청', short: '전체등급', alias: [] },
    { id: 'GOLD', label: '골드회원등급', short: '골드멤버', alias: ['GOLD', '골드'] },
    { id: 'IMODEL', label: '아임모델 등급신청', short: '아임모델', alias: ['IMODEL', '아임모델'] },
    { id: 'EXCLUSIVE', label: '전속모델 등급신청', short: '전속모델', alias: ['VIP', '전속모델', 'EXCLUSIVE'] },
];

const findOption = (targetGrade) => CLASS_GRADE_OPTIONS.find(o => o.id === targetGrade);

export const getClassGradeLabel = (targetGrade) => `신청가능 등급: ${findOption(targetGrade)?.short || '전체등급'}`;

export const getClassGradeBadgeClass = (targetGrade) => {
    if (targetGrade === 'EXCLUSIVE') return 'bg-indigo-900 text-yellow-300';
    if (targetGrade === 'IMODEL') return 'bg-purple-100 text-purple-700';
    if (targetGrade === 'GOLD') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
};

// 신청 가능 여부. 불가하면 안내 문구를 함께 반환
export const checkClassGradeEligibility = (targetGrade, userGrade) => {
    const opt = findOption(targetGrade);
    if (!targetGrade || targetGrade === 'ALL' || !opt) return { ok: true };
    const myGrade = (userGrade || '').toUpperCase();
    // 'VIP'가 'IMODEL'에 포함되지 않도록 정확히 일치하는 등급만 인정 (한글 별칭은 부분일치)
    const ok = opt.alias.some(a => myGrade === a.toUpperCase() || (/[가-힣]/.test(a) && myGrade.includes(a)));
    return ok ? { ok: true } : { ok: false, message: `${opt.short} 등급만 신청 가능한 클래스입니다.` };
};
