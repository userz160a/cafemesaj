import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nick, addMessage, addTopic, osTime, messageContent } = body

  if (!nick) {
    return NextResponse.json({ error: 'nick required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('stats')         
    .select('*')
    .eq('nick', nick)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('stats')
      .update({
        messages: existing.messages + (addMessage ? 1 : 0),
        topics: existing.topics + (addTopic ? 1 : 0),
        lastonlineostime: osTime,
        last_message: messageContent,
      })
      .eq('nick', nick)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('stats')
      .insert({
        nick,
        messages: addMessage ? 1 : 0,
        topics: addTopic ? 1 : 0,
        lastonlineostime: osTime,
        last_message: messageContent,
      })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
