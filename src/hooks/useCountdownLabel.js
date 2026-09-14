import { useEffect, useState } from 'react';

// 남은 시간을 "N일 HH:MM:SS 후 시작" 형태로 매초 갱신. 예정 시각이 지나면 "곧 시작합니다"로 고정
// (라이브 전환/삭제 전까지 카운트다운이 0 밑으로 안 내려가고 문구만 바뀜).
// 모카 자체 라이브(MocaLiveBanner)와 모델뷰티 라이브 예고(LiveStreamBanner)에서 공용으로 쓴다.
export const useCountdownLabel = (scheduledAt) => {
    const [label, setLabel] = useState('');

    useEffect(() => {
        if (!scheduledAt) { setLabel(''); return; }
        const target = new Date(scheduledAt).getTime();

        const tick = () => {
            const diff = target - Date.now();
            if (diff <= 0) { setLabel('곧 시작합니다'); return; }
            const totalSec = Math.floor(diff / 1000);
            const days = Math.floor(totalSec / 86400);
            const hours = Math.floor((totalSec % 86400) / 3600);
            const minutes = Math.floor((totalSec % 3600) / 60);
            const seconds = totalSec % 60;
            const pad = (n) => String(n).padStart(2, '0');
            const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
            setLabel(`${days > 0 ? `${days}일 ` : ''}${clock} 후 시작`);
        };

        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [scheduledAt]);

    return label;
};
