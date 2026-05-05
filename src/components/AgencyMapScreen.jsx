import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchAgencies } from '../services/agencyService';

// leaflet 기본 마커 아이콘 설정
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// 커스텀 보라색 핀
const customIcon = L.divIcon({
    html: `<div style="
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #9333EA, #C084FC);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(147, 51, 234, 0.4);
    "></div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
});

const AgencyMapScreen = () => {
    const navigate = useNavigate();
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAgencies().then(data => {
            setAgencies(data.filter(a => a.lat && a.lng));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    // 강남/압구정 중심 (디폴트)
    const centerLat = 37.5215;
    const centerLng = 127.0285;

    return (
        <div className="flex flex-col min-h-screen bg-[#F8F5FF]">
            {/* Header */}
            <header className="bg-white px-5 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-[#E8E0FA] shadow-sm">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F8F5FF] text-[#1F1235] hover:bg-[#EDE8FF] transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                    </button>
                    <div>
                        <h1 className="text-[18px] font-black tracking-tight text-[#1F1235]">내 주변 에이전시 지도</h1>
                        <p className="text-[12px] text-[#9CA3AF] font-bold mt-0.5">강남/압구정 주요 에이전시 위치</p>
                    </div>
                </div>
            </header>

            {/* Map Area */}
            <div className="flex-1 relative z-0">
                {loading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">
                        <div className="w-10 h-10 rounded-full border-4 border-[#9333EA] border-t-transparent animate-spin mb-4" />
                        <p className="text-[#9CA3AF] font-bold text-sm">지도를 불러오는 중입니다...</p>
                    </div>
                ) : (
                    <MapContainer
                        center={[centerLat, centerLng]}
                        zoom={14}
                        className="w-full h-full min-h-[calc(100vh-80px)]"
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {agencies.map((agency, i) => (
                            <Marker
                                key={i}
                                position={[parseFloat(agency.lat), parseFloat(agency.lng)]}
                                icon={customIcon}
                            >
                                <Popup>
                                    <div style={{ minWidth: '180px', fontFamily: 'Pretendard, sans-serif' }}>
                                        <p style={{ fontWeight: 900, fontSize: '15px', marginBottom: '4px', color: '#1F1235' }}>
                                            {agency.name}
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', lineHeight: 1.4 }}>
                                            {agency.address}
                                        </p>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <a
                                                href={`https://map.naver.com/v5/search/${encodeURIComponent(agency.address || agency.name)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '6px 0',
                                                    background: '#03C75A',
                                                    color: 'white',
                                                    borderRadius: '8px',
                                                    fontSize: '11px',
                                                    fontWeight: 900,
                                                    textDecoration: 'none'
                                                }}
                                            >
                                                N 네이버 지도
                                            </a>
                                            <button
                                                onClick={() => navigate('/home/diary')}
                                                style={{
                                                    flex: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: '6px 0',
                                                    background: '#9333EA',
                                                    color: 'white',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    fontSize: '11px',
                                                    fontWeight: 900,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                방문 기록
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                )}
            </div>
            
            {/* 하단 플로팅 배너 */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[340px] bg-white/95 backdrop-blur-md border border-[#E8E0FA] rounded-2xl p-4 shadow-2xl z-[400] flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#F3E8FF] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#9333EA] text-[24px]">location_on</span>
                </div>
                <div>
                    <p className="text-[#1F1235] text-[13px] font-black leading-tight">내 주변 에이전시 탐색하기</p>
                    <p className="text-[#9CA3AF] text-[11px] font-bold mt-0.5 leading-snug">마커를 누르면 길찾기와 방문기록이 가능합니다.</p>
                </div>
            </div>
        </div>
    );
};

export default AgencyMapScreen;
