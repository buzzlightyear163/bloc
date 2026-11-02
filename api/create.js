// POST /api/create — asks PumpPortal (no key, local-transaction API) to build the pump.fun create
// transaction. The site signs it with the new mint key and the creator's wallet; nothing is sent from here.

const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const bad = (msg, status = 400) => new Response(JSON.stringify({ error: msg }), { status, headers: { 'content-type': 'application/json' } });

export async function POST(request) {
  let b;
  try { b = await request.json(); } catch { return bad('Expected JSON.'); }
  const { publicKey, mint, name, symbol, uri } = b || {};
  const amount = Number(b?.amount);
  if (!B58.test(publicKey || '') || !B58.test(mint || '')) return bad('Bad wallet or mint address.');
  if (!name || String(name).length > 32) return bad('Bad name.');
  if (!/^[A-Z0-9]{2,10}$/.test(String(symbol || ''))) return bad('Bad ticker.');
  if (!/^https:\/\//.test(String(uri || ''))) return bad('Bad metadata URI.');
  if (!(amount >= 0.01 && amount <= 5)) return bad('Dev buy must be between 0.01 and 5 SOL.');

  const r = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      publicKey,
      action: 'create',
      tokenMetadata: { name, symbol, uri },
      mint,
      denominatedInSol: 'true',
      amount,
      slippage: 10,
      priorityFee: 0.0005,
      pool: 'pump',
    }),
  });
  if (r.status !== 200) return bad(`PumpPortal: ${r.status} ${(await r.text()).slice(0, 200)}`, 502);
  const buf = Buffer.from(await r.arrayBuffer());
  return new Response(JSON.stringify({ tx: buf.toString('base64') }), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
