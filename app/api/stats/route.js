import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

async function scrapeExternalData(nick) {
  try {
    const cleanNickForUrl = nick.replace('#', '%2523');
    const cypherUrl = `https://projects.cypher801.app/profile/?player=${cleanNickForUrl}`;
    const cypherRes = await fetch(cypherUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, next: { revalidate: 300 } });
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
    return { avatarUrl: '', danceGifUrl: '' };
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get('clear') === 'true') {
    const keys = await kv.keys('user:*');
    if (keys.length > 0) await kv.del(...keys);
    return new NextResponse("Tüm veriler temizlendi!");
  }

  const keys = await kv.keys('user:*');
  const data = [];
  const now = Date.now();

  for (const key of keys) {
    const info = await kv.get(key);
    if (!info) continue;
    const nick = key.replace('user:', '');

    if (now - (info.lastScraped || 0) > 5 * 60 * 1000 || !info.avatarUrl) {
      const scraped = await scrapeExternalData(nick);
      info.avatarUrl = scraped.avatarUrl || info.avatarUrl || '';
      info.danceGifUrl = scraped.danceGifUrl || info.danceGifUrl || '';
      info.lastScraped = now;
      await kv.set(key, info);
    }

    data.push({
      nick,
      messages: info.messages || 0,
      topics: info.topics || 0,
      total: (info.messages || 0) + (info.topics || 0),
      lastSeen: info.osTime ? new Date(info.osTime * 1000).toLocaleString('tr-TR') : 'Unknown',
      avatarUrl: info.avatarUrl || '',
      danceGifUrl: info.danceGifUrl || ''
    });
  }

  data.sort((a, b) => b.total - a.total);
  return NextResponse.json(data);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nick, addMessage, addTopic, osTime, messageContent } = body;

    if (!nick) return NextResponse.json({ error: 'Missing nick' }, { status: 400 });

    const key = `user:${nick}`;
    const existing = await kv.get(key) || {
      messages: 0,
      topics: 0,
      osTime: 0,
      avatarUrl: '',
      danceGifUrl: '',
      lastScraped: 0,
      messagesHistory: []
    };

    if (osTime) existing.osTime = osTime;
    if (addTopic) existing.topics += 1;

    if (addMessage) {
      if (messageContent) {
        const clean = messageContent.trim().replace(/\r/g, "");
        const history = existing.messagesHistory || [];
        if (!history.includes(clean)) {
          history.push(clean);
          existing.messages += 1;
          existing.messagesHistory = history.slice(-200);
        }
      } else {
        existing.messages += 1;
      }
    }

    await kv.set(key, existing);
    return NextResponse.json({ success: true, user: existing });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}