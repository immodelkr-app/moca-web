import React from 'react';
import { getDdayInfo } from '../services/modelCastingService';

const TONE_CLASS = {
    closed: 'bg-[#F3F4F6] text-[#6B7280]',
    urgent: 'bg-[#FEE2E2] text-[#DC2626]',
    normal: 'bg-[#EDE9FE] text-[#7C3AED]',
};

/**
 * 마감 디데이 칩 — D-5 / D-DAY / 마감. 마감일이 없는 공고는 아무것도 그리지 않는다.
 */
const CastingDdayBadge = ({ casting }) => {
    const info = getDdayInfo(casting);
    if (!info) return null;
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${TONE_CLASS[info.tone]}`}>{info.label}</span>
    );
};

export default CastingDdayBadge;
