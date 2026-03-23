import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// leaflet 기본 마커 아이콘 webpack 환경 수정
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// 커스텀 보라색 핀
const customIcon = L.divIcon({
    html: `<div style="
        width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #6C63FF, #A78BFA);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(108, 99, 255, 0.5);
    "></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -32],
});

const AgencyMap = ({ agencies }) => {
    const validAgencies = agencies.filter(
        a => a.lat && a.lng && !isNaN(parseFloat(a.lat)) && !isNaN(parseFloat(a.lng))
    );

    if (validAgencies.length === 0) return null;

    const centerLat = validAgencies.reduce((sum, a) => sum + parseFloat(a.lat), 0) / validAgencies.length;
    const centerLng = validAgencies.reduce((sum, a) => sum + parseFloat(a.lng), 0) / validAgencies.length;

    return (
        <div className="mx-5 md:mx-10 mb-10 max-w-7xl xl:mx-auto">
            {/* 헤더 */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#6C63FF]/20 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#818CF8] text-[20px]">map</span>
                </div>
                <div>
                    <h2 className="text-white font-black text-base lg:text-lg">전체 에이전시 지도</h2>
                    <p className="text-white/40 text-[10px] lg:text-xs mt-0.5">좌표가 등록된 {validAgencies.length}개 에이전시 위치</p>
                </div>
            </div>

            {/* 반응형: 모바일=지도만 / PC(lg이상)=좌측목록+우측지도 */}
            <div className="flex flex-col lg:flex-row gap-4 h-[400px] lg:h-[600px]">

                {/* 좌측: 에이전시 목록 — PC에서만 표시 */}
                <div
                    className="hidden lg:flex flex-col gap-3 w-[300px] flex-shrink-0 overflow-y-auto pr-2 custom-scrollbar bg-black/20 rounded-2xl p-4 border border-white/5"
                >
                    {validAgencies.map((agency, i) => (
                        <div
                            key={i}
                            className="bg-white/5 border border-white/10 hover:border-[#6C63FF]/40 rounded-xl p-3 transition-colors"
                        >
                            <div className="flex items-start gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#6C63FF] flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-white text-[10px] font-black">{i + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-black text-sm leading-tight truncate">{agency.name}</p>
                                    <p className="text-white text-xs mt-0.5 leading-snug line-clamp-2">{agency.address}</p>
                                    {agency.phone && (
                                        <a
                                            href={`tel:${agency.phone}`}
                                            className="text-[#818CF8] text-[10px] font-bold mt-1 block hover:underline"
                                        >
                                            📞 {agency.phone}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 우측(PC) / 전체(모바일): 지도 */}
                <div
                    className="flex-1 h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative z-10"
                >
                    <MapContainer
                        center={[centerLat, centerLng]}
                        zoom={13}
                        className="w-full h-full"
                        zoomControl={true}
                        scrollWheelZoom={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {validAgencies.map((agency, i) => (
                            <Marker
                                key={i}
                                position={[parseFloat(agency.lat), parseFloat(agency.lng)]}
                                icon={customIcon}
                            >
                                <Popup>
                                    <div style={{ minWidth: '160px', fontFamily: 'sans-serif' }}>
                                        <p style={{ fontWeight: 900, fontSize: '14px', marginBottom: '4px', color: '#1a1a2e' }}>
                                            {agency.name}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#666', marginBottom: '6px', lineHeight: 1.4 }}>
                                            {agency.address}
                                        </p>
                                        {agency.phone && (
                                            <p style={{ fontSize: '11px', color: '#6C63FF', fontWeight: 700 }}>
                                                📞 {agency.phone}
                                            </p>
                                        )}
                                        <a
                                            href={`https://map.naver.com/v5/search/${encodeURIComponent(agency.address || agency.name)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{
                                                display: 'inline-block',
                                                marginTop: '8px',
                                                padding: '4px 10px',
                                                background: '#03C75A',
                                                color: 'white',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                textDecoration: 'none'
                                            }}
                                        >
                                            N 네이버 지도
                                        </a>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>

            <p className="text-white/30 text-[11px] mt-3 text-center lg:text-left font-medium w-full">
                * 핀을 클릭하면 상세 주소 및 길찾기를 이용할 수 있습니다.
            </p>
        </div>
    );
};

export default AgencyMap;
