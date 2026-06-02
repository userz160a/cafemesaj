'use client';
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, MessageSquare, BookOpen, Users, Activity } from 'lucide-react';

export default function Home() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      });
  }, []);

  const filteredData = data.filter(item => 
    item.nick.toLowerCase().includes(search.toLowerCase())
  );

  const totalMessages = data.reduce((sum, item) => sum + item.messages, 0);
  const totalTopics = data.reduce((sum, item) => sum + item.topics, 0);
  const topUsersForChart = data.slice(0, 7); // Grafik için en aktif 7 kişi

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900 text-white font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-5">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r border-none from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Bot İstatistik Paneli
            </h1>
            <p className="text-gray-400 text-sm mt-1">bot.txt verileri canlı analiz raporu</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Kullanıcı adı veya tag ara..."
              className="bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-64 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Kartlar (Özet İstatistikler) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg"><Users /></div>
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase">Toplam Oyuncu</p>
              <p className="text-2xl font-bold">{data.length}</p>
            </div>
          </div>
          <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex items-center space-x-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg"><MessageSquare /></div>
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase">Toplam Mesaj</p>
              <p className="text-2xl font-bold">{totalMessages}</p>
            </div>
          </div>
          <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 text-purple-400 rounded-lg"><BookOpen /></div>
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase">Toplam Konu</p>
              <p className="text-2xl font-bold">{totalTopics}</p>
            </div>
          </div>
          <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 flex items-center space-x-4">
            <div className="p-3 bg-orange-500/10 text-orange-400 rounded-lg"><Activity /></div>
            <div>
              <p className="text-gray-400 text-xs font-medium uppercase">Toplam Etkileşim</p>
              <p className="text-2xl font-bold">{totalMessages + totalTopics}</p>
            </div>
          </div>
        </div>

        {/* Grafik ve Tablo Yan Yana */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Grafik (En Aktifler) */}
          <div className="lg:col-span-1 bg-gray-900 p-5 rounded-xl border border-gray-800 flex flex-col">
            <h2 className="text-lg font-semibold mb-4 text-gray-300">En Aktif 7 Oyuncu</h2>
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topUsersForChart} layout="vertical">
                  <XAxis type="number" stroke="#6b7280" fontSize={12} />
                  <YAxis dataKey="nick" type="category" stroke="#6b7280" fontSize={10} width={80} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                  />
                  <Bar dataKey="total" name="Etkileşim" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Veri Listesi Tablosu */}
          <div className="lg:col-span-2 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-gray-300">Oyuncu Detayları</h2>
            </div>
            <div className="overflow-x-auto max-h-[350px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-950 text-gray-400 sticky top-0">
                  <tr>
                    <th className="p-4 font-medium">Kullanıcı Adı</th>
                    <th className="p-4 font-medium">Mesajlar</th>
                    <th className="p-4 font-medium">Konular</th>
                    <th className="p-4 font-medium">Son Görülme</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredData.map((user, idx) => (
                    <tr key={idx} className="hover:bg-gray-850/50 transition-colors">
                      <td className="p-4 font-mono text-blue-400">{user.nick}</td>
                      <td className="p-4">{user.messages}</td>
                      <td className="p-4">{user.topics}</td>
                      <td className="p-4 text-gray-400 text-xs">{user.lastSeen}</td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">Eşleşen veri bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}