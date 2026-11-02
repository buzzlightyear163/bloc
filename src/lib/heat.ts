import snapshot from '../data/heat-snapshot.json';
import { COUNTRIES } from './world';

export interface Headline { t: string; s: string; d: string; u?: string }
export interface Heat {
  live: boolean;
  at: string;          // ISO time of the scan
  total: number;       // headlines scanned
  counts: number[];    // per country index
  heads: Headline[][]; // per country index, newest first (max 4)
  max: number;
  ticker: Headline[];  // for the top ticker
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MATCHERS = COUNTRIES.map((c) =>
  c.alias.length ? new RegExp(`(^|[^\\p{L}])(${c.alias.map(esc).join('|')})(?![\\p{L}])`, 'u') : null,
);

export function computeHeat(items: Headline[], live: boolean, at: string): Heat {
  const counts = COUNTRIES.map(() => 0);
  const heads: Headline[][] = COUNTRIES.map(() => []);
  const sorted = [...items].sort((a, b) => +new Date(b.d) - +new Date(a.d));
  for (const it of sorted) {
    const h = it.t.replace(/\s+-\s+[^-]+$/, '');
    MATCHERS.forEach((re, i) => {
      if (re && re.test(h)) { counts[i]++; if (heads[i].length < 4) heads[i].push({ ...it, t: h }); }
    });
  }
  const max = Math.max(1, ...counts);
  const ticker = sorted.filter((x) => /war|strike|missile|nuclear|troops|ceasefire|sanction|election|summit|attack|drone|president|minister/i.test(x.t)).slice(0, 24)
    .map((x) => ({ ...x, t: x.t.replace(/\s+-\s+[^-]+$/, '') }));
  return { live, at, total: items.length, counts, heads, max, ticker };
}

export function snapshotHeat(): Heat {
  const counts = COUNTRIES.map((c) => (snapshot.counts as Record<string, number>)[c.id] || 0);
  const H = snapshot.h as unknown as Record<string, [string, string, string][]>;
  const heads = COUNTRIES.map((c) => (H[c.id] || []).map(([t, s, d]) => ({ t, s, d: d + ':00Z' })));
  const seen = new Set<string>();
  const ticker: Headline[] = [];
  for (const list of Object.values(H)) for (const [t, s, d] of list) if (!seen.has(t)) { seen.add(t); ticker.push({ t, s, d: d + ':00Z' }); }
  ticker.sort((a, b) => +new Date(b.d) - +new Date(a.d));
  return { live: false, at: snapshot.at, total: snapshot.total, counts, heads, max: Math.max(1, ...counts), ticker: ticker.slice(0, 24) };
}

export async function loadHeat(): Promise<Heat> {
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 9000);
    const r = await fetch('/api/news', { signal: ctl.signal });
    clearTimeout(to);
    if (!r.ok) throw new Error('news ' + r.status);
    const j = (await r.json()) as { at: string; items: Headline[] };
    if (!j.items || j.items.length < 40) throw new Error('thin feed');
    return computeHeat(j.items, true, j.at);
  } catch {
    return snapshotHeat();
  }
}

export function ago(iso: string) {
  const m = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
}
