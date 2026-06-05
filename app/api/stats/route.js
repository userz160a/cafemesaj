import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hcxwjnkywsfwviexjopt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZJFVMWFEHL32yXZXzqT4ZQ_3fNbZTO-';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function normalizeNick(nick) {
    if (!nick) return '';
    return nick.trim().toLowerCase();
}

export async function GET() {
    try {
        if (!supabase) return NextResponse.json({ success: false, error: 'Supabase baglantisi kurulamadi.' }, { status: 500 });
        const { data, error } = await supabase.from('stats').select('*').order('messages', { ascending: false });
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        if (!supabase) return NextResponse.json({ success: false, error: 'Supabase baglantisi kurulamadi.' }, { status: 500 });
        const body = await req.json();
        const { type, nick, code, action, sessionToken, avatar, messageContent } = body;
        const cleanMessage = messageContent ? messageContent.replace(/[\r\n]+/g, ' ').trim() : '';
        const fullNick = nick ? nick.trim() : '';

        if (type === 'verification' || (cleanMessage && /!caferank\s+login\s+\d+/i.test(cleanMessage))) {
            let extractedCode = code;
            if (!extractedCode && cleanMessage) {
                const match = cleanMessage.match(/!caferank\s+login\s+(\d+)/i);
                extractedCode = match ? match[1] : null;
            }
            if (!extractedCode || !fullNick) return NextResponse.json({ success: false, message: 'Kod veya nick eksik.' });
            const now = new Date().toISOString();
            const { data: activeCodes, error: fetchError } = await supabase
                .from('active_codes').select('*').eq('code', extractedCode).gt('expires_at', now);
            if (fetchError || !activeCodes || activeCodes.length === 0)
                return NextResponse.json({ success: false, message: 'Kod bulunamadi veya suresi doldu.' });
            const matchingCode = activeCodes.find(c => normalizeNick(c.nick) === normalizeNick(fullNick));
            if (!matchingCode) return NextResponse.json({ success: false, message: 'Nick ile kod eslesmedi.' });
            await supabase.from('active_codes').update({ verified: true }).eq('id', matchingCode.id);
            return NextResponse.json({ success: true, message: 'Kod basariyla dogrulandi.' });
        }

        if (type === 'logoff' || (cleanMessage && /!caferank\s+logoff/i.test(cleanMessage))) {
            await supabase.from('sessions').delete().ilike('nick', fullNick);
            return NextResponse.json({ success: true });
        }

        if (action === 'login') {
            const now = new Date().toISOString();
            if (!code) {
                const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
                const expiresAt = new Date(Date.now() + 120000).toISOString();
                await supabase.from('active_codes').delete().ilike('nick', fullNick);
                const { error: insertError } = await supabase
                    .from('active_codes')
                    .insert([{ nick: fullNick, code: generatedCode, expires_at: expiresAt, verified: false }]);
                if (insertError) return NextResponse.json({ success: false, message: `Veritabani Hatasi: ${insertError.message}` });
                return NextResponse.json({ success: true, step: 'wait', code: generatedCode });
            }
            const { data: activeCodes, error: codeError } = await supabase
                .from('active_codes').select('*').eq('code', code).gt('expires_at', now);
            if (codeError || !activeCodes || activeCodes.length === 0)
                return NextResponse.json({ success: false, message: 'Kullanici adi veya dogrulama kodu hatali ya da suresi doldu.' });
            const matchingCode = activeCodes.find(c => normalizeNick(c.nick) === normalizeNick(fullNick));
            if (!matchingCode) return NextResponse.json({ success: false, message: 'Kullanici adi veya dogrulama kodu hatali.' });
            if (matchingCode.verified) {
                const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
                const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                await supabase.from('sessions').delete().ilike('nick', fullNick);
                const { error: sessionError } = await supabase
                    .from('sessions')
                    .insert([{ token, nick: matchingCode.nick, expires_at: sessionExpires }]);
                if (sessionError) throw sessionError;
                await supabase.from('active_codes').delete().ilike('nick', fullNick);
                return NextResponse.json({ success: true, step: 'success', token, nick: matchingCode.nick });
            }
            return NextResponse.json({ success: false, message: 'Kod cafede henuz dogrulanmadi. Lutfen bekleyin veya tekrar deneyin.' });
        }

        if (action === 'updateAvatar') {
            if (!sessionToken) return NextResponse.json({ success: false, message: 'Yetkisiz islem.' });
            const now = new Date().toISOString();
            const { data: session, error: sessionCheckError } = await supabase
                .from('sessions').select('nick').eq('token', sessionToken).gt('expires_at', now).single();
            if (sessionCheckError || !session) return NextResponse.json({ success: false, message: 'Yetkisiz islem.' });
            return NextResponse.json({ success: true });
        }

        if (fullNick) {
            const { data: allStats } = await supabase.from('stats').select('*');
            const existingUser = allStats ? allStats.find(s => normalizeNick(s.nick) === normalizeNick(fullNick)) : null;
            const osTimeNum = parseInt(body.osTime) || Math.floor(Date.now() / 1000);
            if (existingUser) {
                await supabase.from('stats').update({
                    messages: existingUser.messages + (body.addMessage ? 1 : 0),
                    topics: existingUser.topics + (body.addTopic ? 1 : 0),
                    lastonlineostime: osTimeNum
                }).eq('id', existingUser.id);
            } else {
                await supabase.from('stats').insert([{
                    nick: fullNick,
                    messages: body.addMessage ? 1 : 0,
                    topics: body.addTopic ? 1 : 0,
                    lastonlineostime: osTimeNum
                }]);
            }
        }
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
