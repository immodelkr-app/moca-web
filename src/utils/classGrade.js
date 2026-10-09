// 클래스 신청 가능 등급 (classes.target_grade)
// 'ALL' = 전체, 그 외에는 선택한 등급 회원만 신청 가능 (상위 등급 자동 포함 X)
// 여러 등급은 쉼표로 저장 (예: 'GOLD,IMODEL')
export const CLASS_GRADE_OPTIONS = [
    { id: 'ALL', label: '전체등급신청', short: '전체등급', alias: [] },
    { id: 'GOLD', label: '골드회원등급', short: '골드멤버', alias: ['GOLD', '골드'] },
    { id: 'IMODEL', label: '아임모델 등급신청', short: '아임모델', alias: ['IMODEL', '아임모델'] },
    { id: 'EXCLUSIVE', label: '전속모델 등급신청', short: '전속모델', alias: ['VIP', '전속모델', 'EXCLUSIVE'] },
];

export const parseClassGrades = (targetGrade) => {
    const ids = (targetGrade || 'ALL').split(',').map(s => s.trim()).filter(id => CLASS_GRADE_OPTIONS.some(o => o.id === id));
    return ids.length === 0 || ids.includes('ALL') ? ['ALL'] : ids;
};

// 관리자 체크박스 토글: 전체 선택 시 나머지 해제, 개별 등급 선택 시 전체 해제, 모두 해제하면 전체로 복귀
export const toggleClassGrade = (targetGrade, id) => {
    if (id === 'ALL') return 'ALL';
    const current = parseClassGrades(targetGrade).filter(g => g !== 'ALL');
    const next = current.includes(id) ? current.filter(g => g !== id) : [...current, id];
    return next.length === 0 ? 'ALL' : CLASS_GRADE_OPTIONS.map(o => o.id).filter(g => next.includes(g)).join(',');
};

const shortOf = (id) => CLASS_GRADE_OPTIONS.find(o => o.id === id)?.short;

export const getClassGradeLabel = (targetGrade) =>
    `신청가능 등급: ${parseClassGrades(targetGrade).map(shortOf).join(' · ')}`;

export const getClassGradeBadgeClass = (targetGrade) => {
    const grades = parseClassGrades(targetGrade);
    if (grades.length > 1) return 'bg-purple-100 text-purple-700';
    if (grades[0] === 'EXCLUSIVE') return 'bg-indigo-900 text-yellow-300';
    if (grades[0] === 'IMODEL') return 'bg-purple-100 text-purple-700';
    if (grades[0] === 'GOLD') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
};

// 신청 가능 여부. 불가하면 안내 문구를 함께 반환
export const checkClassGradeEligibility = (targetGrade, userGrade) => {
    const grades = parseClassGrades(targetGrade);
    if (grades[0] === 'ALL') return { ok: true };
    const myGrade = (userGrade || '').toUpperCase();
    // 영문 등급은 정확히 일치(VIP가 IMODEL에 섞이지 않도록), 한글 별칭은 부분일치
    const ok = grades.some(id => CLASS_GRADE_OPTIONS.find(o => o.id === id).alias
        .some(a => myGrade === a.toUpperCase() || (/[가-힣]/.test(a) && myGrade.includes(a))));
    return ok ? { ok: true } : { ok: false, message: `${grades.map(shortOf).join('·')} 등급만 신청 가능한 클래스입니다.` };
};
