import { NextResponse } from 'next/server';

async function getAvatarFromDB(nick) {
  return null; 
}

async function saveAvatarToDB(nick, data) {
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name');

  if (!name) {
    return new NextResponse('Missing name', { status: 400 });
  }

  try {
    const decodedNick = decodeURIComponent(name);
    
    const localAvatar = await getAvatarFromDB(decodedNick);

    const formattedName = encodeURIComponent(decodedNick);
    const profileUrl = `https://atelier801.com/profile?pr=${formattedName}`;

    const profileRes = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      cache: 'no-store'
    });

    let remoteAvatarUrl = null;
    let remoteBuffer = null;

    if (profileRes.ok) {
      const html = await profileRes.text();
      const regex = /img src="(http:\/\/avatars\.atelier801\.com\/[^"]+_[0-9]+\.jpg)"/;
      const match = html.match(regex);
      if (match && match[1]) {
        remoteAvatarUrl = match[1];
      }
    }

    if (localAvatar && localAvatar.isCustom && localAvatar.imageBuffer) {
      return new NextResponse(localAvatar.imageBuffer, {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' }
      });
    }

    if (localAvatar && remoteAvatarUrl && localAvatar.avatarUrl === remoteAvatarUrl && localAvatar.imageBuffer) {
      return new NextResponse(localAvatar.imageBuffer, {
        headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=60' }
      });
    }

    if (remoteAvatarUrl) {
      const avatarRes = await fetch(remoteAvatarUrl);
      if (avatarRes.ok) {
        remoteBuffer = await avatarRes.arrayBuffer();
        const bufferToSave = Buffer.from(remoteBuffer);

        await saveAvatarToDB(decodedNick, {
          avatarUrl: remoteAvatarUrl,
          imageBuffer: bufferToSave,
          isCustom: false
        });

        return new NextResponse(bufferToSave, {
          headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=60' }
        });
      }
    }

    if (localAvatar && localAvatar.imageBuffer) {
      return new NextResponse(localAvatar.imageBuffer, {
        headers: { 
          'Content-Type': localAvatar.isCustom ? 'image/png' : 'image/jpeg', 
          'Cache-Control': 'public, max-age=60' 
        }
      });
    }

  } catch (error) {
    console.error('Avatar GET Error:', error);
  }

  return new NextResponse('Not Found', { status: 404 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { sessionToken, avatar } = body;

    if (!sessionToken || !avatar) {
      return NextResponse.json({ success: false, message: 'Eksik parametre.' }, { status: 400 });
    }

    const nick = "Örnek#0000";

    const base64Data = avatar.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, 'base64');

    await saveAvatarToDB(nick, {
      avatarUrl: 'custom',
      imageBuffer: imageBuffer,
      isCustom: true
    });

    return NextResponse.json({ success: true, message: 'Avatar başarıyla yerel sunucuya kaydedildi.' });

  } catch (error) {
    console.error('Avatar POST Error:', error);
    return NextResponse.json({ success: false, message: 'Sunucu hatası.' }, { status: 500 });
  }
}
