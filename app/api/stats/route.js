import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Global bir nesnede verileri hafızada (RAM) tutuyoruz, böylece Vercel'de anlık güncellenebilecek
global.cachedBotData = global.cachedBotData || {};

// İlk açılışta eğer hafıza boşsa lokaldeki bot.txt'den verileri yükle
if (Object.keys(global.cachedBotData).length === 0) {
  try {
    const filePath = path.join(process.cwd(), 'bot.txt');
    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const lines = fileContent.split(/\r?\n/);
      const regex = /\["([^"]+)"\]\s*=\s*\{\s*messages\s*=\s*(\d+)\s*,\s*topics\s*=\s*(\d+)\s*,\s*lastonlineostime\s*=\s*(\d+)\s*\}/;

      lines.forEach(line => {
        const match = line.match(regex);
        if (match) {
          const [_, nick, messages, topics, osTime] = match;
          global.cachedBotData[nick] = {
            messages: parseInt(messages) || 0,
            topics: parseInt(topics) || 0,
            osTime: parseInt(osTime) || 0
          };
        }
      });
    }
  } catch (e) {
    console.log("İlk yükleme hatası:", e);
  }
}

// Sitenin verileri çektiği fonksiyon (GET)
export async function GET() {
  const data = Object.entries(global.cachedBotData).map(([nick, info]) => {
    const date = info.osTime ? new Date(info.osTime * 1000).toLocaleString('tr-TR') : 'Bilinmiyor';
    return {
      nick,
      messages: info.messages,
      topics: info.topics,
      total: info.messages + info.topics,
      lastSeen: date
    };
  });

  data.sort((a, b) => b.total - a.total);
  return NextResponse.json(data);
}

// AHK Botunun internet üzerinden veri göndereceği fonksiyon (POST)
export async function POST(request) {
  try {
    const body = await request.json();
    const { nick, addMessage, addTopic, osTime } = body;

    if (!nick) return NextResponse.json({ error: 'Nick eksik' }, { status: 400 });

    if (!global.cachedBotData[nick]) {
      global.cachedBotData[nick] = { messages: 0, topics: 0, osTime: 0 };
    }

    if (addMessage) global.cachedBotData[nick].messages += 1;
    if (addTopic) global.cachedBotData[nick].topics += 1;
    if (osTime) global.cachedBotData[nick].osTime = osTime;

    return NextResponse.json({ success: true, user: global.cachedBotData[nick] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}