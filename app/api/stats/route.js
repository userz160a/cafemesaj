import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const statsFilePath = 'C:/Yeni klasör/bot-dashboard/bot.txt';
let activeCodes = {}; 
let activeSessions = {}; 

function readStatsFile() {
  try {
    if (!fs.existsSync(statsFilePath)) return {};
    const content = fs.readFileSync(statsFilePath, 'utf-8');
    const stats = {};
    const regex = /\["([^"]+)"\]\s*=\s*\{\s*messages\s*=\s*(\d+)\s*,\s*topics\s*=\s*(\d+)\s*,\s*lastonlineostime\s*=\s*(\d+)\s*\}/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      stats[match[1]] = {
        nick: match[1],
        messages: parseInt(match[2]),
        topics: parseInt(match[3]),
        lastonlineostime: parseInt(match[4]),
      };
    }
    return stats;
  } catch (e) {
    return {};
  }
}

export async function GET() {
  const stats = readStatsFile();
  return NextResponse.json(Object.values(stats));
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { type, nick, code, action, sessionToken, avatar } = body;

    if (type === 'verification') {
      if (activeCodes[nick] && activeCodes[nick].code === code) {
        const now = Date.now();
        if (now <= activeCodes[nick].expires) {
          activeCodes[nick].verified = true;
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'login') {
      const now = Date.now();
      
      if (!code) {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        activeCodes[nick] = {
          code: generatedCode,
          expires: now + 120000,
          verified: false
        };
        return NextResponse.json({ success: true, step: 'wait', code: generatedCode });
      }

      if (activeCodes[nick]) {
        if (now > activeCodes[nick].expires) {
          return NextResponse.json({ success: false, message: 'Kullanıcı adı veya doğrulama kodu hatalı.' });
        }
        
        if (activeCodes[nick].verified && activeCodes[nick].code === code) {
          const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
          activeSessions[token] = { nick: nick, expires: now + 86400000 * 7 };
          delete activeCodes[nick];
          return NextResponse.json({ success: true, step: 'success', token, nick });
        }
      }
      return NextResponse.json({ success: false, message: 'Kullanıcı adı veya doğrulama kodu hatalı.' });
    }

    if (body.messageContent && body.messageContent.toLowerCase().includes('çıkış yap')) {
      const senderNick = body.nick;
      for (const token in activeSessions) {
        if (activeSessions[token].nick === senderNick) {
          delete activeSessions[token];
        }
      }
    }

    if (action === 'updateAvatar') {
      if (!sessionToken || !activeSessions[sessionToken]) {
        return NextResponse.json({ success: false, message: 'Yetkisiz işlem.' });
      }
      const userNick = activeSessions[sessionToken].nick;
      const base64Data = avatar.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const avatarDir = 'C:/Yeni klasör/bot-dashboard/avatars';
      if (!fs.existsSync(avatarDir)){
        fs.mkdirSync(avatarDir, { recursive: true });
      }
      const safeNick = userNick.replace(/[^a-zA-Z0-9_#-]/g, '_');
      fs.writeFileSync(`${avatarDir}/${safeNick}.png`, buffer);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
