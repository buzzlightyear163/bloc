// GET /api/pairs?q=putin — Solana coins already paired to a name (DexScreener search, no key).
export async function GET(request) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 40);
  if (!q) return json({ pairs: [] });
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error('dex ' + r.status);
    const j = await r.json();
    const seen = new Set();
    const pairs = (j.pairs || [])
      .filter((p) => p.chainId === 'solana')
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .filter((p) => { const k = p.baseToken?.address; if (!k || seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 8)
      .map((p) => ({
        sym: p.baseToken.symbol, name: p.baseToken.name, ca: p.baseToken.address,
        mcap: p.marketCap || p.fdv || 0, dex: p.dexId, url: p.url, img: p.info?.imageUrl || '', created: p.pairCreatedAt || 0,
      }));
    return json({ pairs }, 'public, s-maxage=120, stale-while-revalidate=600');
  } catch (e) {
    return json({ pairs: [], error: String(e) }, 'no-store', 502);
  }
}

function json(obj, cache = 'no-store', status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', 'cache-control': cache } });
}
