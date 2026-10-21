export const dynamic = 'force-static';

export async function GET() {
  return new Response('b10bb2fd-5e7c-427b-80c0-03876c8285b3', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
