export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const nameParam = searchParams.get('name');

    if (!nameParam) return new Response('Missing name', { status: 400 });

    const userName = decodeURIComponent(nameParam).trim().toLowerCase();

    const statsRes = await fetch('https://cafetr.vercel.app/api/stats', {
      cache: 'no-store'
    });
    
    if (!statsRes.ok) return new Response('Stats fetch failed', { status: 502 });
    
    const users = await statsRes.json();
    
    const user = users.find(u => {
      if (!u || !u.nick) return false;
      return u.nick.trim().toLowerCase() === userName;
    });

    if (!user || !user.avatarUrl) return new Response('User or avatar not found', { status: 404 });

    const imgRes = await fetch(user.avatarUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/jpeg,image/png,image/jpg,image/*'
      }
    });

    if (!imgRes.ok) return new Response('Avatar download failed', { status: 502 });

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const imageBlob = await imgRes.blob();

    return new Response(imageBlob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    return new Response('Internal Error', { status: 500 });
  }
}