'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Send, ArrowLeft, CornerUpLeft, Trash2 } from 'lucide-react';

export default function Chat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [user, setUser] = useState(null);
    const [sessionToken, setSessionToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMod, setIsMod] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [activeMenu, setActiveMenu] = useState(null);
    const bottomRef = useRef(null);
    const menuTimeoutRef = useRef(null);

    useEffect(() => {
        const token = localStorage.getItem('sessionToken');
        const nick = localStorage.getItem('sessionNick');
        if (token && nick) {
            setSessionToken(token);
            setUser(nick);
            checkModStatus(nick);
        }
    }, []);

    const checkModStatus = async (nick) => {
        try {
            const res = await fetch(`/api/moderator?nick=${encodeURIComponent(nick)}`);
            if (res.ok) {
                const data = await res.json();
                setIsMod(data.isMod);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/chat?user=${user ? encodeURIComponent(user) : ''}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [user]);

    const sendMessage = async () => {
        if (!input.trim() || !sessionToken) return;
        const content = input.trim();
        setInput('');
        const currentReply = replyingTo;
        setReplyingTo(null);

        if (content.startsWith('!ban ') && isMod) {
            const target = content.replace('!ban ', '').replace('*', '').trim();
            await executeModAction('ban', { target });
            return;
        }
        if (content.startsWith('!unban ') && isMod) {
            const target = content.replace('!unban ', '').replace('*', '').trim();
            await executeModAction('unban', { target });
            return;
        }
        if (content.startsWith('!deletemessages ') && isMod) {
            const parts = content.replace('!deletemessages ', '').replace('*', '').trim().split(' ');
            const target = parts[0];
            const ms = parts[1] ? parseInt(parts[1], 10) : 1000;
            await executeModAction('deletemessages', { target, ms });
            return;
        }
        if (content === '!clear' && isMod) {
            await executeModAction('clear', {});
            return;
        }

        try {
            await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken, content, replyTo: currentReply })
            });
            fetchMessages();
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        } catch (err) {
            console.error(err);
        }
    };

    const executeModAction = async (action, payload) => {
        try {
            await fetch('/api/mod-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken, action, ...payload })
            });
            fetchMessages();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteMessageForEveryone = async (msgId) => {
        try {
            await fetch('/api/chat/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken, messageId: msgId })
            });
            fetchMessages();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteMessageForMe = async (msgId) => {
        try {
            await fetch('/api/chat/hide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken, messageId: msgId })
            });
            setMessages(prev => prev.filter(m => m.id !== msgId));
        } catch (err) {
            console.error(err);
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
            return new Date(ts).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    };

    const handleTouchStart = (msg) => {
        menuTimeoutRef.current = setTimeout(() => {
            setActiveMenu(msg);
        }, 600);
    };

    const handleTouchEnd = () => {
        if (menuTimeoutRef.current) clearTimeout(menuTimeoutRef.current);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col select-none">
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
                        <div 
                            key={msg.id} 
                            className="flex flex-col gap-1"
                            onTouchStart={() => handleTouchStart(msg)}
                            onTouchEnd={handleTouchEnd}
                            onMouseDown={() => handleTouchStart(msg)}
                            onMouseUp={handleTouchEnd}
                        >
                            {msg.reply_to && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 ml-11">
                                    <CornerUpLeft size={12} className="text-slate-600" />
                                    <span className="font-bold text-slate-400">@{msg.reply_to.nick}</span>
                                    <span className="truncate max-w-[200px] italic">
                                        {msg.reply_to.is_deleted ? "Bu mesaj silindi." : msg.reply_to.content}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-start gap-3 relative group">
                                <img
                                    src={`/api/avatar?name=${encodeURIComponent(msg.nick)}`}
                                    alt={msg.nick}
                                    className="w-8 h-8 rounded-lg object-cover bg-slate-700 flex-shrink-0"
                                    onError={(e) => { e.target.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='32' height='32' fill='%23334155'/></svg>"; }}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xs font-bold text-amber-400">{msg.nick}</span>
                                        <span className="text-[10px] text-slate-500">{formatTime(msg.created_at)}</span>
                                        {msg.is_deleted && isMod && (
                                            <span className="text-[9px] bg-red-900/40 text-red-400 px-1 rounded">Mod Görevi: Silindi</span>
                                        )}
                                    </div>
                                    
                                    {msg.is_deleted && !isMod ? (
                                        <p className="text-sm text-slate-500 italic mt-0.5">Bu mesaj silindi.</p>
                                    ) : (
                                        <p className={`text-sm mt-0.5 break-words ${msg.is_deleted && isMod ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                            {msg.content}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={bottomRef} />
            </div>

            {activeMenu && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setActiveMenu(null)}>
                    <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl w-full max-w-xs space-y-3" onClick={(e) => e.stopPropagation()}>
                        <p className="text-xs text-slate-400 font-bold truncate">@{activeMenu.nick}: {activeMenu.content}</p>
                        <button 
                            onClick={() => { setReplyingTo({ id: activeMenu.id, nick: activeMenu.nick, content: activeMenu.content, is_deleted: activeMenu.is_deleted }); setActiveMenu(null); }}
                            className="w-full text-left bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition"
                        >
                            <CornerUpLeft size={16} /> Alıntıla
                        </button>
                        {((activeMenu.nick === user && !activeMenu.is_deleted) || isMod) && (
                            <button 
                                onClick={() => { deleteMessageForEveryone(activeMenu.id); setActiveMenu(null); }}
                                className="w-full text-left bg-red-950/40 hover:bg-red-900/60 text-red-400 px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition"
                            >
                                <Trash2 size={16} /> Herkesten Sil
                            </button>
                        )}
                        {activeMenu.is_deleted && (
                            <button 
                                onClick={() => { deleteMessageForMe(activeMenu.id); setActiveMenu(null); }}
                                className="w-full text-left bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition"
                            >
                                <Trash2 size={16} /> Benden Sil
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="px-4 py-3 border-t border-slate-800 bg-slate-900">
                {replyingTo && (
                    <div className="flex items-center justify-between bg-slate-800 border-l-2 border-amber-500 px-3 py-1.5 rounded-r-lg mb-2 text-xs">
                        <div className="truncate">
                            <span className="font-bold text-amber-400">@{replyingTo.nick}</span> kişisine yanıt veriliyor
                        </div>
                        <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-200 ml-2">✕</button>
                    </div>
                )}

                {!user ? (
                    <p className="text-center text-slate-500 text-sm py-2">Mesaj göndermek için <a href="/" className="text-amber-400 hover:underline">giriş yap</a>.</p>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isMod ? "Mesaj yaz veya komut kullan (!ban, !unban, !clear...)" : "Mesajını yaz..."}
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
