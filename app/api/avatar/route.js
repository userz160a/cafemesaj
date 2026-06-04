import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return new NextResponse('Missing name', { status: 400 });
  }

  try {
    const formattedName = encodeURIComponent(name).replace('%23', '%23');
    const profileUrl = `https://atelier801.com/profile?pr=${formattedName}`;

    const profileRes = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!profileRes.ok) {
      return new NextResponse('Profile not found', { status: 404 });
    }

    const html = await profileRes.text();
    const regex = /img src="(http:\/\/avatars\.atelier801\.com\/[^"]+_[0-9]+\.jpg)"/;
    const match = html.match(regex);

    if (match && match[1]) {
      const avatarUrl = match[1];
      const avatarRes = await fetch(avatarUrl);
      
      if (avatarRes.ok) {
        const buffer = await avatarRes.arrayBuffer();
        return new NextResponse(buffer, {
          headers: { 
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
    }
  } catch (error) {
    console.error(error);
  }

  return new NextResponse('Not Found', { status: 404 });
}