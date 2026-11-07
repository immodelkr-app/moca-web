// 공고 문구에서 이메일/전화번호를 뽑는 공용 헬퍼 (어드민 업체 연락처 모음, 홍보 메일 대상 목록에서 함께 사용)
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g;
const PHONE_RE = /(?:\+?82[-.\s]?)?0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}/g;

export const extractContacts = (text) => {
    const src = text || '';
    const emails = [...new Set(src.match(EMAIL_RE) || [])];
    const phones = [...new Set((src.replace(EMAIL_RE, ' ').match(PHONE_RE) || []).map((p) => p.trim()))];
    return { emails, phones };
};

// 공고 목록 → 이메일 1개당 1행(소문자 기준 중복 제거). 같은 이메일이 여러 공고에 있으면 최신 공고의 업체명을 쓴다.
export const buildOutreachRecipients = (castings) => {
    const sorted = [...(castings || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const map = new Map();
    for (const c of sorted) {
        const found = extractContacts(`${c.apply_guide || ''}\n${c.description || ''}`);
        const emails = [...new Set([...(c.apply_email ? c.apply_email.split(/[,\s]+/) : []), ...found.emails])];
        const companyName = c.companies?.company_name || c.producer_name || c.source_name || '';
        for (const raw of emails) {
            const email = raw.trim().toLowerCase();
            if (email && !map.has(email)) map.set(email, { email, companyName, castingTitle: c.title });
        }
    }
    return Array.from(map.values());
};
