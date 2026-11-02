// GET /api/config — tells the site whether one-click launch is switched on.
export function GET() {
  return new Response(JSON.stringify({ launch: Boolean(process.env.PINATA_JWT) }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, s-maxage=60' },
  });
}
