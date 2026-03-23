import React, { useState, useEffect } from 'react';

/**
 * CountdownTimer
 * targetDate: ISO string or Date object
 * onExpire: callback when timer reaches 0
 * variant: 'block' (숫자 블록) | 'inline' (인라인 텍스트)
 */
const CountdownTimer = ({ targetDate, onExpire, variant = 'block', className = '' }) => {
    const [timeLeft, setTimeLeft] = useState(calcTimeLeft(targetDate));

    useEffect(() => {
        if (!targetDate) return;
        const interval = setInterval(() => {
            const t = calcTimeLeft(targetDate);
            setTimeLeft(t);
            if (t.total <= 0) {
                clearInterval(interval);
                onExpire?.();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [targetDate, onExpire]);

    if (!targetDate) return null;

    const { hours, minutes, seconds, total } = timeLeft;

    if (total <= 0) {
        return (
            <span className={`text-red-400 font-bold text-sm ${className}`}>판매 종료</span>
        );
    }

    if (variant === 'inline') {
        return (
            <span className={`font-mono font-bold text-orange-400 ${className}`}>
                {pad(hours)}:{pad(minutes)}:{pad(seconds)}
            </span>
        );
    }

    return (
        <div className={`flex items-center gap-1 ${className}`}>
            <TimeBlock value={pad(hours)} label="시" urgent={hours === 0 && minutes < 10} />
            <Colon />
            <TimeBlock value={pad(minutes)} label="분" urgent={hours === 0 && minutes < 10} />
            <Colon />
            <TimeBlock value={pad(seconds)} label="초" urgent={hours === 0 && minutes < 10} />
        </div>
    );
};

const TimeBlock = ({ value, label, urgent }) => (
    <div className="flex flex-col items-center">
        <div className={`
            w-9 h-9 rounded-lg flex items-center justify-center font-mono font-black text-base
            ${urgent
                ? 'bg-red-500/30 text-red-300 border border-red-500/50 animate-pulse'
                : 'bg-black/50 text-white border border-white/20'}
        `}>
            {value}
        </div>
        <span className="text-[9px] text-white/40 mt-0.5">{label}</span>
    </div>
);

const Colon = () => (
    <span className="text-white/50 font-bold text-lg mb-3">:</span>
);

const pad = (n) => String(n).padStart(2, '0');

function calcTimeLeft(targetDate) {
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
        total: diff,
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
}

export default CountdownTimer;
