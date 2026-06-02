'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MessageSquare, FileText, Activity, Search, RefreshCw } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/stats');
      if (res.ok) {
        const jsonData = await res.json();
        setData(Array.isArray(jsonData) ? jsonData : []);
      }
    } catch (error) {
      console.error("Veri cekme hatasi:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // 5 saniyede bir canli yenile
    return () => clearInterval(interval);
  }, []);

  // Guvenli filtreleme (Tip hatalarini onlemek icin)
  const filteredData = (data || []).filter(item => 
    item && item.nick && item.nick.toLowerCase().includes((search || '').toLowerCase())
  );

  const totalMessages = (data || []).reduce((sum, item) => sum + (Number(item?.messages) || 0), 0);
  const totalTopics = (data || []).reduce((sum, item) => sum + (Number(item?.topics) || 0), 0);
  const activeUsers = (data || []).length;

  if (loading && data.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-blue-500" size={40} />
          <p className="text-slate-400">Panel Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5 gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Bot İstatistik Paneli
            </h1>
            <p className="text-slate-400 text-sm mt-1">Anlık kullanıcı etkileşim verileri</p>
          </div>
          <button 
            onClick={fetchData}
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm border border-slate-700 transition"
          >
            <RefreshCw size={16} /> Yenile
          </button>
        </div>

        {/* Kartlar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><MessageSquare size={24} /></div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Toplam Mesaj</p>
              <h3 className="text-2xl font-bold mt-0.5">{totalMessages}</h3>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg"><FileText size={24} /></div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Toplam Konu</p>
              <h3 className="text-2xl font-bold mt-0.5">{totalTopics}</h3>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 p-5 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><Activity size={24} /></div>
            <div>
              <p className="text-sm text-slate-400 font-medium">Aktif Oyuncu</p>
              <h3 className="text-2xl font-bold mt-0.5">{activeUsers}</h3>
            </div>
          </div>
        </div>

        {/* Grafik Bölümü */}
        {filteredData.length > 0 && (
          <div className="bg-slate-800/40 border border-slate-700 p-5 rounded-xl h-80">
            <h2 className="text-lg font-semibold mb-4 text-slate-300">En Aktif Oyuncular Grafiği</h2>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData.slice(0, 7)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="nick" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }} />
                <Legend />
                <Bar dataKey="messages" name="Mesajlar" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="topics" name="Konular" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Tablo ve Arama */}
        <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700 bg-slate-800/30 flex items-center gap-3">
            <Search className="text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Kullanıcı adı ara..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-slate-500"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400 bg-slate-800/20">
                  <th className="p-4 font-semibold">Kullanıcı Adı</th>
                  <th className="p-4 font-semibold">Mesajlar</th>
                  <th className="p-4 font-semibold">Konular</th>
                  <th className="p-4 font-semibold">Toplam Etkileşim</th>
                  <th className="p-4 font-semibold text-right">Son Görülme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">Kayıtlı veri bulunamadı.</td>
                  </tr>
                ) : (
                  filteredData.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-800/30 transition">
                      <td className="p-4 font-medium text-blue-400">{item.nick}</td>
                      <td className="p-4 text-slate-300">{item.messages}</td>
                      <td className="p-4 text-slate-300">{item.topics}</td>
                      <td className="p-4 font-semibold text-white">{item.total}</td>
                      <td className="p-4 text-slate-400 text-right text-xs">{item.lastSeen}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}