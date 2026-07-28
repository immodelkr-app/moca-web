export const getNaverMapUrl = (agency) => {
    const query = encodeURIComponent(agency.address || agency.name);
    const lat = parseFloat(agency.lat);
    const lng = parseFloat(agency.lng);

    if (!isNaN(lat) && !isNaN(lng)) {
        // c 파라미터(lng,lat,zoom,...)로 지도를 정확한 좌표에 중심 고정
        return `https://map.naver.com/v5/search/${query}?c=${lng},${lat},15,0,0,0,dh`;
    }

    return `https://map.naver.com/v5/search/${query}`;
};
