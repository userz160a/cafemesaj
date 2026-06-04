import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request) {
  try {
    const { nick, addMessage, addTopic, osTime } = await request.json();

    if (!nick) {
      return NextResponse.json({ error: 'Missing nick' }, { status: 400 });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('nick', nick)
      .single();

    const oldMessages = existingUser ? (existingUser.messages || 0) : 0;
    const oldTopics = existingUser ? (existingUser.topics || 0) : 0;

    const newMessages = oldMessages + (addMessage === true || addMessage === 'true' ? 1 : 0);
    const newTopics = oldTopics + (addTopic === true || addTopic === 'true' ? 1 : 0);

    const { error } = await supabase
      .from('users')
      .upsert({
        nick: nick,
        messages: newMessages,
        topics: newTopics,
        lastonlineostime: osTime
      }, { onConflict: 'nick' });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('messages', { ascending: false });

    if (error) throw error;

    const formattedData = data.map((user) => {
      const total = (user.messages || 0) + (user.topics || 0);
      let lastSeen = 'Bilinmiyor';
      if (user.lastonlineostime) {
        const date = new Date(user.lastonlineostime * 1000);
        lastSeen = date.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
      }

      return {
        nick: user.nick,
        messages: user.messages,
        topics: user.topics,
        total: total,
        lastSeen: lastSeen
      };
    });

    return NextResponse.json(formattedData);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
