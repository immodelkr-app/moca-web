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
        <div className="flex flex-col h-full bg-[#F8F5FF] text-[#1F1235] overflow-hidden">
            {/* Header */}
            <header className="flex-none flex items-center justify-between px-4 py-5 z-20 bg-white/90 backdrop-blur-md border-b border-[#E8E0FA]">
                <button
                    onClick={() => navigate('/home')}
                    className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center border border-[#E8E0FA] hover:bg-[#EDE8FF] transition-colors"
                >
                    <span className="material-symbols-outlined text-[20px] text-[#9333EA]">arrow_back</span>
                </button>
                <h1 className="text-xl font-black text-[#1F1235] tracking-tight">MOCA Lounge</h1>
                <button className="w-10 h-10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px] text-[#9CA3AF]">search</span>
                </button>
            </header>

            {/* Sticky Announcement Banner */}
            {announcement && (
                <div className="flex-none relative z-10 px-5 py-4 mx-4 mt-4 mb-2 overflow-hidden rounded-[24px] border border-[#E8E0FA] shadow-lg shadow-[#9333EA]/5 cursor-pointer hover:scale-[1.01] transition-all bg-white">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#F3E8FF] to-white opacity-50 -z-10" />
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="material-symbols-outlined text-[18px] text-[#9333EA]">campaign</span>
                                <h3 className="text-sm font-black text-[#1F1235] truncate w-full">{announcement.title}</h3>
                            </div>
                            <p className="text-xs text-[#5B4E7A] font-medium truncate w-full pl-6">{announcement.content}</p>
                        </div>
                        <span className="material-symbols-outlined text-[20px] text-[#E8E0FA] mt-0.5 flex-shrink-0">chevron_right</span>
                    </div>
                </div>
            )}

            {/* Chat Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 pt-2 pb-6 flex flex-col gap-4 hide-scrollbar">
                {/* Intro date or bubble */}
                <div className="flex justify-center my-3">
                    <span className="text-[11px] font-bold text-[#9CA3AF] bg-white px-4 py-1.5 rounded-full border border-[#E8E0FA] shadow-sm">
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
                                        <span className="text-[11px] text-[#5B4E7A] mb-1.5 ml-1 font-bold tracking-tight">
                                            {msg.user_nickname}
                                        </span>
                                    )}

                                    <div className="flex items-end gap-2">
                                        {/* My Time (left of bubble) */}
                                        {isMe && (
                                            <span className="text-[10px] text-[#9CA3AF] mb-1 font-bold">{formatTime(msg.created_at)}</span>
                                        )}

                                        {/* Chat Bubble */}
                                        <div
                                            className={`px-4 py-2.5 rounded-[20px] text-[14px] leading-relaxed break-words shadow-sm font-medium ${isMe
                                                ? 'bg-gradient-to-br from-[#9333EA] to-[#7C3AED] text-white rounded-br-sm shadow-[#9333EA]/15'
                                                : 'bg-white border border-[#E8E0FA] text-[#1F1235] rounded-bl-sm'
                                                }`}
                                        >
                                            {msg.message}
                                        </div>

                                        {/* Other's Time (right of bubble) */}
                                        {!isMe && (
                                            <span className="text-[10px] text-[#9CA3AF] mb-1 font-bold">{formatTime(msg.created_at)}</span>
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
            <div className="flex-none p-5 pb-9 bg-white/95 backdrop-blur-xl border-t border-[#E8E0FA]">
                <form
                    onSubmit={handleSendMessage}
                    className="flex flex-row items-center bg-[#F8F5FF] border border-[#E8E0FA] rounded-full h-[54px] pr-2 shadow-inner group focus-within:border-[#9333EA]/30 transition-all"
                >
                    <button type="button" className="w-[50px] h-full flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[24px] text-[#9CA3AF] hover:text-[#9333EA] transition-colors">add_circle</span>
                    </button>

                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="메시지를 입력하세요..."
                        className="flex-1 bg-transparent border-none outline-none text-[15px] text-[#1F1235] placeholder-[#9CA3AF] h-full font-bold"
                    />

                    <button
                        type="submit"
                        disabled={!inputValue.trim() || isSubmitting}
                        className="w-[42px] h-[42px] rounded-full bg-[#9333EA] flex items-center justify-center shrink-0 shadow-lg shadow-[#9333EA]/20 disabled:opacity-30 disabled:shadow-none transition-all ml-2 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-[18px] text-white font-black transform -rotate-45 ml-0.5 mb-0.5">send</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MocaLounge;
