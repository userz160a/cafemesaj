import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hcxwjnkywsfwviexjopt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZJFVMWFEHL32yXZXzqT4ZQ_3fNbZTO-';

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function GET() {
  try {
    if (!supabase) return NextResponse.json({ success: false, error: 'Supabase hatasi' }, { status: 500 });
    const { data, error } = await supabase.from('stats').select('*').order('messages', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { type, nick, code, action, sessionToken, avatar } = body;

    // 1. AHK'DAN GELEN DOĞRULAMA (verification)
    if (type === 'verification') {
      const now = new Date().toISOString();
      // Önce bu nick için bekleyen bir kod var mı bak
      const { data: activeCode } = await supabase
        .from('active_codes')
        .select('*')
        .eq('nick', nick)
        .eq('code', code)
        .gt('expires_at', now)
        .single();

      if (activeCode) {
        await supabase.from('active_codes').update({ verified: true }).eq('id', activeCode.id);
        return NextResponse.json({ success: true, status: "verified" });
      }
      return NextResponse.json({ success: false, message: "Kod eslesmedi" });
    }

    // 2. WEB SİTESİNDEN GELEN LOGIN İSTEĞİ (action === 'login')
    if (action === 'login') {
      const now = new Date().toISOString();

      // KOD ÜRETME (İlk adım)
      if (!code) {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 120000).toISOString();
        await supabase.from('active_codes').delete().eq('nick', nick);
        await supabase.from('active_codes').insert([{ nick, code: generatedCode, expires_at: expiresAt, verified: false }]);
        return NextResponse.json({ success: true, step: 'wait', code: generatedCode });
      }

      // KOD DOĞRULAMA (İkinci adım - Sadece AHK verified yaptıysa geçer)
      const { data: activeCode } = await supabase
        .from('active_codes')
        .select('*')
        .eq('nick', nick)
        .eq('code', code)
        .eq('verified', true) // AHK'nın verified: true yapmasını bekliyoruz!
        .gt('expires_at', now)
        .single();

      if (activeCode) {
        const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await supabase.from('sessions').insert([{ token, nick, expires_at: sessionExpires }]);
        await supabase.from('active_codes').delete().eq('id', activeCode.id);
        return NextResponse.json({ success: true, step: 'success', token, nick });
      }
      return NextResponse.json({ success: false, message: 'Kod henüz doğrulanmadı veya hatalı.' });
    }

    // 3. MESAJ VE KONU İSTATİSTİKLERİ
    if (nick && !action) {
      const { data: existingUser } = await supabase.from('stats').select('*').eq('nick', nick).single();
      const osTimeNum = parseInt(body.osTime) || Math.floor(Date.now() / 1000);
      if (existingUser) {
        await supabase.from('stats').update({ 
          messages: existingUser.messages + (body.addMessage ? 1 : 0), 
          topics: existingUser.topics + (body.addTopic ? 1 : 0), 
          lastonlineostime: osTimeNum 
        }).eq('nick', nick);
      } else {
        await supabase.from('stats').insert([{ nick, messages: body.addMessage ? 1 : 0, topics: body.addTopic ? 1 : 0, lastonlineostime: osTimeNum }]);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
