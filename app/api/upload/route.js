import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hcxwjnkywsfwviexjopt.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZJFVMWFEHL32yXZXzqT4ZQ_3fNbZTO-';
const supabase = createClient(supabaseUrl, supabaseKey);

function parseLastOnline(str) {
  if (!str || str.trim() === '-' || str.trim() === '') return null;
  try {
    const match = str.trim().match(/^(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
    if (!match) return null;
    const [, day, month, hour, minute] = match;
    let h = parseInt(hour) - 3;
    let dayOffset = 0;
    if (h < 0) { h += 24; dayOffset = -1; }
    const date = new Date(Date.UTC(2026, parseInt(month) - 1, parseInt(day) + dayOffset, h, parseInt(minute)));
    return Math.floor(date.getTime() / 1000);
  } catch { return null; }
}

function parseData(text) {
  const users = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const nickPattern = /^[A-Za-zÇĞİÖŞÜçğıöşü][^#\n]*#\d{4}$/;
  const datePattern = /^\d{2}\/\d{2}\s+\d{2}:\d{2}$/;

  for (let i = 0; i < lines.length; i++) {
    if (!nickPattern.test(lines[i])) continue;
    const nick = lines[i];
    const win = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 6));
    const nums = win.filter(l => /^\d+$/.test(l)).map(Number);
    const dateStr = win.find(l => datePattern.test(l)) || null;
    let messages = 0, topics = 0;
    if (nums.length >= 2) {
      messages = Math.max(nums[0], nums[1]);
      topics = Math.min(nums[0], nums[1]);
    } else if (nums.length === 1) {
      messages = nums[0];
    }
    users.push({ nick, messages, topics, lastOnline: dateStr });
  }
  return users;
}

export async function POST(request) {
  try {
    const { text } = await request.json();
    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Metin bos' }), { status: 400 });
    }

    const scraped = parseData(text);
    if (scraped.length === 0) {
      return new Response(JSON.stringify({ error: 'Hic kullanici parse edilemedi' }), { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('stats')
      .select('nick, messages, topics, lastonlineostime');
    if (fetchError) throw new Error(fetchError.message);

    const existingMap = {};
    (existing || []).forEach(row => {
      if (row.nick) existingMap[row.nick.toLowerCase()] = row;
    });

    const upserts = [];
    for (const u of scraped) {
      if (!u.nick) continue;
      const current = existingMap[u.nick.toLowerCase()];
      const newLastOnline = parseLastOnline(u.lastOnline);

      if (!current) {
        upserts.push({ nick: u.nick, messages: u.messages, topics: u.topics, lastonlineostime: newLastOnline });
      } else {
        const msgDiff = u.messages - (current.messages || 0);
        const topicDiff = u.topics - (current.topics || 0);
        const newMsg = msgDiff > 0 ? (current.messages || 0) + msgDiff : (current.messages || 0);
        const newTopic = topicDiff > 0 ? (current.topics || 0) + topicDiff : (current.topics || 0);
        const changed = newMsg !== (current.messages || 0) || newTopic !== (current.topics || 0) || (newLastOnline && newLastOnline !== current.lastonlineostime);
        if (changed) {
          const payload = { nick: current.nick };
          if (newMsg !== (current.messages || 0)) payload.messages = newMsg;
          if (newTopic !== (current.topics || 0)) payload.topics = newTopic;
          if (newLastOnline) payload.lastonlineostime = newLastOnline;
          upserts.push(payload);
        }
      }
    }

    for (let i = 0; i < upserts.length; i += 50) {
      const { error: upsertErr } = await supabase
        .from('stats')
        .upsert(upserts.slice(i, i + 50), { onConflict: 'nick' });
      if (upsertErr) throw new Error(upsertErr.message);
    }

    return new Response(JSON.stringify({ ok: true, parsed: scraped.length, updated: upserts.length }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
