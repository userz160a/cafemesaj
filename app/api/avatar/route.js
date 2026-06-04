export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const nameParam = searchParams.get('name');

    if (!nameParam) {
      return new Response('Missing name parameter', { status: 400 });
    }

    const userName = decodeURIComponent(nameParam).trim().toLowerCase();

    const statsRes = await fetch('https://cafetr.vercel.app/api/stats', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      cache: 'no-store'
    });
    
    if (!statsRes.ok) {
      return new Response(`Stats fetch failed with status: ${statsRes.status}`, { status: 502 });
    }
    
    const users = await statsRes.json();
    
    if (!Array.isArray(users)) {
      return new Response('Stats data is not an array', { status: 500 });
    }

    const user = users.find(u => u && u.nick && u.nick.trim().toLowerCase() === userName);

    if (!user || !user.avatarUrl) {
      return new Response('User or avatarUrl not found in stats', { status: 404 });
    }

    let correctUrl = user.avatarUrl.replace('https://', 'http://');
    
    if (!correctUrl.includes('_50.') && correctUrl.endsWith('.jpg')) {
      correctUrl = correctUrl.replace('.jpg', '_50.jpg');
    } else if (!correctUrl.includes('_50.') && correctUrl.endsWith('.png')) {
      correctUrl = correctUrl.replace('.png', '_50.png');
    } else if (!correctUrl.includes('_50.') && correctUrl.endsWith('.jpeg')) {
      correctUrl = correctUrl.replace('.jpeg', '_50.jpeg');
    }

    const imgRes = await fetch(correctUrl, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/jpeg,image/png,image/jpg,image/*'
      }
    });

    if (!imgRes.ok) {
      return new Response(`Proxy download failed with status: ${imgRes.status}`, { status: 502 });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const imageBlob = await imgRes.blob();

    return new Response(imageBlob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    return new Response(`Internal Error: ${e.message}`, { status: 500 });
  }
}