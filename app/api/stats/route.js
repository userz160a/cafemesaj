import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hcxwjnkywsfwviexjopt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZJFVMWFEHL32yXZXzqT4ZQ_3fNbZTO-';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
    const { type, nick, code, action, sessionToken, avatar } = body;

    if (type === 'verification') {
      const now = new Date().toISOString();
      const { data: activeCode, error: fetchError } = await supabase
        .from('active_codes')
        .select('*')
        .eq('nick', nick)
        .eq('code', code)
        .gt('expires_at', now)
        .single();

      if (activeCode && !fetchError) {
        await supabase
          .from('active_codes')
          .update({ verified: true })
          .eq('id', activeCode.id);
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'login') {
      const now = new Date().toISOString();

      if (!code) {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 120000).toISOString();

        await supabase
          .from('active_codes')
          .delete()
          .eq('nick', nick);

        const { error: insertError } = await supabase
          .from('active_codes')
          .insert([{ nick, code: generatedCode, expires_at: expiresAt, verified: false }]);

        if (insertError) {
          return NextResponse.json({ success: false, message: `Veritabanı Hatası: ${insertError.message}` });
        }
        return NextResponse.json({ success: true, step: 'wait', code: generatedCode });
      }

      const { data: activeCode, error: codeError } = await supabase
        .from('active_codes')
        .select('*')
        .eq('nick', nick)
        .eq('code', code)
        .gt('expires_at', now)
        .single();

      if (codeError || !activeCode) {
        return NextResponse.json({ success: false, message: 'Kullanıcı adı veya doğrulama kodu hatalı.' });
      }

      if (activeCode.verified) {
        const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const { error: sessionError } = await supabase
          .from('sessions')
          .insert([{ token, nick, expires_at: sessionExpires }]);

        if (sessionError) throw sessionError;

        await supabase
          .from('active_codes')
          .delete()
          .eq('nick', nick);

        return NextResponse.json({ success: true, step: 'success', token, nick });
      }

      return NextResponse.json({ success: false, message: 'Kullanıcı adı veya doğrulama kodu hatalı.' });
    }

    if (type === 'logoff') {
      await supabase
        .from('sessions')
        .delete()
        .eq('nick', nick);
      return NextResponse.json({ success: true });
    }

    if (body.messageContent && body.messageContent.toLowerCase().includes('çıkış yap')) {
      const senderNick = body.nick;
      await supabase
        .from('sessions')
        .delete()
        .eq('nick', senderNick);
    }

    if (action === 'updateAvatar') {
      if (!sessionToken) {
        return NextResponse.json({ success: false, message: 'Yetkisiz işlem.' });
      }

      const now = new Date().toISOString();
      const { data: session, error: sessionCheckError } = await supabase
        .from('sessions')
        .select('nick')
        .eq('token', sessionToken)
        .gt('expires_at', now)
        .single();

      if (sessionCheckError || !session) {
        return NextResponse.json({ success: false, message: 'Yetkisiz işlem.' });
      }

      const userNick = session.nick;
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

    if (nick) {
      const { data: existingUser } = await supabase
        .from('stats')
        .select('*')
        .eq('nick', nick)
        .single();

      const osTimeNum = parseInt(body.osTime) || Math.floor(Date.now() / 1000);

      if (existingUser) {
        const newMessages = existingUser.messages + (body.addMessage ? 1 : 0);
        const newTopics = existingUser.topics + (body.addTopic ? 1 : 0);

        await supabase
          .from('stats')
          .update({ messages: newMessages, topics: newTopics, lastonlineostime: osTimeNum })
          .eq('nick', nick);
      } else {
        const newMessages = body.addMessage ? 1 : 0;
        const newTopics = body.addTopic ? 1 : 0;

        await supabase
          .from('stats')
          .insert([{ nick, messages: newMessages, topics: newTopics, lastonlineostime: osTimeNum }]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
