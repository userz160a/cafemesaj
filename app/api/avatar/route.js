import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hcxwjnkywsfwviexjopt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZJFVMWFEHL32yXZXzqT4ZQ_3fNbZTO-';
const supabase = createClient(supabaseUrl, supabaseKey);

async function getAvatarFromDB(nick) {
    const { data, error } = await supabase
        .from('avatars')
        .select('*')
        .ilike('nick', nick)
        .single();
    if (error || !data) return null;
    return data;
}

async function saveAvatarToDB(nick, imageBase64) {
    const { data: existing } = await supabase
        .from('avatars')
        .select('id')
        .ilike('nick', nick)
        .single();
    if (existing) {
        await supabase.from('avatars').update({ image_data: imageBase64, is_custom: true }).eq('id', existing.id);
    } else {
        await supabase.from('avatars').insert([{ nick, image_data: imageBase64, is_custom: true }]);
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    if (!name) return new NextResponse('Missing name', { status: 400 });

    try {
        const decodedNick = decodeURIComponent(name);
        const localAvatar = await getAvatarFromDB(decodedNick);

        if (localAvatar && localAvatar.is_custom && localAvatar.image_data) {
            const base64Data = localAvatar.image_data.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            return new NextResponse(buffer, {
                headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' }
            });
        }

        const formattedName = encodeURIComponent(decodedNick);
        const profileRes = await fetch(`https://atelier801.com/profile?pr=${formattedName}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            cache: 'no-store'
        });

        if (profileRes.ok) {
            const html = await profileRes.text();
            const match = html.match(/img src="(http:\/\/avatars\.atelier801\.com\/[^"]+_[0-9]+\.jpg)"/);
            if (match && match[1]) {
                const avatarRes = await fetch(match[1]);
                if (avatarRes.ok) {
                    const buffer = await avatarRes.arrayBuffer();
                    return new NextResponse(buffer, {
                        headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=60' }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Avatar GET Error:', error);
    }
    return new NextResponse('Not Found', { status: 404 });
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { sessionToken, avatar, action } = body;

        if (!sessionToken) return NextResponse.json({ success: false, message: 'Yetkisiz islem.' }, { status: 401 });

        const now = new Date().toISOString();
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('nick')
            .eq('token', sessionToken)
            .gt('expires_at', now)
            .single();

        if (sessionError || !session) return NextResponse.json({ success: false, message: 'Gecersiz oturum.' }, { status: 401 });

        if (action === 'remove') {
            await supabase.from('avatars').delete().ilike('nick', session.nick);
            return NextResponse.json({ success: true, message: 'Avatar kaldirildi.' });
        }

        if (!avatar) return NextResponse.json({ success: false, message: 'Eksik parametre.' }, { status: 400 });

        await saveAvatarToDB(session.nick, avatar);
        return NextResponse.json({ success: true, message: 'Avatar basariyla guncellendi.' });
    } catch (error) {
        console.error('Avatar POST Error:', error);
        return NextResponse.json({ success: false, message: 'Sunucu hatasi.' }, { status: 500 });
    }
}
