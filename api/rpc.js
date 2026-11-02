// POST /api/rpc — thin Solana JSON-RPC relay (a few read/send methods only).
// Uses env RPC_URL if set (Helius, QuickNode…), otherwise the public mainnet endpoint.

const ALLOWED = new Set(['sendTransaction', 'getSignatureStatuses', 'getBalance', 'getLatestBlockhash']);

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return out({ error: { message: 'bad json' } }, 400); }
  if (!body || !ALLOWED.has(body.method)) return out({ error: { message: 'method not allowed' } }, 400);
  const url = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: body.method, params: body.params || [] }),
  });
  return new Response(await r.text(), { status: r.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

const out = (o, s) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json' } });
