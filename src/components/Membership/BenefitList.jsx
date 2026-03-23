import React, { useState, useEffect } from 'react';
import { fetchPartners } from '../../services/adminService';

const CATEGORIES = [
    { id: 'all', label: '전체' },
    { id: 'hair_makeup', label: '헤어·메이크업' },
    { id: 'studio', label: '스튜디오' },
    { id: 'skincare', label: '피부관리' },
    { id: 'cafe', label: '카페' }
];

const mockPartners = [
    {
        id: 1,
        name: '에이치 메이크업',
        category: 'hair_makeup',
        img: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop',
        discount: '전 시술 20% 할인',
        desc: '프리미엄 헤어 & 메이크업 스튜디오',
        location: '강남구 신사동'
    },
    {
        id: 2,
        name: '스튜디오 모카',
        category: 'studio',
        img: 'https://images.unsplash.com/photo-1600607686527-6fb886090705?q=80&w=400&auto=format&fit=crop',
        discount: '프로필 촬영 30% 할인',
        desc: '자연광 호리존 스튜디오',
        location: '성동구 성수동'
    },
    {
        id: 3,
        name: '루미너스 뷰티',
        category: 'skincare',
        img: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=400&auto=format&fit=crop',
        discount: '피부관리 베이직 코스 무료',
        desc: '연예인 전담 스킨케어 샵',
        location: '강남구 청담동'
    },
    {
        id: 4,
        name: '카페 아웃사이드',
        category: 'cafe',
        img: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=400&auto=format&fit=crop',
        discount: '모든 음료 1+1',
        desc: '조용하고 분위기 좋은 감성 카페',
        location: '용산구 한남동'
    }
];

const BenefitList = () => {
    const [activeTab, setActiveTab] = useState('all');
    const [partners, setPartners] = useState(mockPartners);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getPartners = async () => {
            try {
                const { data, error } = await fetchPartners();
                if (error) {
                    console.warn('Failed to fetch partners, using fallback data:', error);
                } else if (data && data.length > 0) {
                    setPartners(data);
                }
            } catch (err) {
                console.warn('Error fetching partners:', err);
            } finally {
                setLoading(false);
            }
        };
        getPartners();
    }, []);

    const filteredPartners = (activeTab === 'all'
        ? partners
        : partners.filter(p => p.category === activeTab)
    ).slice(0, 4); // Show only the most recent 4


    return (
        <div className="w-full mt-8">
            <h3 className="text-xl font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#A78BFA]">storefront</span>
                최근 등록 제휴업체
            </h3>

            {/* 카테고리 탭 */}
            <div className="flex overflow-x-auto hide-scrollbar gap-2 mb-6 pb-2">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveTab(cat.id)}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeTab === cat.id
                            ? 'bg-gradient-to-r from-[#818CF8] to-[#6C63FF] text-white shadow-lg shadow-indigo-500/20'
                            : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* 리스트 그리드 */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPartners.map(partner => (
                        <div key={partner.id} className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-colors">
                            {(() => {
                                const ImageWrapper = partner.homepage_link ? 'a' : 'div';
                                const wrapperProps = partner.homepage_link
                                    ? { href: partner.homepage_link, target: '_blank', rel: 'noopener noreferrer', title: `${partner.name} 홈페이지 방문` }
                                    : {};
                                return (
                                    <ImageWrapper {...wrapperProps} className={`aspect-[4/3] w-full overflow-hidden relative block${partner.homepage_link ? ' cursor-pointer' : ''}`}>
                                        <img
                                            src={partner.img_url || partner.img || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?q=80&w=400&auto=format&fit=crop'}
                                            alt={partner.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                        {partner.homepage_link && (
                                            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                                                <div className="bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                                                    홈페이지 방문
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute bottom-3 left-4">
                                            <span className="px-2 py-0.5 bg-[#818CF8]/90 text-white text-[10px] font-bold rounded flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">discount</span>
                                                {partner.discount}
                                            </span>
                                        </div>
                                    </ImageWrapper>
                                );
                            })()}
                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="text-lg font-bold text-white leading-tight">{partner.name}</h4>
                                        <p className="text-xs text-white/40 mt-1">{partner.desc}</p>
                                    </div>
                                </div>

                                {/* 추가 정보 표기 */}
                                <div className="mt-3 flex flex-col gap-1.5 border-t border-white/10 pt-3">
                                    <div className="flex items-start gap-2 text-[10px] sm:text-xs text-white/60">
                                        <span className="material-symbols-outlined text-[14px] opacity-70 mt-0.5">location_on</span>
                                        <span className="font-medium break-keep leading-snug">{partner.location}</span>
                                    </div>
                                    {partner.phone && (
                                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-white/60">
                                            <span className="material-symbols-outlined text-[14px] opacity-70">call</span>
                                            <a href={`tel:${partner.phone}`} className="hover:text-white transition-colors">{partner.phone}</a>
                                        </div>
                                    )}
                                    {partner.homepage_link && (
                                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-[#6C63FF] font-medium">
                                            <span className="material-symbols-outlined text-[14px]">link</span>
                                            <a href={partner.homepage_link} target="_blank" rel="noopener noreferrer" className="hover:underline line-clamp-1">
                                                홈페이지 방문
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-[10px] sm:text-xs text-white/40 font-bold uppercase tracking-widest">
                                        <span className="material-symbols-outlined text-[14px]">storefront</span>
                                        모카 제휴사
                                    </span>
                                    <a
                                        href={partner.map_link || `https://map.naver.com/v5/search/${partner.location || partner.name}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#03C75A]/10 hover:bg-[#03C75A]/20 text-[#03C75A] transition-colors font-bold text-xs border border-[#03C75A]/20 shadow-sm"
                                    >
                                        <span className="font-extrabold text-[12px] bg-[#03C75A] text-white w-4 h-4 flex items-center justify-center rounded-sm">N</span>
                                        네이버 지도
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {!loading && filteredPartners.length === 0 && (
                <div className="py-12 text-center text-white/40 flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl">inventory_2</span>
                    <p>해당 카테고리의 제휴업체가 없습니다.</p>
                </div>
            )}
        </div>
    );
};

export default BenefitList;
