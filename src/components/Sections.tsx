import { useEffect, useRef } from 'react';
import { COUNTRIES, COUNTRY_INDEX, BLOC_MEMBERS, LEADER_COUNT, CAPTURED, leaderTicker, countryTicker, primaryLeader } from '../lib/world';
import { BLOC_META, type BlocCode } from '../lib/blocs';
import { ago, type Heat } from '../lib/heat';
import { drawMiniMap } from './DotMap';
import { CONFIG } from '../config';
import { Mark } from './Chrome';

export function SectionHead({ k, title, sub }: { k: string; title: string; sub?: string }) {
  return (
    <div className="sec-head">
      <div className="kicker mono">{k}</div>
      <h2 className="display">{title}</h2>
      {sub && <p className="sec-sub">{sub}</p>}
    </div>
  );
}

export function Flashpoints({ heat, onOpen, onPair }: { heat: Heat; onOpen: (i: number) => void; onPair: (key: string) => void }) {
  const ranked = heat.counts.map((v, i) => [v, i]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 8);
  const max = ranked[0]?.[0] || 1;
  return (
    <section className="sec" id="flashpoints">
      <div className="wrap">
        <SectionHead k="02 — The wire" title="Flashpoints." sub="Where the world’s headlines point right now. We scan the last 24 hours of war and politics coverage and count which countries it names." />
        <div className="fp-meta mono">
          <span className={`dot-live ${heat.live ? 'on' : ''}`} />{heat.live ? 'Live' : 'Snapshot'} · {heat.total} headlines · scanned {ago(heat.at)} ago
        </div>
        <ol className="fp-list">
          {ranked.map(([v, i], n) => {
            const c = COUNTRIES[i];
            const lj = primaryLeader(c);
            const top = c.leaders[lj];
            return (
              <li className="fp" key={c.id}>
                <span className="fp-rank mono">{String(n + 1).padStart(2, '0')}</span>
                <button className="fp-name" onClick={() => onOpen(i)}><span className="mono">{c.id}</span>{c.name}</button>
                <div className="fp-bar"><i style={{ width: `${(v / max) * 100}%` }} /><b className="mono">{v}</b></div>
                <p className="fp-head">{heat.heads[i][0]?.t || '—'}</p>
                <div className="fp-act">
                  <button className="btn btn-ghost btn-xs" onClick={() => onPair(`c:${c.id}`)}>${countryTicker(c)}</button>
                  {top && <button className="btn btn-ghost btn-xs" onClick={() => onPair(`l:${c.id}:${lj}`)}>${leaderTicker(top.n)}</button>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

function MiniMap({ code, color }: { code: BlocCode; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth;
    const h = Math.round(w * 0.39);
    c.width = w * dpr; c.height = h * dpr; c.style.height = h + 'px';
    const ctx = c.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const set = new Set(BLOC_MEMBERS[code].map((id) => COUNTRY_INDEX.get(id)));
    drawMiniMap(ctx, 0, 0, w, (i) => (set.has(i) ? color : null), '#1c2026', 0.4);
  }, [code, color]);
  return <canvas ref={ref} className="mini" />;
}

export function Blocs({ active, onShow, onPair, heat }: { active: BlocCode | null; onShow: (b: BlocCode) => void; onPair: (key: string) => void; heat: Heat }) {
  return (
    <section className="sec" id="blocs">
      <div className="wrap">
        <SectionHead k="03 — Sides" title="The blocs." sub="Seventeen alliances, cartels, clubs and pacts. Every one of them can be a coin. Tap a card to light it up on the map." />
        <div className="bloc-grid">
          {BLOC_META.map((b) => {
            const members = BLOC_MEMBERS[b.code];
            const h = members.reduce((s, id) => s + (heat.counts[COUNTRY_INDEX.get(id) ?? -1] || 0), 0);
            return (
              <article key={b.code} className={`bloc-card ${active === b.code ? 'on' : ''}`} style={{ '--c': b.color } as React.CSSProperties}>
                <button className="bloc-hit" onClick={() => onShow(b.code)} aria-label={`Show ${b.label} on the map`} />
                <div className="bloc-top">
                  <span className="bloc-code display">{b.label}</span>
                  <span className="bloc-n mono">{members.length}</span>
                </div>
                <MiniMap code={b.code} color={b.color} />
                <div className="bloc-name">{b.name}</div>
                <p className="bloc-line">{b.line}</p>
                <div className="bloc-foot">
                  <span className="mono muted">{h} headlines · 24h</span>
                  <button className="btn btn-ghost btn-xs" onClick={() => onPair(`b:${b.code}`)}>${b.ticker}</button>
                </div>
              </article>
            );
          })}
          <a className="bloc-card bloc-cta" href="#pair">
            <span className="kicker mono">Not in a bloc?</span>
            <span className="display">Go solo.</span>
            <p className="bloc-line">Every country and every leader can be paired on its own. {COUNTRIES.length} countries, {LEADER_COUNT} leaders.</p>
            <span className="btn btn-primary btn-sm">Search all</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function How() {
  const steps = [
    ['Pick a side', 'Click a country on the map, open a bloc, or search any of the world’s leaders. Every head of state and government is in here.'],
    ['Name it', 'BLOC suggests a ticker and draws the coin image for you: the map, your subject lit up, the ticker big. Or upload your own.'],
    ['Launch', 'Approve one transaction in your wallet. The coin goes live on pump.fun with your dev buy, and the contract address appears here.'],
  ];
  return (
    <section className="sec" id="how">
      <div className="wrap">
        <SectionHead k="05 — Process" title="Three moves." />
        <div className="how">
          {steps.map(([t, d], i) => (
            <div className="how-step" key={t}>
              <span className="how-n display">0{i + 1}</span>
              <h4>{t}</h4>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Docs() {
  return (
    <section className="sec" id="docs">
      <div className="wrap docs">
        <SectionHead k="06 — Docs" title="How BLOC works." />
        <div className="docs-grid">
          <div className="doc">
            <h4>Overview</h4>
            <p>BLOC is a Solana launchpad for pairing memecoins to world politics. You can pair a coin to any current head of state or government ({LEADER_COUNT} leaders across {COUNTRIES.length} countries), to a country, or to one of 17 blocs. Every coin launches on pump.fun. BLOC builds the coin’s details and the launch transaction; you approve it in your own wallet.</p>
          </div>
          <div className="doc">
            <h4>Pairing</h4>
            <table><tbody>
              <tr><th>Subject</th><th>Where</th><th>Ticker</th></tr>
              <tr><td>Leader</td><td>Click a country, or search</td><td>Last name, e.g. $PUTIN</td></tr>
              <tr><td>Country</td><td>Click it on the map</td><td>Name, e.g. $IRAN</td></tr>
              <tr><td>Bloc</td><td>Bloc chips or cards</td><td>$NATO, $BRICS, $CRINK…</td></tr>
            </tbody></table>
          </div>
          <div className="doc">
            <h4>Launching</h4>
            <ol>
              <li>Pick a subject, set the name, ticker, an optional description and a dev buy (0.01 to 5 SOL).</li>
              <li>BLOC pins the image and metadata to IPFS.</li>
              <li>PumpPortal’s local-transaction API builds the pump.fun create transaction, including your dev buy.</li>
              <li>You approve it once in Phantom, Solflare or Backpack. It goes to Solana from your wallet’s signature only.</li>
              <li>When it lands, BLOC shows the contract address with links to pump.fun and the transaction.</li>
            </ol>
            <p className="muted small">You need SOL for the dev buy plus about 0.03 SOL in fees.</p>
          </div>
          <div className="doc">
            <h4>What goes in a coin</h4>
            <table><tbody>
              <tr><td>name</td><td>Your name, 32 characters max</td></tr>
              <tr><td>symbol</td><td>Your ticker, 2–10 letters or numbers</td></tr>
              <tr><td>image</td><td>The generated BLOC card, or your upload</td></tr>
              <tr><td>description</td><td>Yours, followed by the pairing line</td></tr>
              <tr><td>website</td><td>The BLOC site it launched from</td></tr>
            </tbody></table>
          </div>
          <div className="doc">
            <h4>Rules</h4>
            <ul>
              <li>Every description ends with a line saying the coin is not affiliated with or endorsed by the person, country or organisation it’s paired to. It can’t be removed.</li>
              <li>Names and tickers can’t contain “official”.</li>
              <li>BLOC draws no portraits. Coin images use the map, never a face.</li>
              <li>More than one coin can pair to the same subject.</li>
            </ul>
          </div>
          <div className="doc">
            <h4>The map</h4>
            <ul>
              <li><b>Alignment</b> colours NATO members blue and BRICS members red. Everyone else stays dark.</li>
              <li><b>Flashpoints</b> colours each country by how often the last 24 hours of headlines name it. The rings mark the hottest seven.</li>
              <li><b>Bloc chips</b> light up one bloc’s members.</li>
            </ul>
          </div>
          <div className="doc">
            <h4>Data sources</h4>
            <table><tbody>
              <tr><td>Leaders</td><td>Wikipedia, List of current heads of state and government, captured {CAPTURED}. Governors-general and personal representatives are left out.</td></tr>
              <tr><td>Blocs</td><td>Membership as of November 2026. BRICS counts Saudi Arabia as the 2026 chair lists it; OPEC without the UAE, which left on 1 May 2026; ASEAN with Timor-Leste.</td></tr>
              <tr><td>Map</td><td>Natural Earth shapes (world-atlas), drawn as a 1.2° dot grid. Territories are drawn with their sovereign.</td></tr>
              <tr><td>Flashpoints</td><td>Google News search feeds for the last 24 hours, refreshed every 10 minutes, with GDELT as a fallback. If both are down a labelled snapshot is shown.</td></tr>
              <tr><td>On-chain</td><td>DexScreener search, Solana only.</td></tr>
            </tbody></table>
          </div>
          <div className="doc">
            <h4>Fees</h4>
            <p>BLOC adds no fee of its own. You pay pump.fun’s standard fees on the dev buy and Solana network fees. Creator fees from trading go to the wallet that launched the coin, under pump.fun’s rules.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-cta">
          <h2 className="display">The world picked sides.<br /><span>Your move.</span></h2>
          <a className="btn btn-primary" href="#pair">Pair a coin</a>
        </div>
        <div className="foot-row">
          <a href="#top" className="brand"><Mark /><span>BLOC</span></a>
          <div className="foot-links mono">
            {CONFIG.x && <a href={CONFIG.x} target="_blank" rel="noreferrer">X</a>}
            {CONFIG.telegram && <a href={CONFIG.telegram} target="_blank" rel="noreferrer">Telegram</a>}
            {CONFIG.ca && <span>CA {CONFIG.ca}</span>}
            <a href="#docs">Docs</a>
          </div>
        </div>
        <p className="foot-legal">BLOC is a memecoin launchpad. Coins launched here are memes with no intrinsic value or expectation of return. BLOC is not affiliated with or endorsed by any government, head of state, political party, alliance or international organisation. Nothing here is financial advice.</p>
      </div>
    </footer>
  );
}
