import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hcxwjnkywsfwviexjopt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZJFVMWFEHL32yXZXzqT4ZQ_3fNbZTO-';
const supabase = createClient(supabaseUrl, supabaseKey);

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
        const { sessionToken, content } = await request.json();
        if (!sessionToken || !content?.trim()) return NextResponse.json({ success: false, message: 'Eksik parametre.' }, { status: 400 });

        const now = new Date().toISOString();
        const { data: session, error: sessionError } = await supabase
            .from('sessions')
            .select('nick')
            .eq('token', sessionToken)
            .gt('expires_at', now)
            .single();

        if (sessionError || !session) return NextResponse.json({ success: false, message: 'Gecersiz oturum.' }, { status: 401 });

        const { error } = await supabase.from('messages').insert([{
            nick: session.nick,
            content: content.trim().substring(0, 500)
        }]);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
