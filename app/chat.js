'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft } from 'lucide-react';

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [user, setUser] = useState(null);
    const [sessionToken, setSessionToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const bottomRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('sessionToken');
        const nick = localStorage.getItem('sessionNick');
        if (token && nick) {
            setSessionToken(token);
            setUser(nick);
        }
    }, []);

    const fetchMessages = async () => {
        try {
            const res = await fetch('/api/chat');
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (err) {
            console.error('Mesaj yuklenemedi:', err);
        } finally {
            setLoading(false);
        }
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
        if (!input.trim() || !sessionToken) return;
        const content = input.trim();
        setInput('');
        try {
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken, content })
            });
            fetchMessages();
        } catch (err) {
            console.error('Mesaj gonderilemedi:', err);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (ts) => {
        try {
            return new Date(ts).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        } catch { return ''; }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
                <button onClick={() => window.location.href = '/'} className="p-2 rounded-lg hover:bg-slate-800 transition">
                    <ArrowLeft size={18} />
                </button>
                <h1 className="text-lg font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">Cafe Sohbet</h1>
                {user && <span className="ml-auto text-xs text-slate-400">{user}</span>}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {loading ? (
                    <p className="text-center text-slate-500 text-sm">Yükleniyor...</p>
                ) : messages.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm">Henüz mesaj yok. İlk mesajı sen gönder!</p>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className="flex items-start gap-3">
                            <img
                                src={`/api/avatar?name=${encodeURIComponent(msg.nick)}`}
                                alt={msg.nick}
                                className="w-8 h-8 rounded-lg object-cover bg-slate-700 flex-shrink-0"
                                onError={(e) => { e.target.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='32' height='32' fill='%23334155'/></svg>"; }}
                            />
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs font-bold text-amber-400">{msg.nick}</span>
                                    <span className="text-[10px] text-slate-500">{formatTime(msg.created_at)}</span>
                                </div>
                                <p className="text-sm text-slate-200 mt-0.5 break-words">{msg.content}</p>
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            <div className="px-4 py-3 border-t border-slate-800 bg-slate-900">
                {!user ? (
                    <p className="text-center text-slate-500 text-sm py-2">Mesaj göndermek için <a href="/" className="text-amber-400 hover:underline">giriş yap</a>.</p>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Mesajını yaz..."
                            maxLength={500}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-500 transition"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim()}
                            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white p-2 rounded-lg transition"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
