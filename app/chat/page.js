'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, Moon, Sun } from 'lucide-react';
 
function validateGuestNick(nick) {
    if (nick.length < 3 || nick.length > 10) return 'İsim 3-10 karakter olmalı.';
    if (!/^[A-Z]/.test(nick)) return 'İlk harf büyük olmalı.';
    if (!/^[A-Za-z0-9]+$/.test(nick)) return 'Sadece İngilizce harf ve rakam kullanılabilir.';
    return null;
}
 
function formatGuestInput(value) {
    if (!value) return '';
    const clean = value.replace(/[^A-Za-z0-9]/g, '');
    if (!clean) return '';
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}
 
export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [user, setUser] = useState(null);
    const [sessionToken, setSessionToken] = useState(null);
    const [isGuest, setIsGuest] = useState(false);
    const [loading, setLoading] = useState(true);
    const [screen, setScreen] = useState('chat');
    const [guestNick, setGuestNick] = useState('');
    const [guestError, setGuestError] = useState('');
    const [sendError, setSendError] = useState('');
    const [darkMode, setDarkMode] = useState(false);
    const bottomRef = useRef(null);
 
    const dm = {
        bg: 'bg-[#0a0c10]',
        text: 'text-slate-100',
        subtext: 'text-slate-400',
        border: 'border-[#1e2130]',
        card: 'bg-[#0f1117] border-[#1e2130]',
        input: 'bg-[#141720] border-[#1e2130] text-white placeholder-slate-600',
        header: 'bg-[#0d0f15] border-[#1e2130]',
        msgBubble: 'text-slate-300',
        hover: 'hover:bg-[#141720]',
        divider: 'bg-[#1e2130]',
        authCard: 'bg-[#0f1117] border-[#1e2130]',
        inputBar: 'bg-[#0d0f15] border-[#1e2130]',
    };
 
    useEffect(() => {
        const saved = localStorage.getItem('chatDarkMode');
        if (saved === 'true') setDarkMode(true);
    }, []);
 
    const toggleDark = () => {
        setDarkMode(prev => {
            localStorage.setItem('chatDarkMode', String(!prev));
            return !prev;
        });
    };
 
    useEffect(() => {
        const token = localStorage.getItem('sessionToken');
        const nick = localStorage.getItem('sessionNick');
        const guestName = sessionStorage.getItem('guestNick');
        if (token && nick) {
            setSessionToken(token);
            setUser(nick.charAt(0).toUpperCase() + nick.slice(1));
            setIsGuest(false);
        } else if (guestName) {
            setUser(guestName);
            setIsGuest(true);
        }
    }, []);
 
    const fetchMessages = async () => {
        try {
            const res = await fetch('/api/chat');
            if (res.ok) {
                const data = await res.json();
                setMessages(Array.isArray(data) ? data : []);
            }
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };
 
    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, []);
 
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
 
    const sendMessage = async () => {
        if (!input.trim() || !user) return;
        const content = input.trim();
        setSendError('');
        setInput('');
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionToken: sessionToken || null,
                    guestNick: isGuest ? user : null,
                    content
                })
            });
            const result = await res.json();
            if (!result.success) {
                setSendError(result.message || 'Mesaj gönderilemedi.');
                setInput(content);
            } else {
                fetchMessages();
            }
        } catch (err) {
            setSendError('Sunucu hatası.');
            setInput(content);
        }
    };
 
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };
 
    const handleGuestInputChange = (e) => {
        const raw = e.target.value;
        if (raw.startsWith('*')) return;
        setGuestNick(formatGuestInput(raw));
        setGuestError('');
    };
 
    const handleGuestJoin = () => {
        const err = validateGuestNick(guestNick.trim());
        if (err) { setGuestError(err); return; }
        sessionStorage.setItem('guestNick', guestNick.trim());
        setUser(guestNick.trim());
        setIsGuest(true);
        setScreen('chat');
    };
 
    const formatTime = (ts) => {
        try {
            return new Date(ts).toLocaleString('tr-TR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch { return ''; }
    };
 
    const DarkToggle = () => (
        <button
            onClick={toggleDark}
            className="relative w-14 h-7 flex items-center bg-amber-500 rounded-full p-1 cursor-pointer outline-none border-none flex-shrink-0"
        >
            <div className={`bg-white w-5 h-5 rounded-full shadow-md flex items-center justify-center transition-transform duration-300 ${darkMode ? 'translate-x-7' : 'translate-x-0'}`}>
                {darkMode ? <Moon size={11} className="text-amber-500" /> : <Sun size={11} className="text-amber-500" />}
            </div>
        </button>
    );
 
    if (screen === 'auth') {
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? `${dm.bg} ${dm.text}` : 'bg-slate-50 text-slate-900'}`}>
                <div className={`rounded-2xl shadow-sm p-6 w-full max-w-sm space-y-4 border ${darkMode ? dm.authCard : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => setScreen('chat')} className={`p-1.5 rounded-lg transition ${darkMode ? dm.hover : 'hover:bg-slate-100'}`}>
                            <ArrowLeft size={16} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
                        </button>
                        <h2 className={`text-base font-bold ${darkMode ? dm.text : 'text-slate-800'}`}>Sohbete Katıl</h2>
                        <div className="ml-auto">
                            <DarkToggle />
                        </div>
                    </div>
                    <button onClick={() => window.location.href = '/'} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition">
                        Giriş Yap
                    </button>
                    <div className="flex items-center gap-2">
                        <div className={`flex-1 h-px ${darkMode ? dm.divider : 'bg-slate-200'}`} />
                        <span className={`text-xs ${darkMode ? dm.subtext : 'text-slate-400'}`}>veya</span>
                        <div className={`flex-1 h-px ${darkMode ? dm.divider : 'bg-slate-200'}`} />
                    </div>
                    <div className="space-y-2">
                        <p className={`text-xs ${darkMode ? dm.subtext : 'text-slate-500'}`}>Ziyaretçi olarak katıl</p>
                        <div className="relative">
                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>*</span>
                            <input
                                type="text"
                                placeholder="Örn: Guest1"
                                value={guestNick}
                                onChange={handleGuestInputChange}
                                maxLength={10}
                                onKeyDown={(e) => e.key === 'Enter' && handleGuestJoin()}
                                className={`w-full border rounded-xl pl-7 pr-3 py-2 text-sm outline-none focus:border-blue-400 transition ${darkMode ? dm.input : 'border-slate-300 bg-white text-slate-900'}`}
                            />
                        </div>
                        {guestError && <p className="text-red-500 text-xs">{guestError}</p>}
                        <button onClick={handleGuestJoin} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition text-white ${darkMode ? 'bg-[#1e2130] hover:bg-[#252a3a]' : 'bg-slate-800 hover:bg-slate-700'}`}>
                            Ziyaretçi Olarak Katıl
                        </button>
                    </div>
                </div>
            </div>
        );
    }
 
    return (
        <div className={`min-h-screen flex flex-col ${darkMode ? `${dm.bg} ${dm.text}` : 'bg-slate-50 text-slate-900'}`}>
            <div className={`flex items-center gap-3 px-4 py-3 border-b sticky top-0 z-10 shadow-sm ${darkMode ? `${dm.header} ${dm.border}` : 'bg-white border-slate-200'}`}>
                <button onClick={() => window.location.href = '/'} className={`p-2 rounded-lg transition ${darkMode ? dm.hover : 'hover:bg-slate-100'}`}>
                    <ArrowLeft size={18} className={darkMode ? 'text-slate-400' : 'text-slate-600'} />
                </button>
                <h1 className="text-base font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Cafe Sohbet</h1>
                <div className="ml-auto flex items-center gap-3">
                    {user && (
                        <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                            {isGuest ? `*${user}` : user}
                            {isGuest && <span className={`ml-1 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`}>(Ziyaretçi)</span>}
                        </span>
                    )}
                    <DarkToggle />
                </div>
            </div>
 
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-3xl w-full mx-auto">
                {loading ? (
                    <p className={`text-center text-sm mt-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Yükleniyor...</p>
                ) : messages.length === 0 ? (
                    <p className={`text-center text-sm mt-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Henüz mesaj yok. İlk mesajı sen gönder!</p>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex items-start gap-3">
                            <img
                                src={`/api/avatar?name=${encodeURIComponent(msg.nick)}`}
                                alt={msg.nick}
                                className={`w-8 h-8 rounded-lg object-cover flex-shrink-0 ${darkMode ? 'bg-[#1a1d27]' : 'bg-slate-200'}`}
                                onError={(e) => { e.target.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='32' height='32' fill='%23e2e8f0'/></svg>"; }}
                            />
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-xs font-bold ${msg.is_guest ? (darkMode ? 'text-slate-500' : 'text-slate-400') : 'text-amber-500'}`}>
                                        {msg.nick ? msg.nick.charAt(0).toUpperCase() + msg.nick.slice(1) : ''}
                                    </span>
                                    <span className={`text-[10px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{formatTime(msg.created_at)}</span>
                                </div>
                                <p className={`text-sm mt-0.5 break-words ${darkMode ? dm.msgBubble : 'text-slate-700'}`}>{msg.content}</p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>
 
            <div className={`px-4 py-3 border-t max-w-3xl w-full mx-auto ${darkMode ? `${dm.inputBar} ${dm.border}` : 'bg-white border-slate-200'}`}>
                {!user ? (
                    <div className="flex gap-2 justify-center">
                        <button onClick={() => setScreen('auth')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition">
                            Giriş Yap
                        </button>
                        <button onClick={() => setScreen('auth')} className={`text-white px-4 py-2 rounded-xl text-sm font-semibold transition ${darkMode ? 'bg-[#1e2130] hover:bg-[#252a3a]' : 'bg-slate-800 hover:bg-slate-700'}`}>
                            Ziyaretçi Olarak Katıl
                        </button>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {sendError && <p className="text-red-500 text-xs">{sendError}</p>}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Mesajını yaz..."
                                maxLength={500}
                                className={`flex-1 border rounded-xl px-3 py-2 text-sm outline-none transition ${darkMode ? `${dm.input} focus:border-amber-500` : 'bg-slate-100 border-slate-200 text-slate-900 focus:border-amber-400'}`}
                            />
                            <button onClick={sendMessage} disabled={!input.trim()} className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white p-2 rounded-xl transition">
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
 
