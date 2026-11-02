import { useEffect, useRef, useState } from 'react';
import { COUNTRIES, COUNTRY_INDEX, BLOC_MEMBERS, LEADER_COUNT, CAPTURED, leaderTicker, countryTicker, primaryLeader } from '../lib/world';
import { BLOC_META, type BlocCode } from '../lib/blocs';
import { ago, type Heat } from '../lib/heat';
import { drawMiniMap } from './DotMap';
import { CONFIG } from '../config';
import { Eyebrow } from './Chrome';

export function Flashpoints({ heat, onOpen, onPair }: { heat: Heat; onOpen: (i: number) => void; onPair: (key: string) => void }) {
  const ranked = heat.counts.map((v, i) => [v, i]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 8);
  const max = ranked[0]?.[0] || 1;
  return (
    <section className="s" id="wire">
      <div className="wrap">
        <Eyebrow n="02" label="flashpoints" />
        <h2><span className="pr">%</span>tail -f wire.log</h2>
        <p className="lede">Where the world’s headlines point right now. The last 24 hours of war and politics coverage, counted by the countries it names. <span className={`lamp ${heat.live ? 'live' : ''}`}>{heat.live ? 'live' : 'snapshot'}</span></p>
        <div className="card fp-card">
          <div className="fp-meta mut"># {heat.total} headlines · scanned {ago(heat.at)} ago · refreshes every 10 min</div>
          <ol className="fp-list">
            {ranked.map(([v, i], n) => {
              const c = COUNTRIES[i];
              const lj = primaryLeader(c);
              const top = c.leaders[lj];
              return (
                <li className="fp" key={c.id}>
                  <span className="fp-rank mut">{String(n + 1).padStart(2, '0')}</span>
                  <button className="fp-name" onClick={() => onOpen(i)}><span className="mut">{c.id.toLowerCase()}</span>{c.name.toLowerCase()}</button>
                  <div className="fp-bar" title={`${v} headlines`}><i style={{ width: `${Math.max(3, (v / max) * 100)}%` }} /></div>
                  <b className="fp-n">{v}</b>
                  <p className="fp-head mut">{heat.heads[i][0]?.t || '—'}</p>
                  <div className="fp-act">
                    <button className="btn xs" onClick={() => onPair(`c:${c.id}`)}>${countryTicker(c)}</button>
                    {top && <button className="btn xs" onClick={() => onPair(`l:${c.id}:${lj}`)}>${leaderTicker(top.n)}</button>}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
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
    drawMiniMap(ctx, 0, 0, w, (i) => (set.has(i) ? color : null), '#24372b', 0.42, true);
  }, [code, color]);
  return <div className="mini-screen"><canvas ref={ref} className="mini" /></div>;
}

export function Blocs({ active, onShow, onPair, heat }: { active: BlocCode | null; onShow: (b: BlocCode) => void; onPair: (key: string) => void; heat: Heat }) {
  return (
    <section className="s" id="blocs">
      <div className="wrap wide">
        <Eyebrow n="03" label="sides" />
        <h2><span className="pr">%</span>bloc ls --blocs</h2>
        <p className="lede">Seventeen alliances, cartels, clubs and pacts. Every one of them can be a coin. Open one to light it up on the map.</p>
        <div className="grid g4 bloc-grid">
          {BLOC_META.map((b) => {
            const members = BLOC_MEMBERS[b.code];
            const h = members.reduce((s, id) => s + (heat.counts[COUNTRY_INDEX.get(id) ?? -1] || 0), 0);
            return (
              <div key={b.code} className={`card lift bloc-card ${active === b.code ? 'on' : ''}`} style={{ '--c': b.color } as React.CSSProperties}>
                <div className="bloc-top"><span className="bloc-code"><i />{b.label.toLowerCase()}</span><span className="mut">{members.length}</span></div>
                <button className="mini-hit" onClick={() => onShow(b.code)} aria-label={`Show ${b.label} on the map`}><MiniMap code={b.code} color={b.color} /></button>
                <div className="bloc-name">{b.name.toLowerCase()}</div>
                <p className="bloc-line mut">{b.line}</p>
                <div className="bloc-foot">
                  <span className="mut">{h} headlines · 24h</span>
                  <div className="bloc-btns">
                    <button className="btn xs" onClick={() => onShow(b.code)}>map</button>
                    <button className="btn pri xs" onClick={() => onPair(`b:${b.code}`)}>${b.ticker}</button>
                  </div>
                </div>
              </div>
            );
          })}
          <a className="card lift bloc-card bloc-cta" href="#pair">
            <span className="mut"># no bloc?</span>
            <span className="bloc-solo">go solo<span className="cur" /></span>
            <p className="bloc-line mut">Every country and every leader pairs on its own. {COUNTRIES.length} countries, {LEADER_COUNT} leaders, one search box.</p>
            <span className="btn pri xs">search all →</span>
          </a>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  ['you pick a side', <><span className="mut">anon@bloc ~ %</span> bloc pair --leader putin</>],
  ['bloc finds the subject', <><span className="ok">✓</span> vladimir putin · president, russia</>],
  ['ticker and image are drawn', <><span className="ok">✓</span> ticker $PUTIN · coin card drawn from the map</>],
  ['metadata goes to ipfs', <><span className="ok">✓</span> name, image, pairing line pinned</>],
  ['you sign once', <><span className="ok">✓</span> signed in phantom · <span className="acc">live on pump.fun</span></>],
] as const;

export function How() {
  const ref = useRef<HTMLElement>(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const f = () => {
      const s = ref.current; if (!s) return;
      const r = s.getBoundingClientRect(), span = r.height - innerHeight;
      const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1;
      setN(Math.min(5, Math.floor(p * 5.999)));
    };
    addEventListener('scroll', f, { passive: true }); f();
    return () => removeEventListener('scroll', f);
  }, []);
  return (
    <section className="s pin" id="how" ref={ref}>
      <div className="stick"><div className="wrap">
        <Eyebrow n="05" label="how it works" />
        <h2><span className="pr">%</span>bloc pair</h2>
        <p className="lede">One command. Five things happen, in order, every time.</p>
        <div className="steps">
          <ol className="steplist">
            {STEPS.map(([t], i) => <li key={t} className={i < n ? 'on' : ''}><b>0{i + 1}</b>{t}</li>)}
          </ol>
          <div className="term">
            <div className="bar"><i /><i /><i /><span>bloc — zsh</span></div>
            <div className="body">{STEPS.map(([t, l], i) => <div key={t} className={`ln ${i < n ? 'on' : ''}`}>{l}</div>)}</div>
          </div>
        </div>
        <div className="meter">step {n} / 5</div>
      </div></div>
    </section>
  );
}

export function Fees() {
  return (
    <section className="s" id="fees">
      <div className="wrap">
        <Eyebrow n="06" label="where the fees go" />
        <h2><span className="pr">%</span>bloc fees --split</h2>
        <p className="lede">BLOC adds no fee of its own. Creator fees from trading go to the wallet that launched the coin, under pump.fun’s rules.</p>
        <div className="split"><div style={{ flex: 100, ['--c' as string]: 'var(--accent)' }} /></div>
        <div className="rows">
          <div><b className="acc">$1.00</b>creator fees → the wallet that launched the coin</div>
          <div><b>$0.00</b>to bloc</div>
          <div><b className="mut">std</b>pump.fun fees on the dev buy, plus solana network fees</div>
        </div>
        <div className="grid g3" style={{ marginTop: 40 }}>
          <div className="card lift stat"><div className="k">bloc fee</div><div className="v acc">0</div></div>
          <div className="card lift stat"><div className="k">signatures to launch</div><div className="v">1</div></div>
          <div className="card lift stat"><div className="k">min dev buy</div><div className="v">0.01 sol</div></div>
        </div>
      </div>
    </section>
  );
}

export function Token() {
  return (
    <section className="s" id="token">
      <div className="wrap">
        <Eyebrow n="07" label="token" />
        <h2><span className="pr">%</span>bloc token</h2>
        <div className="grid g2" style={{ marginTop: 34, alignItems: 'start' }}>
          <div className="card">
            <div className="rows kv">
              <div><span className="mut">ticker</span>{CONFIG.ticker}</div>
              <div><span className="mut">chain</span>solana · pump.fun</div>
              <div><span className="mut">supply</span>1,000,000,000</div>
              <div><span className="mut">ca</span><span className="ca-txt">{CONFIG.ca || 'posted here and on X at launch'}</span></div>
            </div>
            <div className="ctas">
              {CONFIG.ca ? <a className="btn pri" href={`https://pump.fun/coin/${CONFIG.ca}`} target="_blank" rel="noreferrer">buy on pump.fun</a> : <span className="btn pri disabled">buy on pump.fun · at launch</span>}
              {CONFIG.x ? <a className="btn" href={CONFIG.x} target="_blank" rel="noreferrer">follow on X</a> : <a className="btn" href="#pair">pair a coin</a>}
            </div>
          </div>
          <div className="term">
            <div className="bar"><i /><i /><i /><span>bloc — why $BLOC</span></div>
            <div className="body">
              <div className="ln on"><span className="mut">anon@bloc ~ %</span> bloc why</div>
              <div className="ln on"><span className="ok">✓</span> the coin of the pad every leader coin launches from</div>
              <div className="ln on"><span className="ok">✓</span> every coin made here links back to bloc</div>
              <div className="ln on"><span className="ok">✓</span> the world picks sides. $BLOC is the map.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section className="s" id="faq">
      <div className="wrap">
        <Eyebrow n="08" label="faq" />
        <h2><span className="pr">%</span>man bloc</h2>
        <div className="man" style={{ marginTop: 28 }}>
          <details open><summary>is this financial advice?</summary><p>No. BLOC is a memecoin launchpad. Coins launched here are memes with no intrinsic value or expectation of return.</p></details>
          <details><summary>are these coins official?</summary><p>No. Every description ends with a line saying the coin is not affiliated with or endorsed by the person, country or organisation it’s paired to, and it can’t be removed. Names and tickers can’t contain “official”. BLOC draws no portraits: coin images use the map, never a face.</p></details>
          <details><summary>how does a launch work?</summary><p>Pick a subject, set the name, ticker, an optional description and a dev buy (0.01 to 5 SOL). BLOC pins the image and metadata to IPFS, PumpPortal’s local-transaction API builds the pump.fun create transaction, and you approve it once in Phantom, Solflare or Backpack. You need SOL for the dev buy plus about 0.03 SOL in fees.</p></details>
          <details><summary>where does the data come from?</summary><p>Leaders: Wikipedia’s list of current heads of state and government, captured {CAPTURED} (governors-general and personal representatives left out). Blocs: membership as of November 2026; BRICS counts Saudi Arabia as the 2026 chair lists it, OPEC is without the UAE, which left on 1 May 2026, and ASEAN includes Timor-Leste. Map: Natural Earth shapes drawn as a 1.2° dot grid, territories with their sovereign. Wire: Google News search feeds for the last 24 hours, refreshed every 10 minutes, with GDELT as a fallback. On-chain: DexScreener search, Solana only.</p></details>
          <details><summary>what can’t it do?</summary><p>The headline count is a rough signal of attention, not a measure of who is winning anything. The leader list is a snapshot and can be out of date the day someone resigns. If both news feeds are down the map shows a labelled snapshot instead of live data.</p></details>
          <details><summary>will bloc DM me?</summary><p>Never. Anyone who does is not us.</p></details>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer><div className="wrap">
      <div className="big">pick a <b>bloc.</b><span className="cur" /></div>
      <div className="ctas"><a className="btn pri" href="#map">open the map</a><a className="btn" href="#pair">pair a coin</a></div>
      <div className="fine">
        <span>{CONFIG.ticker} · solana</span>
        <span>not financial advice</span>
        <span>not affiliated with any government, leader, party or alliance</span>
        {CONFIG.ca && <span>ca {CONFIG.ca}</span>}
        {CONFIG.x && <a href={CONFIG.x} target="_blank" rel="noreferrer">x</a>}
      </div>
    </div></footer>
  );
}
