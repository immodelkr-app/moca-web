import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchActivePopups } from '../services/popupService';

const DISMISS_KEY = (id) => `popup_dismissed_${id}`;

const isDismissedToday = (id) => {
    try {
        const val = localStorage.getItem(DISMISS_KEY(id));
        if (!val) return false;
        return val === new Date().toLocaleDateString('ko-KR');
    } catch { return false; }
};

const dismissToday = (id) => {
    localStorage.setItem(DISMISS_KEY(id), new Date().toLocaleDateString('ko-KR'));
};

const PopupBanner = () => {
    const navigate = useNavigate();
    const [popups, setPopups] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        fetchActivePopups().then(data => {
            const undismissed = data.filter(p => !isDismissedToday(p.id));
            if (undismissed.length > 0) {
                setPopups(undismissed);
                setVisible(true);
            }
        }).catch(() => {});
    }, []);

    if (!visible || popups.length === 0) return null;

    const popup = popups[currentIndex];
    if (!popup) return null;

    const handleClose = () => {
        if (currentIndex + 1 < popups.length) {
            setCurrentIndex(i => i + 1);
        } else {
            setVisible(false);
        }
    };

    const handleDismissToday = () => {
        popups.forEach(p => dismissToday(p.id));
        setVisible(false);
    };

    const handleClick = () => {
        if (!popup.link_url) return;
        if (popup.link_url.startsWith('http')) {
            window.open(popup.link_url, '_blank', 'noopener');
        } else {
            navigate(popup.link_url);
        }
        handleClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-5">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={handleClose} />

            {/* Popup card */}
            <div className="relative z-10 w-full max-w-sm rounded-3xl bg-[#13131f] border border-white/15 overflow-y-auto shadow-2xl animate-fadeIn" style={{ maxHeight: '90vh' }}>
                {/* Top bar */}
                <div className="h-1 w-full bg-gradient-to-r from-[#6C63FF] via-[#A78BFA] to-[#EC4899]" />

                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>

                {/* Image */}
                {popup.image_url && (
                    <div
                        className={`w-full ${popup.link_url ? 'cursor-pointer' : ''}`}
                        onClick={popup.link_url ? handleClick : undefined}
                    >
                        <img
                            src={popup.image_url}
                            alt={popup.title}
                            className="w-full object-contain"
                        />
                    </div>
                )}

                {/* Content */}
                <div className="p-5 flex flex-col gap-3">
                    <div>
                        <h3 className="text-white font-black text-base leading-snug">{popup.title}</h3>
                        {popup.content && (
                            <p className="text-white/55 text-sm mt-1.5 leading-relaxed whitespace-pre-line">{popup.content}</p>
                        )}
                    </div>

                    {/* Multiple popups indicator */}
                    {popups.length > 1 && (
                        <div className="flex items-center gap-1.5 justify-center">
                            {popups.map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === currentIndex ? 'bg-[#818CF8]' : 'bg-white/20'}`} />
                            ))}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 mt-1">
                        {popup.link_url && (
                            <button
                                onClick={handleClick}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#6C63FF] to-[#A78BFA] text-white font-black text-sm hover:opacity-90 active:scale-[0.98] transition-all"
                            >
                                자세히 보기
                            </button>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleDismissToday}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 font-bold text-xs hover:bg-white/8 transition-colors"
                            >
                                오늘 하루 보지 않기
                            </button>
                            <button
                                onClick={handleClose}
                                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 font-bold text-xs hover:bg-white/8 transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PopupBanner;
