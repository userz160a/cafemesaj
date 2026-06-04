export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get('src');

  if (!src) return new Response('Missing src', { status: 400 });

  try {
    const targetUrl = decodeURIComponent(src);

    const res = await fetch(targetUrl, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      } 
    });

    if (!res.ok) return new Response('Failed to fetch image', { status: 502 });

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer); 
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Content-Length': buffer.length.toString()
      },
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}