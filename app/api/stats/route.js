import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hcxwjnkywsfwviexjopt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZJFVMWFEHL32yXZXzqT4ZQ_3fNbZTO-';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function logToFile(data) {
  try {
    const logDir = 'C:/Yeni klasör/bot-dashboard';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logPath = path.join(logDir, 'bot_logs.txt');
    const timestamp = new Date().toLocaleString('tr-TR');
    const logMessage = `[${timestamp}] ${JSON.stringify(data, null, 2)}\n----------------------------------------\n`;
    fs.appendFileSync(logPath, logMessage, 'utf8');
  } catch (err) {
    console.error('Log yazma hatasi:', err);
  }
}

export async function GET() {
  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase baglantisi kurulamadi.' }, { status: 500 });
    }
    const { data, error } = await supabase
      .from('stats')
      .select('*')
      .order('messages', { ascending: false });
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Supabase baglantisi kurulamadi.' }, { status: 500 });
    }

    const body = await req.json();
    logToFile(body);

    const { type, nick, code, action, sessionToken, avatar, messageContent } = body;
    const cleanMessage = messageContent ? messageContent.replace(/[\r\n]+/g, ' ').trim() : '';

    if (type === 'verification' || (cleanMessage && cleanMessage.includes('!caferank login'))) {
      let extractedCode = code;
      if (!extractedCode && cleanMessage) {
        const match = cleanMessage.match(/!caferank\s+login\s+(\d+)/i);
        extractedCode = match ? match[1] : null;
      }

      if (extractedCode) {
        const now = new Date().toISOString();
        const cleanNick = nick ? nick.split('#')[0].trim() : '';

        const { data: activeCodes, error: fetchError } = await supabase
          .from('active_codes')
          .select('*')
          .eq('code', extractedCode)
          .gt('expires_at', now);

        if (activeCodes && !fetchError) {
          const matchingCode = activeCodes.find(c => c.nick.trim().toLowerCase() === cleanNick.toLowerCase());

          if (matchingCode) {
            await supabase
              .from('active_codes')
              .update({ verified: true })
              .eq('id', matchingCode.id);
            
            return NextResponse.json({ success: true, message: 'Kod basariyla dogrulandi.' });
          }
        }
      }
    }

    if (action === 'login') {
      const now = new Date().toISOString();
      const cleanNick = nick ? nick.split('#')[0].trim() : '';

      if (!code) {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 120000).toISOString();

        await supabase
          .from('active_codes')
          .delete()
          .ilike('nick', cleanNick);

        const { error: insertError } = await supabase
          .from('active_codes')
          .insert([{ nick: cleanNick, code: generatedCode, expires_at: expiresAt, verified: false }]);

        if (insertError) {
          return NextResponse.json({ success: false, message: `Veritabanı Hatası: ${insertError.message}` });
        }
        return NextResponse.json({ success: true, step: 'wait', code: generatedCode });
      }

      const { data: activeCodes, error: codeError } = await supabase
        .from('active_codes')
        .select('*')
        .eq('code', code)
        .gt('expires_at', now);

      if (codeError || !activeCodes) {
        return NextResponse.json({ success: false, message: 'Kullanici adi veya dogrulama kodu hatali ya da suresi doldu.' });
      }

      const matchingCode = activeCodes.find(c => c.nick.trim().toLowerCase() === cleanNick.toLowerCase());

      if (!matchingCode) {
        return NextResponse.json({ success: false, message: 'Kullanici adi veya dogrulama kodu hatali.' });
      }

      if (matchingCode.verified) {
        const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from('sessions')
          .delete()
          .ilike('nick', cleanNick);

        const { error: sessionError } = await supabase
          .from('sessions')
          .insert([{ token, nick: matchingCode.nick, expires_at: sessionExpires }]);

        if (sessionError) throw sessionError;

        await supabase
          .from('active_codes')
          .delete()
          .ilike('nick', cleanNick);

        return NextResponse.json({ success: true, step: 'success', token, nick: matchingCode.nick });
      }

      return NextResponse.json({ success: false, message: 'Kod cafede henuz dogrulanmadi. Lutfen bekleyin veya tekrar deneyin.' });
    }

    if (type === 'logoff' || (cleanMessage && cleanMessage.toLowerCase().includes('çıkış yap'))) {
      const cleanNick = nick ? nick.split('#')[0].trim() : '';
      await supabase
        .from('sessions')
        .delete()
        .ilike('nick', cleanNick);
      return NextResponse.json({ success: true });
    }

    if (action === 'updateAvatar') {
      if (!sessionToken) return NextResponse.json({ success: false, message: 'Yetkisiz islem.' });
      const now = new Date().toISOString();
      const { data: session, error: sessionCheckError } = await supabase
        .from('sessions')
        .select('nick')
        .eq('token', sessionToken)
        .gt('expires_at', now)
        .single();

      if (sessionCheckError || !session) return NextResponse.json({ success: false, message: 'Yetkisiz islem.' });

      const userNick = session.nick;
      const base64Data = avatar.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const avatarDir = 'C:/Yeni klasör/bot-dashboard/avatars';
      
      if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
      
      const safeNick = userNick.replace(/[^a-zA-Z0-9_#-]/g, '_');
      fs.writeFileSync(`${avatarDir}/${safeNick}.png`, buffer);
      return NextResponse.json({ success: true });
    }

    if (nick) {
      const cleanNick = nick.split('#')[0].trim();
      const { data: allStats } = await supabase.from('stats').select('*');
      const existingUser = allStats ? allStats.find(s => s.nick.toLowerCase() === cleanNick.toLowerCase()) : null;
      const osTimeNum = parseInt(body.osTime) || Math.floor(Date.now() / 1000);

      if (existingUser) {
        const newMessages = existingUser.messages + (body.addMessage ? 1 : 0);
        const newTopics = existingUser.topics + (body.addTopic ? 1 : 0);
        await supabase
          .from('stats')
          .update({ messages: newMessages, topics: newTopics, lastonlineostime: osTimeNum })
          .eq('id', existingUser.id);
      } else {
        const newMessages = body.addMessage ? 1 : 0;
        const newTopics = body.addTopic ? 1 : 0;
        await supabase
          .from('stats')
          .insert([{ nick: cleanNick, messages: newMessages, topics: newTopics, lastonlineostime: osTimeNum }]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
