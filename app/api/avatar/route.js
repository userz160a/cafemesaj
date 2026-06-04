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

    return Response.redirect(user.avatarUrl, 302);
  } catch (e) {
    return new Response(`Internal Error: ${e.message}`, { status: 500 });
  }
}