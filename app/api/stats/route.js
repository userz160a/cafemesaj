import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

global.cachedBotData = global.cachedBotData || {};

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
    console.log("Initial load error:", e);
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('clear') === 'true') {
    global.cachedBotData = {};
    return new NextResponse("All data has been successfully cleared!");
  }

  const data = Object.entries(global.cachedBotData).map(([nick, info]) => {
    const date = info.osTime ? new Date(info.osTime * 1000).toLocaleString('en-US') : 'Unknown';
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

export async function POST(request) {
  try {
    const body = await request.json();
    const { nick, addMessage, addTopic, osTime } = body;

    if (!nick) return NextResponse.json({ error: 'Missing nick' }, { status: 400 });

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