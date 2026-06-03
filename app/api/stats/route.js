import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'bot.txt');
const cache = new Map();

function updateExtDataBackground(nick) {
    const cleanNickForAtelier = encodeURIComponent(nick.split('#')[0]);
    const cleanNickForCypher = encodeURIComponent(nick.toLowerCase());

    fetch(`https://atelier801.com/profile?pr=${cleanNickForAtelier}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    .then(res => res.text())
    .then(html => {
        const matches = [...html.matchAll(/http:\/\/avatars\.atelier801\.com\/[^"'\s>]+/g)];
        let avatarUrl = '';
        if (matches.length >= 2) avatarUrl = matches[1][0];
        else if (matches.length > 0) avatarUrl = matches[0][0];

        if (avatarUrl) {
            const current = cache.get(nick) || { avatarUrl: '', danceGifUrl: '' };
            cache.set(nick, { ...current, avatarUrl });
        }
    })
    .catch(() => {});

    fetch(`https://projects.cypher801.app/profile/?player=${cleanNickForCypher}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    })
    .then(res => res.text())
    .then(html => {
        const match = html.match(/id="playerOutfit"\s+title="Copy outfit:\s*([^"]+)"/i) 
                   || html.match(/data-value="([^"]+)"\s+id="playerOutfit"/i);
        if (match && match[1]) {
            const lookStr = encodeURIComponent(match[1].trim());
            const danceGifUrl = `https://projects.cypher801.app/controller/render/AnimatedWebp.php/?playerLook=${lookStr}&anim=Danse`;
            
            const current = cache.get(nick) || { avatarUrl: '', danceGifUrl: '' };
            cache.set(nick, { ...current, danceGifUrl });
        }
    })
    .catch(() => {});
}

export function GET() {
    try {
        if (!fs.existsSync(filePath)) {
            return NextResponse.json([]);
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n');
        const list = [];

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const nickMatch = line.match(/^\["([^"]+)"\]/);
            const msgMatch = line.match(/messages\s*=\s*(\d+)/);
            const topicMatch = line.match(/topics\s*=\s*(\d+)/);
            const timeMatch = line.match(/lastonlineostime\s*=\s*(\d+)/);

            if (nickMatch) {
                const nick = nickMatch[1];
                const messages = msgMatch ? parseInt(msgMatch[1], 10) : 0;
                const topics = topicMatch ? parseInt(topicMatch[1], 10) : 0;
                const ostime = timeMatch ? parseInt(timeMatch[1], 10) : 0;

                let lastSeen = 'Bilinmiyor';
                if (ostime > 0) {
                    const d = new Date(ostime * 1000);
                    lastSeen = d.toLocaleString('tr-TR');
                }

                updateExtDataBackground(nick);

                const ext = cache.get(nick) || { avatarUrl: '', danceGifUrl: '' };

                list.push({
                    nick,
                    messages,
                    topics,
                    total: messages + topics,
                    lastSeen,
                    avatarUrl: ext.avatarUrl,
                    danceGifUrl: ext.danceGifUrl
                });
            }
        }

        list.sort((a, b) => b.total - a.total);
        return NextResponse.json(list);
    } catch (err) {
        return NextResponse.json([]);
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { nick, addMessage, addTopic, osTime } = body;

        if (!nick) {
            return NextResponse.json({ error: 'Missing nick' }, { status: 400 });
        }

        let fileContent = '';
        if (fs.existsSync(filePath)) {
            fileContent = fs.readFileSync(filePath, 'utf-8');
        }

        const escapedNick = nick.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const pattern = new RegExp(`(?m)^\\["${escapedNick}"\\]\\s*=\\s*\\{messages\\s*=\\s*(\\d+),\\s*topics\\s*=\\s*(\\d+),\\s*lastonlineostime\\s*=\\s*(\\d+)\\}`);

        let currentMessages = addMessage ? 1 : 0;
        let currentTopics = addTopic ? 1 : 0;
        let currentTime = osTime || Math.floor(Date.now() / 1000);

        const match = fileContent.match(pattern);
        if (match) {
            currentMessages = parseInt(match[1], 10) + (addMessage ? 1 : 0);
            currentTopics = parseInt(match[2], 10) + (addTopic ? 1 : 0);
            const newEntry = `["${nick}"] = {messages = ${currentMessages}, topics = ${currentTopics}, lastonlineostime = ${currentTime}}`;
            fileContent = fileContent.replace(pattern, newEntry);
        } else {
            const newEntry = `["${nick}"] = {messages = ${currentMessages}, topics = ${currentTopics}, lastonlineostime = ${currentTime}}`;
            if (fileContent && !fileContent.endsWith('\n')) {
                fileContent += '\n';
            }
            fileContent += newEntry + '\n';
        }

        fs.writeFileSync(filePath, fileContent, 'utf-8');
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}