export async function GET(request, { params }) {
  try {
    const rawName = await params.name;
    const userName = decodeURIComponent(rawName);

    const statsRes = await fetch('https://cafetr.vercel.app/api/stats', {
      cache: 'no-store'
    });
    
    if (!statsRes.ok) return new Response('Stats fetch failed', { status: 502 });
    
    const users = await statsRes.json();
    const user = users.find(u => u.nick.toLowerCase() === userName.toLowerCase());

    if (!user || !user.avatarUrl) return new Response('User or avatar not found', { status: 404 });

    const imgRes = await fetch(user.avatarUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
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