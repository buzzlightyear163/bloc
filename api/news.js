// GET /api/news — last-24h conflict & politics headlines, cached at the edge for 10 minutes.
// Sources: Google News RSS search (no key). Falls back to the GDELT DOC API.

const QUERIES = [
  'war OR military OR missile OR airstrike when:1d',
  'sanctions OR ceasefire OR troops OR nuclear when:1d',
  'president OR "prime minister" OR election when:1d',
  'NATO OR BRICS OR summit when:1d',
];

const decode = (s) => s
  .replace(/<!\[CDATA\[|\]\]>/g, '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

function parseRss(xml) {
  const out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1];
    const get = (tag) => { const x = it.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)); return x ? decode(x[1]) : ''; };
    const t = get('title');
    if (!t) continue;
    out.push({ t, s: get('source'), d: new Date(get('pubDate') || Date.now()).toISOString(), u: get('link') });
  }
  return out;
}

async function fromGoogle() {
  const lists = await Promise.all(QUERIES.map(async (q) => {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; BLOC/1.0)' } });
    if (!r.ok) throw new Error('google ' + r.status);
    return parseRss(await r.text());
  }));
  const seen = new Set();
  const items = [];
  for (const list of lists) for (const it of list) { if (seen.has(it.t)) continue; seen.add(it.t); items.push(it); }
  return items;
}

async function fromGdelt() {
  const q = encodeURIComponent('(war OR missile OR airstrike OR troops OR ceasefire OR nuclear OR sanctions OR election) sourcelang:eng');
  const r = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${q}&mode=artlist&maxrecords=250&timespan=24h&sort=datedesc&format=json`);
  if (!r.ok) throw new Error('gdelt ' + r.status);
  const j = await r.json();
  return (j.articles || []).map((a) => {
    const d = a.seendate ? `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}T${a.seendate.slice(9, 11)}:${a.seendate.slice(11, 13)}:00Z` : new Date().toISOString();
    return { t: a.title, s: a.domain, d, u: a.url };
  });
}

export async function GET() {
  let items = [];
  let source = 'google-news';
  try { items = await fromGoogle(); } catch { /* fall through */ }
  if (items.length < 40) {
    try { items = await fromGdelt(); source = 'gdelt'; } catch { /* ignore */ }
  }
  const body = JSON.stringify({ at: new Date().toISOString(), source, items: items.slice(0, 500) });
  return new Response(body, {
    status: items.length ? 200 : 502,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': items.length ? 'public, s-maxage=600, stale-while-revalidate=1800' : 'no-store',
    },
  });
}
