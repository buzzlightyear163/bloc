import { useEffect, useState } from 'react';
import { COUNTRIES, initials, leaderTicker, countryTicker, primaryLeader } from '../lib/world';
import { BLOC_BY_CODE } from '../lib/blocs';
import { ago, type Heat } from '../lib/heat';

export interface Pair { sym: string; name: string; ca: string; mcap: number; dex: string; url: string; img: string }

export async function fetchPairs(q: string): Promise<Pair[]> {
  try {
    const r = await fetch(`/api/pairs?q=${encodeURIComponent(q)}`);
    if (r.ok) return (await r.json()).pairs || [];
  } catch { /* fall back */ }
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`);
    const j = await r.json();
    const seen = new Set<string>();
    return (j.pairs || []).filter((p: { chainId: string }) => p.chainId === 'solana')
      .sort((a: { marketCap?: number }, b: { marketCap?: number }) => (b.marketCap || 0) - (a.marketCap || 0))
      .filter((p: { baseToken: { address: string } }) => { const k = p.baseToken.address; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 8)
      .map((p: { baseToken: { symbol: string; name: string; address: string }; marketCap?: number; dexId: string; url: string; info?: { imageUrl?: string } }) => ({ sym: p.baseToken.symbol, name: p.baseToken.name, ca: p.baseToken.address, mcap: p.marketCap || 0, dex: p.dexId, url: p.url, img: p.info?.imageUrl || '' }));
  } catch { return []; }
}

export const money = (n: number) => n >= 1e9 ? `$${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${Math.round(n)}`;

interface Props { index: number; heat: Heat; onClose: () => void; onPair: (key: string) => void }

export default function CountryPanel({ index, heat, onClose, onPair }: Props) {
  const c = COUNTRIES[index];
  const [pairs, setPairs] = useState<Pair[] | null>(null);
  const top = c.leaders[primaryLeader(c)];
  const q = top ? leaderTicker(top.n) : countryTicker(c);

  useEffect(() => {
    let live = true;
    setPairs(null);
    fetchPairs(q).then((p) => { if (live) setPairs(p); });
    return () => { live = false; };
  }, [q]);

  const n = heat.counts[index];
  const heads = heat.heads[index];

  return (
    <aside className="panel term" aria-label={`${c.name} details`}>
      <div className="bar"><i /><i /><i /><span>{c.id.toLowerCase()} — country</span><button className="x" onClick={onClose} aria-label="Close">✕</button></div>
      <div className="body panel-body">
        <div className="panel-code mut">{c.id} · {c.region.toLowerCase()}</div>
        <h3>{c.name.toLowerCase()}</h3>
        {c.blocs.length > 0 && (
          <div className="panel-blocs">
            {c.blocs.map((b) => <span key={b} className="tag2" style={{ '--c': BLOC_BY_CODE[b].color } as React.CSSProperties}><i />{BLOC_BY_CODE[b].label.toLowerCase()}</span>)}
          </div>
        )}

        <div className="panel-sec">
          <div className="panel-label"># leaders</div>
          {c.leaders.map((l, j) => (
            <div className="leader" key={l.n + j}>
              <div className="avatar">{initials(l.n)}</div>
              <div className="leader-txt"><b>{l.n}</b><span>{l.r.toLowerCase()}</span></div>
              <button className="btn xs" onClick={() => onPair(`l:${c.id}:${j}`)}>${leaderTicker(l.n)}</button>
            </div>
          ))}
          <button className="btn pri block" onClick={() => onPair(`c:${c.id}`)}>pair to {c.name.toLowerCase()} · ${countryTicker(c)}</button>
        </div>

        <div className="panel-sec">
          <div className="panel-label"># headlines · 24h <b className={n ? 'red' : ''}>{n}</b></div>
          {heads.length ? heads.slice(0, 3).map((h, k) => (
            <div className="head" key={k}><p>{h.t}</p><span className="mut">{h.s} · {ago(h.d)}</span></div>
          )) : <p className="mut small">quiet on the wire.</p>}
        </div>

        <div className="panel-sec">
          <div className="panel-label"># already on-chain · “{q.toLowerCase()}”</div>
          {pairs === null && <div className="skeleton" />}
          {pairs && pairs.length === 0 && <p className="mut small">nothing paired yet. first one gets the name.</p>}
          {pairs && pairs.slice(0, 4).map((p) => (
            <a className="pair-row" key={p.ca} href={p.url} target="_blank" rel="noreferrer">
              {p.img ? <img src={p.img} alt="" /> : <span className="pair-ph" />}
              <span className="pair-sym">${p.sym}</span>
              <span className="pair-name">{p.name}</span>
              <span className="pair-mc">{money(p.mcap)}</span>
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
}
