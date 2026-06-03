import { NextResponse } from 'next/server';

global.cachedBotData = global.cachedBotData || {};
global.lastScrapedTime = global.lastScrapedTime || {};

async function scrapeAvatar(nick) {
  try {
    const atelierUrl = `https://atelier801.com/profile?pr=${encodeURIComponent(nick)}`;
    const atelierRes = await fetch(atelierUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (atelierRes.ok) {
      const html = await atelierRes.text();
      const regex = /http:\/\/avatars\.atelier801\.com\/[^"'\s>]+/g;
      const matches = html.match(regex);
      if (matches && matches.length >= 2) {
        return matches[1].split('?')[0];
      }
      if (matches && matches.length === 1) {
        return matches[0].split('?')[0];
      }
    }
  } catch (err) {}
  return '';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('clear') === 'true') {
    global.cachedBotData = {};
    return new NextResponse("Tüm veriler temizlendi!");
  }

  const now = Date.now();
  const entries = Object.entries(global.cachedBotData);

  await Promise.all(entries.slice(0, 5).map(async ([nick, info]) => {
    const lastScraped = global.lastScrapedTime[nick] || 0;
    if (now - lastScraped > 5 * 60 * 1000 || !info.avatarUrl) {
      global.lastScrapedTime[nick] = now;
      const avatarUrl = await scrapeAvatar(nick);
      if (global.cachedBotData[nick] && avatarUrl) {
        global.cachedBotData[nick].avatarUrl = avatarUrl;
      }
    }
  }));

  const data = Object.entries(global.cachedBotData).map(([nick, info]) => ({
    nick,
    messages: info.messages || 0,
    topics: info.topics || 0,
    total: (info.messages || 0) + (info.topics || 0),
    lastSeen: info.osTime ? new Date((info.osTime + 10800) * 1000).toLocaleString('tr-TR') : 'Unknown',
    avatarUrl: info.avatarUrl || ''
  }));

  data.sort((a, b) => b.total - a.total);
  return NextResponse.json(data);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nick, addMessage, addTopic, osTime, messageContent } = body;

    if (!nick) return NextResponse.json({ error: 'Missing nick' }, { status: 400 });

    if (!global.cachedBotData[nick]) {
      global.cachedBotData[nick] = {
        messages: 0,
        topics: 0,
        osTime: 0,
        avatarUrl: '',
        messagesHistory: []
      };
    }

    if (osTime) global.cachedBotData[nick].osTime = osTime;
    if (addTopic) global.cachedBotData[nick].topics += 1;

    if (addMessage) {
      if (messageContent) {
        const clean = messageContent.trim().replace(/\r/g, "");
        const history = global.cachedBotData[nick].messagesHistory || [];
        if (!history.includes(clean)) {
          history.push(clean);
          global.cachedBotData[nick].messages += 1;
          global.cachedBotData[nick].messagesHistory = history.slice(-200);
        }
      } else {
        global.cachedBotData[nick].messages += 1;
      }
    }

    return NextResponse.json({ success: true, user: global.cachedBotData[nick] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}