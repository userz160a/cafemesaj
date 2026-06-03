export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get('src');

  if (!src) return new Response('Missing src', { status: 400 });

  try {
    const res = await fetch(src, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return new Response('Failed', { status: 502 });

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || 'image/jpeg';

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (e) {
    return new Response('Error', { status: 500 });
  }
}