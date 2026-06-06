import { NextResponse } from 'next/server';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    if (!name) return new NextResponse('Missing name', { status: 400 });

    try {
        const decodedNick = decodeURIComponent(name);
        if (decodedNick.startsWith('*')) {
            return new NextResponse('Not Found', { status: 404 });
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
                        headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=300' }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Avatar GET Error:', error);
    }
    return new NextResponse('Not Found', { status: 404 });
}
