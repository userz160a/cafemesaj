import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hcxwjnkywsfwviexjopt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZJFVMWFEHL32yXZXzqT4ZQ_3fNbZTO-';
const supabase = createClient(supabaseUrl, supabaseKey);

function getClientIp(req) {
    let ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
    if (ip && ip.includes(',')) ip = ip.split(',')[0].trim();
    return ip || '127.0.0.1';
}

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(100);
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { sessionToken, guestNick, content } = await request.json();
        if (!content?.trim()) return NextResponse.json({ success: false, message: 'Eksik parametre.' }, { status: 400 });

        let nick = null;
        let isGuest = false;
        const ip = getClientIp(request);

        if (sessionToken) {
            const now = new Date().toISOString();
            const { data: session, error: sessionError } = await supabase
                .from('sessions')
                .select('nick')
                .eq('token', sessionToken)
                .gt('expires_at', now)
                .single();
            if (sessionError || !session) return NextResponse.json({ success: false, message: 'Gecersiz oturum.' }, { status: 401 });
            nick = session.nick;
        } else if (guestNick) {
            const cleanNick = guestNick.trim();
            if (!/^[A-Z][A-Za-z0-9]{2,9}$/.test(cleanNick)) return NextResponse.json({ success: false, message: 'Gecersiz ziyaretci adi.' }, { status: 400 });

            const { data: existingGuest } = await supabase
                .from('guest_ips')
                .select('*')
                .eq('nick', cleanNick);

            if (existingGuest && existingGuest.length > 0) {
                const match = existingGuest.find(g => g.ip_address === ip);
                if (!match) return NextResponse.json({ success: false, message: 'Bu isim baska biri tarafindan kullaniliyor.' }, { status: 403 });
            } else {
                await supabase.from('guest_ips').insert([{ nick: cleanNick, ip_address: ip }]);
            }

            nick = '*' + cleanNick;
            isGuest = true;
        } else {
            return NextResponse.json({ success: false, message: 'Yetkisiz.' }, { status: 401 });
        }

        const { error } = await supabase.from('messages').insert([{
            nick,
            content: content.trim().substring(0, 500),
            is_guest: isGuest
        }]);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
