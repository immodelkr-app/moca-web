import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AffiliatedAgencies = () => {
    const navigate = useNavigate();

    const [partners, setPartners] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPartners = async () => {
            try {
                // 이 함수는 api 호출 관련 코드가 있을 경우 주석을 지우고 import 해주세요.
                // 여기선 db 연동을 가정하여 import된 fetchPartners를 호출하도록 구성했습니다.
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#3A0C5C] via-[#1C0A35] to-[#0A0514] text-white p-6 pb-32">
            {/* Header */}
            <header className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <h1 className="text-xl font-black">모카 제휴혜택</h1>
            </header>

            {/* Content Area */}
            <div className="max-w-2xl mx-auto space-y-8">

                {/* Intro Banner */}
                <div className="rounded-3xl border border-[#D4AF37]/30 bg-gradient-to-br from-[#D4AF37]/10 to-transparent p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 blur-[50px] rounded-full translate-x-1/2 -translate-y-1/2 animate-pulse" />
                    <span className="material-symbols-outlined text-[48px] text-[#D4AF37] mb-4">stars</span>
                    <h2 className="text-2xl font-black mb-2">프리미엄 제휴 안내</h2>
                    <p className="text-white/60 text-sm leading-relaxed break-keep">
                        MOCA 멤버십 회원만을 위한 특별한 제휴 혜택입니다.<br />
                        제휴사 방문 시 각 업체의 안내에 따라 할인을 받으실 수 있습니다.
                    </p>
                </div>

                {/* Partners List */}
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin"></div>
                    </div>
                ) : partners.length === 0 ? (
                    <div className="py-12 text-center text-white/40">
                        진행 중인 제휴 혜택이 없습니다.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {partners.map((partner, pIdx) => (
                            <div key={pIdx} className="bg-[#1a1a24] rounded-2xl overflow-hidden border border-white/10 flex flex-col hover:border-white/20 transition-all group shadow-lg">
                                {/* Image Header */}
                                {partner.imgUrl ? (
                                    (() => {
                                        const ImageWrapper = partner.homepageLink ? 'a' : 'div';
                                        const wrapperProps = partner.homepageLink
                                            ? { href: partner.homepageLink, target: '_blank', rel: 'noopener noreferrer', title: `${partner.name} 홈페이지 방문` }
                                            : {};
                                        return (
                                            <ImageWrapper {...wrapperProps} className={`aspect-[4/3] w-full relative overflow-hidden bg-black/50 block${partner.homepageLink ? ' cursor-pointer' : ''}`}>
                                                <img
                                                    src={partner.imgUrl}
                                                    alt={partner.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    onError={(e) => { e.target.style.display = 'none'; }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a24] via-transparent to-transparent"></div>
                                                {partner.homepageLink && (
                                                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                                                        <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                                            홈페이지 방문
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute top-3 right-3 bg-[#1D996D] text-white px-3 py-1 rounded-full text-[11px] font-black shadow-[0_4px_10px_rgba(29,153,109,0.3)] flex items-center gap-1 backdrop-blur-md">
                                                    <span className="material-symbols-outlined text-[14px]">sell</span>
                                                    {partner.discount}
                                                </div>
                                            </ImageWrapper>
                                        );
                                    })()
                                ) : (
                                    <div className="h-24 w-full bg-gradient-to-br from-white/5 to-transparent flex items-center justify-between px-5 relative">
                                        <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-[#A78BFA]">
                                            <span className="material-symbols-outlined text-[24px]">{partner.icon}</span>
                                        </div>
                                        <div className="bg-[#1D996D]/20 text-[#1D996D] border border-[#1D996D]/30 px-3 py-1 rounded-full text-[11px] font-bold">
                                            {partner.discount}
                                        </div>
                                    </div>
                                )}

                                {/* Content */}
                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="mb-4">
                                        <h4 className="text-lg font-black text-white/90 mb-1 flex items-center gap-2">
                                            {partner.name}
                                            {partner.category === 'hair_makeup' && <span className="text-[10px] text-white/40 font-normal border border-white/10 px-1.5 py-0.5 rounded">뷰티/케어</span>}
                                            {partner.category === 'studio' && <span className="text-[10px] text-white/40 font-normal border border-white/10 px-1.5 py-0.5 rounded">스튜디오</span>}
                                            {partner.category === 'skincare' && <span className="text-[10px] text-white/40 font-normal border border-white/10 px-1.5 py-0.5 rounded">피부관리</span>}
                                            {partner.category === 'cafe' && <span className="text-[10px] text-white/40 font-normal border border-white/10 px-1.5 py-0.5 rounded">카페</span>}
                                        </h4>
                                        <p className="text-sm text-white/50 leading-relaxed line-clamp-2">{partner.desc}</p>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-white/10 flex flex-col gap-2 mb-3">
                                        <div className="flex items-start gap-2 text-white/60 text-xs font-medium">
                                            <span className="material-symbols-outlined text-[14px] opacity-70 mt-0.5">location_on</span>
                                            <span className="break-keep leading-snug">{partner.location || '위치 정보 없음'}</span>
                                        </div>
                                        {partner.phone && (
                                            <div className="flex items-center gap-2 text-white/60 text-xs">
                                                <span className="material-symbols-outlined text-[14px] opacity-70">call</span>
                                                <a href={`tel:${partner.phone}`} className="hover:text-white transition-colors">{partner.phone}</a>
                                            </div>
                                        )}
                                        {partner.homepageLink && (
                                            <div className="flex items-center gap-2 text-[#6C63FF] text-xs font-medium">
                                                <span className="material-symbols-outlined text-[14px]">link</span>
                                                <a href={partner.homepageLink} target="_blank" rel="noopener noreferrer" className="hover:underline line-clamp-1">
                                                    홈페이지 방문
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <a
                                            href={partner.mapLink || `https://map.naver.com/v5/search/${partner.location || partner.name}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1.5 bg-[#03C75A]/10 hover:bg-[#03C75A]/20 text-[#03C75A] px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-[#03C75A]/20 shadow-sm w-full"
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
