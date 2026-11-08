import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchPublicProfileDetail } from '../services/publicProfileService';

const Row = ({ label, value }) => value ? (
    <div className="flex py-1.5 text-sm"><span className="w-20 text-gray-400 shrink-0">{label}</span><span className="text-[#1F1235] break-all">{value}</span></div>
) : null;

const PublicProfileDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [p, setP] = useState(undefined);

    useEffect(() => { fetchPublicProfileDetail(id).then(setP); }, [id]);

    if (p === undefined) return <p className="text-center text-sm text-gray-400 py-10">불러오는 중...</p>;
    if (!p) return <p className="text-center text-sm text-gray-400 py-10">비공개이거나 없는 프로필입니다.</p>;

    const ig = p.instagram_id?.replace(/^@/, '');
    return (
        <div className="px-4 py-5">
            <button onClick={() => navigate(-1)} className="text-xs font-bold text-[#7C3AED] mb-3">← 목록</button>
            <h1 className="text-xl font-black text-[#1F1235] mb-3">{p.display_name} <span className="text-sm text-[#5B4E7A] font-bold">{p.activity_year && `${p.activity_year}년생`}</span> <span className="text-xs text-gray-400 font-medium">조회 {p.view_count}</span></h1>
            {p.photo_urls?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto snap-x mb-4">
                    {p.photo_urls.map(u => <img key={u} src={u} alt="" className="h-72 rounded-xl snap-start object-cover shrink-0" />)}
                </div>
            )}
            {p.limited ? (
                <p className="text-xs text-[#7C3AED] bg-[#F8F5FF] border border-[#E8E0FA] rounded-xl px-3 py-2.5 mb-4">
                    상세 프로필(신체정보·경력·연락처)은 모카 인증 업체만 볼 수 있어요.
                </p>
            ) : (<>
            <div className="bg-white rounded-2xl border border-[#E8E0FA] px-4 py-2 mb-4">
                <Row label="성별" value={p.gender} />
                <Row label="신장" value={p.height && `${p.height}cm`} />
                <Row label="체중" value={p.weight && `${p.weight}kg`} />
                <Row label="신발" value={p.shoe_size && `${p.shoe_size}mm`} />
                <Row label="특기" value={p.specialties} />
                <Row label="인스타" value={ig && <a href={`https://instagram.com/${ig}`} target="_blank" rel="noreferrer" className="text-[#7C3AED] underline">@{ig}</a>} />
                <Row label="포트폴리오" value={p.portfolio_link && <a href={p.portfolio_link} target="_blank" rel="noreferrer" className="text-[#7C3AED] underline">{p.portfolio_link}</a>} />
                <Row label="연락처" value={p.phone && <a href={`tel:${p.phone}`} className="text-[#7C3AED] underline">{p.phone}</a>} />
            </div>
            {p.intro && <Section title="소개" text={p.intro} />}
            {p.career && <Section title="경력" text={p.career} />}
            </>)}
        </div>
    );
};

const Section = ({ title, text }) => (
    <div className="mb-4">
        <h2 className="text-sm font-black text-[#1F1235] mb-1">{title}</h2>
        <p className="text-sm text-[#3B2F55] whitespace-pre-wrap">{text}</p>
    </div>
);

export default PublicProfileDetail;
