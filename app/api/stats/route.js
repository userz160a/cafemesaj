import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

global.cachedBotData = global.cachedBotData || {};
global.lastScrapedTime = global.lastScrapedTime || {};

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
            osTime: parseInt(osTime) || 0,
            avatarUrl: '',
            danceGifUrl: ''
          };
        }
      });
    }
  } catch (e) {
    console.log("Initial load error:", e);
  }
}

async function scrapeExternalData(nick) {
  try {
    const cleanNickForUrl = nick.replace('#', '%2523');
    const cypherUrl = `https://projects.cypher801.app/profile/?player=${cleanNickForUrl}`;
    const cypherRes = await fetch(cypherUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    let danceGifUrl = '';
    
    if (cypherRes.ok) {
      const html = await cypherRes.text();
      const match = html.match(/data-value="([^"]+)"\s+id="playerOutfit"/);
      if (match && match[1]) {
        const outfit = encodeURIComponent(match[1]);
        danceGifUrl = `https://projects.cypher801.app/controller/render/AnimatedWebp.php/?playerLook=${outfit}&anim=Danse`;
      }
    }

    const atelierUrl = `https://atelier801.com/profile?pr=${encodeURIComponent(nick)}`;
    const atelierRes = await fetch(atelierUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    let avatarUrl = '';

    if (atelierRes.ok) {
      const html = await atelierRes.text();
      const regex = /http:\/\/avatars\.atelier801\.com\/[^"'\s>]+/g;
      const matches = html.match(regex);
      if (matches && matches.length >= 2) {
        avatarUrl = matches[1]; 
      }
    }

    return { avatarUrl, danceGifUrl };
  } catch (err) {
    console.error(`Scraping failed for ${nick}:`, err);
    return { avatarUrl: '', danceGifUrl: '' };
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('clear') === 'true') {
    global.cachedBotData = {};
    return new NextResponse("All data has been successfully cleared!");
  }

  const now = Date.now();
  const entries = Object.entries(global.cachedBotData);

  for (const [nick, info] of entries) {
    const lastScraped = global.lastScrapedTime[nick] || 0;
    if (now - lastScraped > 5 * 60 * 1000 || !info.avatarUrl) {
      const scraped = await scrapeExternalData(nick);
      global.cachedBotData[nick].avatarUrl = scraped.avatarUrl || info.avatarUrl;
      global.cachedBotData[nick].danceGifUrl = scraped.danceGifUrl || info.danceGifUrl;
      global.lastScrapedTime[nick] = now;
    }
  }

  const data = Object.entries(global.cachedBotData).map(([nick, info]) => {
    const date = info.osTime ? new Date(info.osTime * 1000).toLocaleString('tr-TR') : 'Unknown';
    return {
      nick,
      messages: info.messages,
      topics: info.topics,
      total: info.messages + info.topics,
      lastSeen: date,
      avatarUrl: info.avatarUrl,
      danceGifUrl: info.danceGifUrl
    };
  });

  data.sort((a, b) => b.total - a.total);
  return NextResponse.json(data);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nick, addMessage, addTopic, osTime } = body;

    if (!nick) return NextResponse.json({ error: 'Missing nick' }, { status: 400 });

    if (!global.cachedBotData[nick]) {
      global.cachedBotData[nick] = { messages: 0, topics: 0, osTime: 0, avatarUrl: '', danceGifUrl: '' };
    }

    if (addMessage) global.cachedBotData[nick].messages += 1;
    if (addTopic) global.cachedBotData[nick].topics += 1;
    if (osTime) global.cachedBotData[nick].osTime = osTime;

    return NextResponse.json({ success: true, user: global.cachedBotData[nick] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}