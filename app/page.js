'use client';

import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, MessageSquare, FileText, Users, Moon, Sun } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [avatarErrors, setAvatarErrors] = useState({});

  const fetchData = async () => {
    try {
      const res = await fetch('/api/stats', {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
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
      setAvatarErrors(prevErrors => {
        const updatedErrors = { ...prevErrors };
        Object.keys(updatedErrors).forEach(nick => {
          if (updatedErrors[nick] === true) {
            delete updatedErrors[nick];
          }
        });
        return updatedErrors;
      });
    }, 120000);

    return () => {
      clearInterval(dataInterval);
      clearInterval(avatarInterval);
    };
  }, []);

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

  const handleAvatarError = (nick) => {
    setAvatarErrors(prev => ({ ...prev, [nick]: true }));
  };

  const getFallbackText = (nick) => {
    if (!nick) return '';
    return nick.substring(0, 3).toUpperCase();
  };

  if (loading && data.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-blue-500" size={32} />
          <p className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Cafe Rank Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-6 font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-6xl mx-auto space-y-6">

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
                  <th className="p-4 text-right">Son Aktif</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">Veri bulunamadı.</td>
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
                              src={`/api/avatar?name=${encodeURIComponent(item.nick)}`}
                              alt={item.nick}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-700/20 border border-slate-300/30"
                              onError={() => handleAvatarError(item.nick)}
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold tracking-wider ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                              {getFallbackText(item.nick)}
                            </div>
                          )}
                        </td>
                        <td className={`p-4 ${getRankColor(index)}`}>{item.nick}</td>
                        <td className={`p-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.topics}</td>
                        <td className={`p-4 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{item.messages}</td>
                        <td className="p-4 font-bold">{item.total}</td>
                        <td className={`p-4 text-right text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{item.lastSeen}</td>
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