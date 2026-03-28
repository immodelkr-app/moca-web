import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AffiliatedAgencies = () => {
    const navigate = useNavigate();

    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPartners = async () => {
            try {
                const { fetchPartners } = await import('../services/adminService');
                const { data, error } = await fetchPartners();

                if (data && data.length > 0) {
                    const iconMap = {
                        'hair_makeup': 'face_retouching_natural',
                        'studio': 'photo_camera',
                        'skincare': 'spa',
                        'cafe': 'local_cafe',
                        'other': 'stars'
                    };

                    const formattedData = data.map(p => ({
                        name: p.name,
                        category: p.category,
                        desc: p.description || p.discount_text || '',
                        discount: p.discount_text || '혜택',
                        icon: iconMap[p.category] || iconMap['other'],
                        imgUrl: p.img_url || p.image_url || null,
                        location: p.location,
                        mapLink: p.map_link,
                        phone: p.phone,
                        homepageLink: p.homepage_link
                    }));

                    setPartners(formattedData);
                } else {
                    setPartners([]);
                }
            } catch (err) {
                console.warn('Error loading partners in AffiliatedAgencies:', err);
                setPartners([]);
            } finally {
                setLoading(false);
            }
        };
        loadPartners();
    }, []);

    const categoryLabel = {
        'hair_makeup': '뷰티/케어',
        'studio': '스튜디오',
        'skincare': '피부관리',
        'cafe': '카페',
        'other': '기타'
    };

    return (
        <div className="min-h-screen pb-28" style={{ backgroundColor: 'var(--moca-bg)' }}>

            {/* ── 상단 헤더 배너 ── */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#EDE8FF] via-[#F3F0FF] to-[#E8F0FF] border-b border-[#E8E0FA] px-5 pt-6 pb-5">
                {/* 장식 블러 */}
                <div className="absolute -top-8 -right-8 w-40 h-40 bg-[#9333EA]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-[#C084FC]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 rounded-full bg-white/80 border border-[#E8E0FA] flex items-center justify-center hover:bg-[#F3E8FF] transition-colors shadow-sm"
                        >
                            <span className="material-symbols-outlined text-[20px] text-[#7C3AED]">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-[#1F1235] tracking-tight">모카 제휴혜택</h1>
                            <p className="text-xs text-[#9CA3AF] font-medium mt-0.5">멤버 전용 파트너 할인 혜택</p>
                        </div>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-[#9333EA] to-[#C084FC] rounded-2xl flex items-center justify-center shadow-lg shadow-[#9333EA]/25">
                        <span className="material-symbols-outlined text-white text-[22px]">stars</span>
                    </div>
                </div>
            </div>

            {/* ── 인트로 배너 ── */}
            <div className="px-4 pt-5 max-w-2xl mx-auto">
                <div className="bg-white border border-[#E8E0FA] rounded-2xl p-4 flex items-start gap-3 shadow-sm mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#F3E8FF] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[#9333EA] text-[20px]">info</span>
                    </div>
                    <p className="text-[#5B4E7A] text-xs leading-relaxed break-keep">
                        MOCA 멤버십 회원만을 위한 특별한 제휴 혜택입니다.<br />
                        제휴사 방문 시 각 업체의 안내에 따라 할인을 받으실 수 있습니다.
                    </p>
                </div>

                {/* ── 파트너 리스트 ── */}
                {loading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white rounded-2xl border border-[#E8E0FA] h-48 animate-pulse" />
                        ))}
                    </div>
                ) : partners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 bg-[#F3E8FF] rounded-full flex items-center justify-center mb-3">
                            <span className="material-symbols-outlined text-[#C084FC] text-[32px]">store</span>
                        </div>
                        <p className="text-[#5B4E7A] font-bold text-sm">진행 중인 제휴 혜택이 없습니다.</p>
                        <p className="text-[#9CA3AF] text-xs mt-1">새로운 파트너사를 준비 중입니다!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {partners.map((partner, pIdx) => (
                            <div
                                key={pIdx}
                                className="bg-white rounded-2xl overflow-hidden border border-[#E8E0FA] flex flex-col hover:border-[#9333EA]/30 hover:shadow-lg hover:shadow-[#9333EA]/8 transition-all group shadow-sm"
                            >
                                {/* 이미지 헤더 */}
                                {partner.imgUrl ? (
                                    (() => {
                                        const ImageWrapper = partner.homepageLink ? 'a' : 'div';
                                        const wrapperProps = partner.homepageLink
                                            ? { href: partner.homepageLink, target: '_blank', rel: 'noopener noreferrer', title: `${partner.name} 홈페이지 방문` }
                                            : {};
                                        return (
                                            <ImageWrapper
                                                {...wrapperProps}
                                                className={`aspect-[4/3] w-full relative overflow-hidden bg-[#F8F5FF] block${partner.homepageLink ? ' cursor-pointer' : ''}`}
                                            >
                                                <img
                                                    src={partner.imgUrl}
                                                    alt={partner.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                                                {partner.homepageLink && (
                                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/15 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                                        <div className="bg-white/90 backdrop-blur-sm text-[#1F1235] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm">
                                                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                                            홈페이지 방문
                                                        </div>
                                                    </div>
                                                )}
                                                {/* 할인 뱃지 */}
                                                <div className="absolute top-3 right-3 bg-[#9333EA] text-white px-3 py-1 rounded-full text-[11px] font-black shadow-lg flex items-center gap-1 backdrop-blur-md">
                                                    <span className="material-symbols-outlined text-[14px]">sell</span>
                                                    {partner.discount}
                                                </div>
                                            </ImageWrapper>
                                        );
                                    })()
                                ) : (
                                    <div className="h-24 w-full bg-gradient-to-br from-[#F3E8FF] to-[#EDE8FF] flex items-center justify-between px-5 relative">
                                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm border border-[#E8E0FA]">
                                            <span className="material-symbols-outlined text-[24px] text-[#9333EA]">{partner.icon}</span>
                                        </div>
                                        <div className="bg-[#9333EA] text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-sm">
                                            {partner.discount}
                                        </div>
                                    </div>
                                )}

                                {/* 콘텐츠 */}
                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="mb-3">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <h4 className="text-[#1F1235] font-black text-base">{partner.name}</h4>
                                            {partner.category && (
                                                <span className="text-[10px] text-[#9333EA] font-bold bg-[#F3E8FF] px-2 py-0.5 rounded-full border border-[#E8E0FA]">
                                                    {categoryLabel[partner.category] || '기타'}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[#5B4E7A] leading-relaxed line-clamp-2">{partner.desc}</p>
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-[#E8E0FA] flex flex-col gap-2">
                                        {/* 위치 */}
                                        <div className="flex items-start gap-1.5 text-[#5B4E7A] text-xs">
                                            <span className="material-symbols-outlined text-[14px] text-[#9333EA] mt-0.5">location_on</span>
                                            <span className="break-keep leading-snug">{partner.location || '위치 정보 없음'}</span>
                                        </div>

                                        {/* 전화 */}
                                        {partner.phone && (
                                            <div className="flex items-center gap-1.5 text-[#5B4E7A] text-xs">
                                                <span className="material-symbols-outlined text-[14px] text-[#9333EA]">call</span>
                                                <a href={`tel:${partner.phone}`} className="hover:text-[#9333EA] transition-colors font-medium">{partner.phone}</a>
                                            </div>
                                        )}

                                        {/* 홈페이지 */}
                                        {partner.homepageLink && (
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#9333EA]">
                                                <span className="material-symbols-outlined text-[14px]">link</span>
                                                <a href={partner.homepageLink} target="_blank" rel="noopener noreferrer" className="hover:underline line-clamp-1">
                                                    홈페이지 방문
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* 네이버 지도 버튼 */}
                                    <div className="pt-3">
                                        <a
                                            href={partner.mapLink || `https://map.naver.com/v5/search/${partner.location || partner.name}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1.5 bg-[#F3E8FF] hover:bg-[#EDE8FF] text-[#7C3AED] px-3 py-2.5 rounded-xl text-xs font-bold transition-colors border border-[#E8E0FA] w-full"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <span className="font-extrabold text-[12px] bg-[#03C75A] text-white w-4 h-4 flex items-center justify-center rounded-sm">N</span>
                                            네이버 지도에서 보기
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AffiliatedAgencies;
