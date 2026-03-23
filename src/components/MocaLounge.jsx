import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../services/userService';
import { fetchLatestAnnouncement, fetchMessages, sendMessage, subscribeToMessages } from '../services/chatService';

const MocaLounge = () => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [announcement, setAnnouncement] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Auto-scroll ref
    const messagesEndRef = useRef(null);
    const user = getUser();
    const myNickname = user?.nickname || user?.name || '익명모카';

    // Load data
    useEffect(() => {
        const loadInitialData = async () => {
            const latestAnnouncement = await fetchLatestAnnouncement();
            setAnnouncement(latestAnnouncement);

            const initialMessages = await fetchMessages();
            // Sort by created_at ascending (oldest first)
            setMessages(initialMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        };

        loadInitialData();

        // Subscribe to real-time updates
        const unsubscribe = subscribeToMessages((newMessage) => {
            setMessages(prev => [...prev, newMessage]);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const text = inputValue.trim();
        setInputValue(''); // Optimistic clear

        await sendMessage(myNickname, text);

        // If local storage fallback (development), manually fetch
        if (!import.meta.env.VITE_SUPABASE_URL) {
            const updated = await fetchMessages();
            setMessages(updated.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
        }

        setIsSubmitting(false);
    };

    // Format time: HH:MM
    const formatTime = (isoString) => {
        if (!isoString) return '';
        const d = new Date(isoString);
        return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    return (
        <div className="flex flex-col h-full bg-[#0A0A0F] text-white overflow-hidden">
            {/* Header */}
            <header className="flex-none flex items-center justify-between px-4 py-4 z-20 bg-[#0A0A0F]/90 backdrop-blur-md border-b border-white/5">
                <button
                    onClick={() => navigate('/home')}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px] text-white/80">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold tracking-wide">MOCA Lounge</h1>
                <button className="w-10 h-10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px] text-white/50">search</span>
                </button>
            </header>

            {/* Sticky Announcement Banner */}
            {announcement && (
                <div className="flex-none relative z-10 px-4 py-3 mx-4 mt-4 mb-2 overflow-hidden rounded-2xl border border-white/10 shadow-lg cursor-pointer hover:scale-[1.01] transition-transform">
                    {/* Glassmorphism Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#C4B5FD]/20 to-[#5B21B6]/20 backdrop-blur-md -z-10" />
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="material-symbols-outlined text-[16px] text-[#C4B5FD]">campaign</span>
                                <h3 className="text-sm font-bold text-white truncate w-full">{announcement.title}</h3>
                            </div>
                            <p className="text-xs text-white/60 truncate w-full pl-5">{announcement.content}</p>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-white/30 mt-1 flex-shrink-0">chevron_right</span>
                    </div>
                </div>
            )}

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 pt-2 pb-6 flex flex-col gap-4 hide-scrollbar">
                {/* Intro date or bubble */}
                <div className="flex justify-center my-2">
                    <span className="text-[10px] font-medium text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        MOCA 라운지에 오신 것을 환영합니다
                    </span>
                </div>

                {messages.map((msg, idx) => {
                    const isMe = msg.user_nickname === myNickname;
                    const showAvatar = !isMe && (idx === 0 || messages[idx - 1].user_nickname !== msg.user_nickname);

                    return (
                        <div key={msg.id || idx} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>

                                {/* Avatar for others */}
                                {!isMe && (
                                    <div className="flex-shrink-0 w-8 flex flex-col items-center">
                                        {showAvatar ? (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6C63FF]/30 to-[#C084FC]/30 flex items-center justify-center border border-white/10 font-bold text-xs text-white overflow-hidden">
                                                {/* Fallback to first character of nickname if no image */}
                                                {msg.user_nickname ? msg.user_nickname.charAt(0) : '?'}
                                            </div>
                                        ) : <div className="w-8" />}
                                    </div>
                                )}

                                {/* Message Bubble & Nickname */}
                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {/* Nickname above bubble for others */}
                                    {!isMe && showAvatar && (
                                        <span className="text-[11px] text-white/50 mb-1 ml-1 font-medium tracking-wide">
                                            {msg.user_nickname}
                                        </span>
                                    )}

                                    <div className="flex items-end gap-2">
                                        {/* My Time (left of bubble) */}
                                        {isMe && (
                                            <span className="text-[10px] text-white/30 mb-1">{formatTime(msg.created_at)}</span>
                                        )}

                                        {/* Chat Bubble */}
                                        <div
                                            className={`px-4 py-2.5 rounded-[20px] text-[14px] leading-relaxed break-words shadow-sm ${isMe
                                                ? 'bg-gradient-to-br from-[#907FF8] to-[#7B61FF] text-white rounded-br-sm'
                                                : 'bg-[#1C1C24] border border-white/5 text-white/90 rounded-bl-sm'
                                                }`}
                                        >
                                            {msg.message}
                                        </div>

                                        {/* Other's Time (right of bubble) */}
                                        {!isMe && (
                                            <span className="text-[10px] text-white/30 mb-1">{formatTime(msg.created_at)}</span>
                                        )}
                                    </div>
                                </div>

                            </div>
                        </div>
                    );
                })}

                {/* Anchor point to scroll to */}
                <div ref={messagesEndRef} className="h-2 w-full" />
            </div>

            {/* Chat Input Area */}
            <div className="flex-none p-4 pb-8 bg-[#0A0A0F]/95 backdrop-blur-xl border-t border-white/5">
                <form
                    onSubmit={handleSendMessage}
                    className="flex flex-row items-center bg-[#15151A] border border-white/10 rounded-full h-[52px] pr-2 shadow-inner"
                >
                    <button type="button" className="w-[50px] h-full flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[24px] text-white/40 hover:text-white/80 transition-colors">add_circle</span>
                    </button>

                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="메시지를 입력하세요..."
                        className="flex-1 bg-transparent border-none outline-none text-[15px] text-white placeholder-white/30 h-full font-medium"
                    />

                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isSubmitting}
                        className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-[#907FF8] to-[#7B61FF] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(123,97,255,0.4)] disabled:opacity-50 disabled:shadow-none transition-all ml-2"
                    >
                        <span className="material-symbols-outlined text-[18px] text-white font-bold transform -rotate-45 ml-0.5 mb-0.5">send</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MocaLounge;
