import React, { useEffect, useState, useRef } from 'react';
import { fetchAgencies } from '../services/agencyService';

// ─────────────────────────────────────────────
// ▼ 설정 영역: 필요 시 여기만 수정하세요 ▼
// ─────────────────────────────────────────────

// 네이버 지도 API Client ID (index.html의 script src에도 동일하게 들어가야 합니다)
// const CLIENT_ID = '4u67nbu3xh'; // ← 변경 필요 시 여기 수정

// 지도 초기 중심 좌표 (서울 중심 기본값, 에이전시 데이터 로드 후 첫 번째 에이전시로 자동 이동)
const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }; // 서울 시청
const DEFAULT_ZOOM = 12;

// 레이아웃 상수
const MOBILE_NAV_H = 100; // 모바일 하단 네비게이션 높이(px) — Layout.jsx의 h-20 (80) + 여유
const PC_SIDEBAR_W = 256; // PC 왼쪽 사이드바 너비(px) — Layout.jsx의 w-64
const PC_TOP_H = 0;       // PC 상단 헤더 없음
const LG_BREAKPOINT = 1024;

// ─────────────────────────────────────────────

const MapView = () => {
    const [agencies, setAgencies] = useState([]);
    const [selectedAgency, setSelectedAgency] = useState(null);
    const [activeTab, setActiveTab] = useState('list'); // 모바일 탭: 'list' | 'map'
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= LG_BREAKPOINT);
    const [mapReady, setMapReady] = useState(false); // 지도 초기화 완료 여부

    // DOM refs
    const mapContainerRef = useRef(null); // ← 네이버 지도가 그려질 <div>
    const naverMapRef = useRef(null);     // navermaps.Map 인스턴스 보관
    const markersRef = useRef([]);

    // ──────────────────────────────────────────
    // 1. 반응형 감지
    // ──────────────────────────────────────────
    useEffect(() => {
        const handle = () => setIsDesktop(window.innerWidth >= LG_BREAKPOINT);
        window.addEventListener('resize', handle);
        return () => window.removeEventListener('resize', handle);
    }, []);

    // ──────────────────────────────────────────
    // 2. 에이전시 CSV 데이터 로드
    // ──────────────────────────────────────────
    useEffect(() => {
        let alive = true;
        fetchAgencies()
            .then(data => {
                if (!alive) return;
                const valid = data
                    .filter(a => a.lat && a.lng && !isNaN(+a.lat) && !isNaN(+a.lng))
                    .map((a, i) => ({ ...a, id: i + 1 }));
                setAgencies(valid);
                if (valid.length > 0) setSelectedAgency(valid[0]);
            })
            .catch(e => console.error('에이전시 로드 실패:', e));
        return () => { alive = false; };
    }, []);

    // ──────────────────────────────────────────
    // 3. 네이버 지도 초기화
    //    ★ 핵심 수정 사항:
    //    - mapContainerRef.current 가 DOM에 실제로 붙은 뒤 실행
    //    - 컨테이너에 명시적 width / height 를 inline style로 설정 (CSS보다 우선)
    //    - window.naver.maps 가 로드될 때까지 폴링
    // ──────────────────────────────────────────
    useEffect(() => {
        if (agencies.length === 0) return; // 데이터 없으면 대기

        let retryTimer = null;
        let alive = true;

        const initMap = () => {
            if (!alive) return;

            // DOM 요소 또는 Naver SDK 가 아직 준비 안 됐으면 재시도
            if (
                !mapContainerRef.current ||
                !window.naver ||
                !window.naver.maps
            ) {
                retryTimer = setTimeout(initMap, 150);
                return;
            }

            // 이미 지도가 렌더링됐으면 중복 생성 방지
            if (naverMapRef.current) return;

            // ★ 명시적 크기 설정: 이게 없으면 지도가 0px 높이로 렌더링됨
            const container = mapContainerRef.current;
            container.style.width = '100%';
            container.style.height = '100%';

            // 초기 중심 좌표 (첫 번째 에이전시 또는 기본값)
            const first = agencies[0];
            const initLat = first ? parseFloat(first.lat) : DEFAULT_CENTER.lat;
            const initLng = first ? parseFloat(first.lng) : DEFAULT_CENTER.lng;

            // ★ new naver.maps.Map() — DOM이 준비된 이후 호출
            const map = new window.naver.maps.Map(container, {
                center: new window.naver.maps.LatLng(initLat, initLng),
                zoom: DEFAULT_ZOOM,
                zoomControl: true,
                zoomControlOptions: {
                    position: window.naver.maps.Position.TOP_RIGHT,
                },
            });

            naverMapRef.current = map;
            setMapReady(true);

            // ── 마커 생성 ──────────────────────────────
            const infoWindow = new window.naver.maps.InfoWindow({ anchorSkew: true });

            agencies.forEach(agency => {
                const lat = parseFloat(agency.lat);
                const lng = parseFloat(agency.lng);
                if (isNaN(lat) || isNaN(lng)) return;

                const marker = new window.naver.maps.Marker({
                    position: new window.naver.maps.LatLng(lat, lng),
                    map,
                    title: agency.name,
                    icon: {
                        content: `<div style="
                            background:#1241a1;color:#fff;border-radius:50%;
                            width:36px;height:36px;
                            display:flex;align-items:center;justify-content:center;
                            font-size:16px;cursor:pointer;
                            box-shadow:0 2px 8px rgba(18,65,161,.5);
                            border:2px solid #fff;
                        ">📍</div>`,
                        anchor: new window.naver.maps.Point(18, 18),
                    },
                });

                window.naver.maps.Event.addListener(marker, 'click', () => {
                    setSelectedAgency(agency);
                    map.panTo(new window.naver.maps.LatLng(lat, lng));

                    const naverUrl = `https://map.naver.com/v5/search/${encodeURIComponent(agency.address || agency.name)}`;
                    infoWindow.setContent(`
                        <div style="padding:12px 14px;min-width:200px;font-family:'Manrope',sans-serif;line-height:1.5;">
                            <p style="font-weight:800;font-size:14px;margin:0 0 2px;color:#1a1a2e;">${agency.name}</p>
                            <p style="font-size:12px;color:#888;margin:0 0 3px;">${agency.category || ''}</p>
                            <p style="font-size:12px;color:#555;margin:0 0 8px;">${agency.address || ''}</p>
                            ${agency.phone ? `<a href="tel:${agency.phone}" style="font-size:12px;color:#1241a1;font-weight:700;display:block;margin-bottom:8px;">${agency.phone}</a>` : ''}
                            <a href="${naverUrl}" target="_blank" rel="noreferrer"
                                style="display:inline-flex;align-items:center;gap:6px;background:#03C75A;color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none;">
                                🗺️ 네이버 지도에서 보기
                            </a>
                        </div>
                    `);
                    infoWindow.open(map, marker);
                });

                markersRef.current.push(marker);
            });
        };

        // ★ DOM이 렌더링된 직후 실행 (setTimeout 0ms = 다음 이벤트 루프)
        retryTimer = setTimeout(initMap, 0);

        return () => {
            alive = false;
            if (retryTimer) clearTimeout(retryTimer);
        };
    }, [agencies]);

    // ──────────────────────────────────────────
    // 4. 선택 에이전시 → 지도 이동
    // ──────────────────────────────────────────
    useEffect(() => {
        if (!naverMapRef.current || !selectedAgency || !mapReady) return;
        try {
            naverMapRef.current.panTo(
                new window.naver.maps.LatLng(
                    parseFloat(selectedAgency.lat),
                    parseFloat(selectedAgency.lng)
                )
            );
        } catch (_) { /* SDK 아직 준비 안 됨 — 무시 */ }
    }, [selectedAgency, mapReady]);

    // ──────────────────────────────────────────
    // 5. 탭/창 전환 → 지도 리사이즈 강제 트리거
    // ──────────────────────────────────────────
    useEffect(() => {
        if (!naverMapRef.current || !mapReady) return;
        const t = setTimeout(() => {
            try {
                window.naver.maps.Event.trigger(naverMapRef.current, 'resize');
                if (selectedAgency) {
                    naverMapRef.current.setCenter(
                        new window.naver.maps.LatLng(
                            parseFloat(selectedAgency.lat),
                            parseFloat(selectedAgency.lng)
                        )
                    );
                }
            } catch (_) { /* 무시 */ }
        }, 300);
        return () => clearTimeout(t);
    }, [activeTab, isDesktop, mapReady]);

    // ──────────────────────────────────────────
    // 6. 핸들러
    // ──────────────────────────────────────────
    const handleSelect = (agency) => {
        setSelectedAgency(agency);
        if (!isDesktop) setActiveTab('map');
    };

    // ──────────────────────────────────────────
    // 7. 레이아웃 계산
    //    ★ position: fixed 사용 → 부모 overflow-y:auto 컨텍스트를 벗어남
    //    ★ 명시적 top / left / height / width 지정
    // ──────────────────────────────────────────
    const rootTop = 0;
    const rootLeft = isDesktop ? PC_SIDEBAR_W : 0;
    const rootBottom = isDesktop ? PC_TOP_H : MOBILE_NAV_H;

    const rootStyle = {
        position: 'fixed',          // ← Layout의 overflow-y:auto 를 탈출
        top: rootTop,
        left: rootLeft,
        right: 0,
        bottom: rootBottom,
        overflow: 'hidden',
        background: '#f5f5f5',
        zIndex: 10,
    };

    // 모바일 탭바
    const TAB_H = 48;
    const contentTop = isDesktop ? 0 : TAB_H;

    // 목록 패널
    const SIDEBAR_W = isDesktop ? 384 : '100%';
    const listVisible = isDesktop || activeTab === 'list';
    const mapVisible = isDesktop || activeTab === 'map';

    const listStyle = {
        position: 'absolute',
        top: contentTop,
        left: 0,
        bottom: 0,
        width: SIDEBAR_W,
        zIndex: isDesktop ? 20 : (listVisible ? 20 : 5),
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRight: isDesktop ? '1px solid #e5e7eb' : 'none',
        // 모바일: 탭에 따라 숨김/표시
        transform: (!isDesktop && !listVisible) ? 'translateX(-100%)' : 'none',
        transition: 'transform 0.25s ease',
    };

    const mapPanelStyle = {
        position: 'absolute',
        top: contentTop,
        left: isDesktop ? 384 : 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        // ★ 핵심: 명시적 크기를 여기서도 보장
        // (mapContainerRef 내부에서도 100%/100%로 설정하지만 이중 보장)
    };

    // ──────────────────────────────────────────
    // 8. 렌더
    // ──────────────────────────────────────────
    return (
        <div style={rootStyle}>

            {/* ── 모바일 탭 바 ── */}
            {!isDesktop && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    height: TAB_H, zIndex: 30,
                    background: '#fff', display: 'flex',
                    borderBottom: '1px solid #e5e7eb',
                }}>
                    {[
                        { id: 'list', label: '목록', icon: 'list' },
                        { id: 'map', label: '지도', icon: 'map' },
                    ].map(({ id, label, icon }) => (
                        <button key={id} onClick={() => setActiveTab(id)} style={{
                            flex: 1, height: '100%', background: 'none', border: 'none',
                            borderBottom: activeTab === id ? '2px solid #1241a1' : '2px solid transparent',
                            color: activeTab === id ? '#1241a1' : '#9ca3af',
                            fontSize: 14, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* ── 지도 패널 ── */}
            <div style={mapPanelStyle}>
                {/*
                    ★★★ 핵심 컨테이너 ★★★
                    - width: 100% / height: 100% 를 반드시 명시해야 지도가 렌더링됨
                    - ref 를 통해 useEffect 안에서도 style 을 직접 보장함
                */}
                <div
                    ref={mapContainerRef}
                    style={{ width: '100%', height: '100%' }}
                />

                {/* 플로팅 선택 에이전시 카드 */}
                {selectedAgency && mapVisible && (
                    <div style={{
                        position: 'absolute', top: 12, left: 12, right: 12, zIndex: 100,
                        background: '#fff', borderRadius: 14,
                        boxShadow: '0 6px 24px rgba(0,0,0,.13)',
                        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                            background: '#eef1fb',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#1241a1' }}>
                                {selectedAgency.category === 'Model' ? 'person' : 'movie'}
                            </span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#1a1a2e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selectedAgency.name}
                            </p>
                            <p style={{ fontSize: 12, margin: '2px 0 0', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selectedAgency.address}
                            </p>
                        </div>
                        <a
                            href={`https://map.naver.com/v5/search/${encodeURIComponent(selectedAgency.address || selectedAgency.name)}`}
                            target="_blank" rel="noreferrer"
                            style={{
                                flexShrink: 0, background: '#03C75A', color: '#fff',
                                padding: '7px 12px', borderRadius: 10,
                                display: 'flex', alignItems: 'center', gap: 4,
                                fontSize: 12, fontWeight: 700, textDecoration: 'none',
                            }}
                        >
                            <span style={{ fontSize: 15 }}>🗺️</span>
                            <span>길찾기</span>
                        </a>
                    </div>
                )}

                {/* 목록 보기 버튼 (모바일 지도 탭) */}
                {!isDesktop && activeTab === 'map' && (
                    <button onClick={() => setActiveTab('list')} style={{
                        position: 'absolute', bottom: 20, left: 16, zIndex: 100,
                        background: '#fff', color: '#1a1a2e',
                        padding: '8px 16px', borderRadius: 999,
                        boxShadow: '0 4px 16px rgba(0,0,0,.15)',
                        border: '1px solid #e5e7eb',
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>list</span>
                        목록 보기
                    </button>
                )}
            </div>

            {/* ── 목록 패널 ── */}
            <div style={listStyle}>
                <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1a1a2e', margin: 0 }}>에이전시 찾기</h2>
                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4, marginBottom: 0 }}>
                        총 {agencies.length}개의 에이전시
                    </p>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {agencies.map(agency => {
                        const isSel = selectedAgency?.id === agency.id;
                        return (
                            <div
                                key={agency.id}
                                onClick={() => handleSelect(agency)}
                                style={{
                                    padding: 14, borderRadius: 12, cursor: 'pointer', flexShrink: 0,
                                    border: `1px solid ${isSel ? '#1241a1' : '#e5e7eb'}`,
                                    background: isSel ? '#1241a1' : '#fff',
                                    color: isSel ? '#fff' : '#1a1a2e',
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    transition: 'all .2s',
                                    boxShadow: isSel ? '0 4px 16px rgba(18,65,161,.25)' : 'none',
                                }}
                            >
                                <div style={{
                                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                                    background: isSel ? 'rgba(255,255,255,.2)' : '#f3f4f6',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: isSel ? '#fff' : '#9ca3af' }}>
                                        {agency.category === 'Model' ? 'person' : 'movie'}
                                    </span>
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontWeight: 700, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {agency.name}
                                    </p>
                                    <p style={{ fontSize: 12, margin: '2px 0 0', color: isSel ? 'rgba(255,255,255,.8)' : '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {agency.address}
                                    </p>
                                    {agency.phone && (
                                        <p style={{ fontSize: 12, margin: '2px 0 0', fontWeight: 600, color: isSel ? 'rgba(255,255,255,.9)' : '#1241a1' }}>
                                            {agency.phone}
                                        </p>
                                    )}
                                </div>
                                {isSel && <span className="material-symbols-outlined" style={{ fontSize: 20 }}>location_on</span>}
                            </div>
                        );
                    })}
                    <div style={{ height: 20 }} />
                </div>
            </div>
        </div>
    );
};

export default MapView;
