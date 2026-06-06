'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, MessageSquare, FileText, Users, Moon, Sun, LogOut, ChevronDown, MessageCircle, Edit3, Check, X } from 'lucide-react';

export default function Home() {
    const [data, setData] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [darkMode, setDarkMode] = useState(false);
    const [avatarErrors, setAvatarErrors] = useState({});
    const [user, setUser] = useState(null);
    const [sessionToken, setSessionToken] = useState(null);
    const [loginNick, setLoginNick] = useState('');
    const [loginStep, setLoginStep] = useState('username');
    const [generatedCode, setGeneratedCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(120);
    const [loginError, setLoginError] = useState('');
    const [showLoginForm, setShowLoginForm] = useState(false);
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [total, setTotal] = useState(0);
    const [editingNote, setEditingNote] = useState(false);
    const [noteInput, setNoteInput] = useState('');
    const [noteSaving, setNoteSaving] = useState(false);
    const [isLoginNickValid, setIsLoginNickValid] = useState(false);
    const menuRef = useRef(null);
    const observerRef = useRef(null);
    const bottomTriggerRef = useRef(null);

    const validateNickFormat = (value) => {
        const regex = /^[A-ZÇĞİÖŞÜa-zçğıöşü0-9].*#[0-9]{4}$/;
        setIsLoginNickValid(regex.test(value));
    };

    const handleLoginNickChange = (e) => {
        let value = e.target.value;

        if (value.length > 0) {
            value = value.charAt(0).toUpperCase() + value.slice(1);
        }

        const hashIndex = value.indexOf("#");
        if (hashIndex !== -1) {
            const beforeHash = value.substring(0, hashIndex + 1);
            const afterHash = value.substring(hashIndex + 1).replace(/\D/g, "");
            value = beforeHash + afterHash.substring(0, 4);
        }

        setLoginNick(value);
        validateNickFormat(value);
    };

    useEffect(() => {
        const checkIpLogin = async () => {
            try {
                const res = await fetch('/api/stats?action=checkIp');
                const result = await res.json();
                if (result.success && result.autoLogin) {
                    localStorage.setItem('sessionToken', result.token);
                    localStorage.setItem('sessionNick', result.nick);
                    setSessionToken(result.token);
                    setUser(result.nick);
                    return true;
                }
            } catch (err) { console.error(err); }
            return false;
        };

        const initAuth = async () => {
            const savedToken = localStorage.getItem('sessionToken');
            const savedNick = localStorage.getItem('sessionNick');
            if (savedToken && savedNick) {
                setSessionToken(savedToken);
                setUser(savedNick);
            } else {
                await checkIpLogin();
            }
        };
        initAuth();
    }, []);

    useEffect(() => {
        function handleClickOutside(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowAvatarMenu(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchData = async (pageNum = 1, append = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const res = await fetch(`/api/stats?page=${pageNum}`, {
                cache: 'no-store',
                headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
            });
            if (res.ok) {
                const json = await res.json();
                if (json.data) {
                    setData(prev => append ? [...prev, ...json.data] : json.data);
                    setTotal(json.total || 0);
                    setHasMore((pageNum * 40) < (json.total || 0));
                }
            }
        } catch (error) {
            console.error('Data fetch error:', error);
        } declare {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        fetchData(1, false);
        const interval = setInterval(() => fetchData(1, false), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!bottomTriggerRef.current) return;
        observerRef.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
                const nextPage = page + 1;
                setPage(nextPage);
                fetchData(nextPage, true);
            }
        }, { threshold: 0.1 });
        observerRef.current.observe(bottomTriggerRef.current);
        return () => observerRef.current?.disconnect();
    }, [hasMore, loadingMore, loading, page]);

    useEffect(() => {
        if (loginStep !== 'code' || timeLeft <= 0) {
            if (timeLeft === 0) { setLoginError('Süre doldu. Lütfen tekrar deneyin.'); setLoginStep('username'); }
            return;
        }
        const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(timer);
    }, [timeLeft, loginStep]);

    useEffect(() => {
        let authInterval;
        if (loginStep === 'code' && loginNick && generatedCode) {
            authInterval = setInterval(async () => {
                try {
                    const res = await fetch('/api/stats', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'login', nick: loginNick.trim(), code: generatedCode.trim() })
                    });
                    if (!res.ok) return;
                    const result = await res.json();
                    if (result.success && (result.step === 'success' || result.token)) {
                        localStorage.setItem('sessionToken', result.token);
                        localStorage.setItem('sessionNick', result.nick || loginNick.trim());
                        setSessionToken(result.token);
                        setUser(result.nick || loginNick.trim());
                        setLoginStep('username');
                        setLoginNick('');
                        setGeneratedCode('');
                        setShowLoginForm(false);
                        clearInterval(authInterval);
                    }
                } catch (err) { console.error(err); }
            }, 2000);
        }
        return () => { if (authInterval) clearInterval(authInterval); };
    }, [loginStep, loginNick, generatedCode]);

    const startLogin = async (e) => {
        e.preventDefault();
        if (!isLoginNickValid || !loginNick.trim()) return;
        setLoginError('');
        try {
            const res = await fetch('/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', nick: loginNick.trim() })
            });
            const result = await res.json();
            if (result.success && result.step === 'wait') {
                setGeneratedCode(result.code);
                setTimeLeft(120);
                setLoginStep('code');
            } else {
                setLoginError(result.message || result.error || 'Sistemde bir hata olustu.');
            }
        } catch (err) { setLoginError('Sunucuya baglanılamadı.'); }
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'logoff', nick: user })
            });
        } catch (err) { console.error(err); }
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('sessionNick');
        setSessionToken(null);
        setUser(null);
        setShowAvatarMenu(false);
    };

    const saveNote = async () => {
        setNoteSaving(true);
        try {
            await fetch('/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'saveNote', sessionToken, note: noteInput })
            });
            setEditingNote(false);
            fetchData(1, false);
        } catch (err) { console.error(err); }
        setNoteSaving(false);
    };

    const formatLastOnline = (timestamp) => {
        if (!timestamp) return '-';
        try {
            return new Date(timestamp * 1000).toLocaleString('tr-TR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) { return '-'; }
    };

    const filteredData = (data || []).filter(item =>
        item && item.nick && item.nick.toLowerCase().includes((search || '').toLowerCase())
    );

    const totalMessages = (data || []).reduce((sum, item) => sum + (Number(item?.messages) || 0), 0);
    const totalTopics = (data || []).reduce((sum, item) => sum + (Number(item?.topics) || 0), 0);

    const getRankColor = (index) => {
        if (index === 0) return darkMode ? 'text-amber-400 font-bold' : 'text-amber-600 font-bold';
        if (index === 1) return darkMode ? 'text-slate-300 font-bold' : 'text-slate-500 font-bold';
        if (index === 2) return darkMode ? 'text-amber-600 font-bold' : 'text-amber-700 font-bold';
        return darkMode ? 'text-slate-100' : 'text-slate-900';
    };

    const getRowBg = (index) => {
        if (index === 0) return darkMode ? 'bg-amber-500/5 hover:bg-amber-500/10' : 'bg-amber-500/5 hover:bg-amber-500/10';
        if (index === 1) return darkMode ? 'bg-slate-500/5 hover:bg-slate-500/10' : 'bg-slate-500/5 hover:bg-slate-500/10';
        if (index === 2) return darkMode ? 'bg-amber-700/5 hover:bg-amber-700/10' : 'bg-amber-700/5 hover:bg-amber-700/10';
        return darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-100/70';
    };

    const currentUserData = user ? (data || []).find(item => item && item.nick && item.nick.toLowerCase() === user.toLowerCase()) : null;

    return (
        <div className={`min-h-screen p-4 md:p-6 font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className={`flex items-center justify-between border-b pb-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                        Cafe Rank
                    </h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="relative w-16 h-8 flex items-center bg-amber-500 rounded-full p-1 cursor-pointer transition-colors duration-300 outline-none border-none"
                        >
                            <div className={`bg-white w-6 h-6 rounded-full shadow-md flex items-center justify-center transition-transform duration-300 ${darkMode ? 'translate-x-8' : 'translate-x-0'}`}>
                                {darkMode ? <Moon size={14} className="text-amber-500" /> : <Sun size={14} className="text-amber-500" />}
                            </div>
                        </button>
                        <button
                            onClick={() => window.open('/chat', '_blank')}
                            className={`p-2 rounded-lg border transition ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'}`}
                        >
                            <MessageCircle size={16} />
                        </button>
                        <button
                            onClick={() => fetchData(1, false)}
                            className={`p-2 rounded-lg border transition ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'}`}
                        >
                            <RefreshCw size={16} />
                        </button>
                        {!user ? (
                            !showLoginForm ? (
                                <button onClick={() => setShowLoginForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition">
                                    Giriş Yap
                                </button>
                            ) : null
                        ) : (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-300 hover:bg-slate-100'}`}
                                >
                                    <img
                                        src={`/api/avatar?name=${encodeURIComponent(user)}`}
                                        alt={user}
                                        className="w-6 h-6 rounded-md object-cover"
                                        onError={(e) => { e.target.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='32' height='32' fill='%23334155'/></svg>"; }}
                                    />
                                    <span className="text-xs font-semibold max-w-[120px] truncate">{user}</span>
                                    <ChevronDown size={12} className={`transition-transform ${showAvatarMenu ? 'rotate-180' : ''}`} />
                                </button>
                                {showAvatarMenu && (
                                    <div className={`absolute right-0 top-full mt-1 w-48 rounded-xl border shadow-lg z-50 overflow-hidden ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                                        <button
                                            onClick={() => { setEditingNote(true); setNoteInput(currentUserData?.note || ''); setShowAvatarMenu(false); }}
                                            className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-medium transition ${darkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}
                                        >
                                            <Edit3 size={14} />
                                            Not Ekle / Düzenle
                                        </button>
                                        <div className={`border-t ${darkMode ? 'border-slate-700' : 'border-slate-100'}`} />
                                        <button
                                            onClick={handleLogout}
                                            className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-medium transition text-red-500 ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-red-50'}`}
                                        >
                                            <LogOut size={14} />
                                            Çıkış Yap
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {editingNote && (
                    <div className={`p-4 rounded-xl border max-w-md ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <p className="text-xs font-medium mb-2">Notunuz (max 100 karakter, tek satır):</p>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={noteInput}
                                onChange={(e) => setNoteInput(e.target.value.replace(/[\r\n]/g, '').substring(0, 100))}
                                placeholder="Notunuzu yazın..."
                                className={`flex-1 p-2 rounded-lg border text-xs outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                autoFocus
                            />
                            <button onClick={saveNote} disabled={noteSaving} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition">
                                <Check size={14} />
                            </button>
                            <button onClick={() => setEditingNote(false)} className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                                <X size={14} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{noteInput.length}/100</p>
                    </div>
                )}

                {showLoginForm && !user && (
                    <div className={`p-4 rounded-xl border max-w-md ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                        {loginError && <p className="text-red-500 text-sm mb-3 font-medium">{loginError}</p>}
                        {loginStep === 'username' ? (
                            <form onSubmit={startLogin} className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Nick#0000"
                                        value={loginNick}
                                        onChange={handleLoginNickChange}
                                        className={`flex-1 p-2 rounded-lg border text-xs outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                                        autoFocus
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!isLoginNickValid}
                                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition text-white ${isLoginNickValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400 cursor-not-allowed'}`}
                                    >
                                        Kod Üret
                                    </button>
                                    <button type="button" onClick={() => { setShowLoginForm(false); setLoginNick(''); setIsLoginNickValid(false); }} className={`px-2 py-2 rounded-lg text-xs font-semibold border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                                        İptal
                                    </button>
                                </div>
                                <p className={`text-[11px] ${isLoginNickValid ? 'text-green-500' : 'text-slate-400'}`}>
                                    Format: Nick#0000
                                </p>
                            </form>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs font-medium">Cafedeki herhangi bir konuya şunu yazın:</p>
                                <div className={`p-3 rounded-lg text-center text-xl font-black tracking-widest text-blue-600 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                    !caferank login {generatedCode}
                                </div>
                                <p className="text-sm font-bold text-orange-500">Kalan Süre: {timeLeft} saniye</p>
                                <button type="button" onClick={() => { setLoginStep('username'); setShowLoginForm(false); setGeneratedCode(''); setLoginNick(''); setIsLoginNickValid(false); }} className={`w-full px-3 py-2 rounded-lg text-xs font-semibold border ${darkMode ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`}>
                                    İptal
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-3 gap-3 max-w-2xl">
                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <MessageSquare size={16} className="text-blue-500" />
                        <div className="text-xs">
                            <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Mesajlar</p>
                            <p className="font-bold text-sm">{totalMessages}</p>
                        </div>
                    </div>
                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <FileText size={16} className="text-cyan-500" />
                        <div className="text-xs">
                            <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Konular</p>
                            <p className="font-bold text-sm">{totalTopics}</p>
                        </div>
                    </div>
                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${darkMode ? 'bg-slate-800/40 border-slate-700/60' : 'bg-white border-slate-200 shadow-sm'}`}>
                        <Users size={16} className="text-emerald-500" />
                        <div className="text-xs">
                            <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Kişiler</p>
                            <p className="font-bold text-sm">{total}</p>
                        </div>
                    </div>
                </div>

                <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className={`p-3 border-b flex items-center gap-3 ${darkMode ? 'border-slate-700 bg-slate-800/20' : 'border-slate-200 bg-slate-50'}`}>
                        <Search className={darkMode ? 'text-slate-500' : 'text-slate-400'} size={16} />
                        <input
                            type="text"
                            placeholder="Kullanıcı adı ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`bg-transparent border-none outline-none text-sm w-full ${darkMode ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className={`border-b text-xs font-bold uppercase tracking-wider ${darkMode ? 'border-slate-700 text-slate-400 bg-slate-800/10' : 'border-slate-200 text-slate-500 bg-slate-50'}`}>
                                    <th className="p-4 w-12 text-center">Sıra</th>
                                    <th className="p-4 w-16">Profil</th>
                                    <th className="p-4">Kullanıcı Adı</th>
                                    <th className="p-4">Konular</th>
                                    <th className="p-4">Mesajlar</th>
                                    <th className="p-4">Toplam</th>
                                    <th className="p-4">Son Görülme</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                                {loading ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">Yükleniyor...</td></tr>
                                ) : filteredData.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">Veri bulunamadı.</td></tr>
                                ) : (
                                    filteredData.map((item, index) => {
                                        if (!item || !item.nick) return null;
                                        return (
                                            <React.Fragment key={item.nick}>
                                                <tr className={`transition-colors ${getRowBg(index)}`}>
                                                    <td className="p-4 text-center font-bold">
                                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                                    </td>
                                                    <td className="p-4">
                                                        {!avatarErrors[item.nick] ? (
                                                            <img
                                                                src={`/api/avatar?name=${encodeURIComponent(item.nick)}`}
                                                                alt={item.nick}
                                                                className="w-10 h-10 rounded-lg object-cover bg-slate-700/20 border border-slate-300/30"
                                                                onError={() => setAvatarErrors(prev => ({ ...prev, [item.nick]: true }))}
                                                            />
                                                        ) : (
                                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold tracking-wider ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                                                                {item.nick.substring(0, 3).toUpperCase()}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className={`p-4 ${getRankColor(index)}`}>
                                                        <div>{item.nick}</div>
                                                        {item.note && (
                                                            <div className={`text-[11px] mt-0.5 truncate max-w-[200px] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.note}</div>
                                                        )}
                                                    </td>
                                                    <td className={`p-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.topics}</td>
                                                    <td className={`p-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.messages}</td>
                                                    <td className={`p-4 font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                                                        {(item.messages || 0) + (item.topics || 0)}
                                                    </td>
                                                    <td className={`p-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {formatLastOnline(item.lastonlineostime)}
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                        {loadingMore && (
                            <div className="p-4 text-center text-slate-400 text-sm">Yükleniyor...</div>
                        )}
                        <div ref={bottomTriggerRef} className="h-1" />
                    </div>
                </div>
            </div>
        </div>
    );
}
