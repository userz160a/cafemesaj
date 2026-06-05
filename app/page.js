'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, RefreshCw, MessageSquare, FileText, Users, Moon, Sun, Upload } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState({});
  const [cacheKey, setCacheKey] = useState(Date.now());
  const [user, setUser] = useState(null); 
  const [sessionToken, setSessionToken] = useState(null);
  const [loginNick, setLoginNick] = useState('');
  const [loginStep, setLoginStep] = useState('username');
  const [generatedCode, setGeneratedCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [loginError, setLoginError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('sessionToken');
    const savedNick = localStorage.getItem('sessionNick');
    if (savedToken && savedNick) {
      setSessionToken(savedToken);
      setUser(savedNick);
    }
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/stats', {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const jsonData = await res.json();
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          setData(jsonData);
        }
      }
    } catch (error) {
      console.error("Data fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const dataInterval = setInterval(fetchData, 60000);
    const avatarInterval = setInterval(() => {
      setAvatarErrors({});
      setCacheKey(Date.now());
    }, 120000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(avatarInterval);
    };
  }, []);

  useEffect(() => {
    if (loginStep !== 'code' || timeLeft <= 0) {
      if (timeLeft === 0) {
        setLoginError('Kullanıcı adı veya doğrulama kodu hatalı.');
        setLoginStep('username');
      }
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, loginStep]);

  const startLogin = async (e) => {
    e.preventDefault();
    if (!loginNick.trim()) return;
    setLoginError('');

    const res = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', nick: loginNick })
    });
    const result = await res.json();

    if (result.success && result.step === 'wait') {
      setGeneratedCode(result.code);
      setTimeLeft(120);
      setLoginStep('code');
    } else {
      setLoginError('Sistemde bir hata oluştu.');
    }
  };

  const completeLogin = async () => {
    setLoginError('');
    const res = await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', nick: loginNick, code: generatedCode })
    });
    const result = await res.json();

    if (result.success && result.step === 'success') {
      localStorage.setItem('sessionToken', result.token);
      localStorage.setItem('sessionNick', result.nick);
      setSessionToken(result.token);
      setUser(result.nick);
      setLoginStep('username');
      setLoginNick('');
    } else {
      setLoginError(result.message || 'Kullanıcı adı veya doğrulama kodu hatalı.');
      setLoginStep('username');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('sessionNick');
    setSessionToken(null);
    setUser(null);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxSize = 512;
        let width = img.width;
        let height = img.height;
        const size = Math.min(width, height);
        const xOffset = (width - size) / 2;
        const yOffset = (height - size) / 2;

        canvas.width = size > maxSize ? maxSize : size;
        canvas.height = size > maxSize ? maxSize : size;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, canvas.width, canvas.height);

        const base64Image = canvas.toDataURL('image/png');

        const res = await fetch('/api/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'updateAvatar',
            sessionToken: sessionToken,
            avatar: base64Image
          })
        });
        const uploadResult = await res.json();
        if (uploadResult.success) {
          setCacheKey(Date.now());
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const filteredData = (data || []).filter(item =>
    item && item.nick && item.nick.toLowerCase().includes((search || '').toLowerCase())
  );

  const totalMessages = (data || []).reduce((sum, item) => sum + (Number(item?.messages) || 0), 0);
  const totalTopics = (data || []).reduce((sum, item) => sum + (Number(item?.topics) || 0), 0);
  const totalUsers = (data || []).length;

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

  return (
    <div className={`min-h-screen p-4 md:p-6 font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className={`p-6 rounded-xl border ${darkMode ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
          {!user ? (
            <div>
              <h2 className="text-xl font-bold mb-4">Giriş Yap</h2>
              {loginError && <p className="text-red-500 text-sm mb-3 font-medium">{loginError}</p>}
              
              {loginStep === 'username' ? (
                <form onSubmit={startLogin} className="flex gap-3 max-w-md">
                  <input
                    type="text"
                    placeholder="Oyun kullanıcı adınız (Örn: Nick#0000)"
                    value={loginNick}
                    onChange={(e) => setLoginNick(e.target.value)}
                    className={`flex-1 p-2 rounded-lg border text-sm outline-none ${darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                  />
                  <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                    Kod Üret
                  </button>
                </form>
              ) : (
                <div className="space-y-3 max-w-md">
                  <p className="text-sm font-medium">Caferank#3180'e transformiceden alttaki kodu gönderiniz.</p>
                  <div className="bg-slate-200 dark:bg-slate-700 p-4 rounded-lg text-center text-2xl font-black tracking-widest text-blue-600 dark:text-blue-400">
                    {generatedCode}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Doğrulama kodunun alınması süre alabilir</p>
                  <p className="text-sm font-bold text-orange-500">Kalan Süre: {timeLeft} saniye</p>
                  <button onClick={completeLogin} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-semibold transition">
                    Giriş Yap
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current.click()}>
                  <img
                    src={`/api/avatar?name=${encodeURIComponent(user)}&v=${cacheKey}`}
                    alt={user}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-700/20 border-2 border-blue-500"
                    onError={(e) => { e.target.src = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='%23334155'/></svg>"; }}
                  />
                  <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200">
                    <Upload size={18} className="text-white" />
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{user}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Fotoğrafınızı değiştirmek için üzerine tıklayın (Max 512x512 ölçeklenir)</p>
                </div>
              </div>
              <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition self-start sm:self-center">
                Oturumu Kapat
              </button>
            </div>
          )}
        </div>

        <div className={`flex items-center justify-between border-b pb-4 ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
            Cafe Rank
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="relative w-16 h-8 flex items-center bg-amber-500 rounded-full p-1 cursor-pointer transition-colors duration-300 outline-none border-none"
            >
              <div className={`bg-white w-6 h-6 rounded-full shadow-md flex items-center justify-center transition-transform duration-300 ${darkMode ? 'translate-x-8' : 'translate-x-0'}`}>
                {darkMode ? <Moon size={14} className="text-amber-500" /> : <Sun size={14} className="text-amber-500" />}
              </div>
            </button>
            <button
              onClick={fetchData}
              className={`p-2 rounded-lg border transition ${darkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white' : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'}`}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

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
              <p className="font-bold text-sm">{totalUsers}</p>
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
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">Veri bulunamadı.</td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => {
                    if (!item || !item.nick) return null;
                    return (
                      <tr key={item.nick} className={`transition-colors ${getRowBg(index)}`}>
                        <td className="p-4 text-center font-bold">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                        </td>
                        <td className="p-4">
                          {!avatarErrors[item.nick] ? (
                            <img
                              src={`/api/avatar?name=${encodeURIComponent(item.nick)}&v=${cacheKey}`}
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
                        <td className={`p-4 ${getRankColor(index)}`}>{item.nick}</td>
                        <td className={`p-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.topics}</td>
                        <td className={`p-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.messages}</td>
                        <td className={`p-4 font-bold ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                          {(item.messages || 0) + (item.topics || 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
