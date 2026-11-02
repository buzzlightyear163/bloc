import { useEffect, useState } from 'react';
import DotMap, { type MapMode } from './components/DotMap';
import CountryPanel from './components/CountryPanel';
import Pair from './components/Pair';
import { Top, Strip, HeroArt, Eyebrow } from './components/Chrome';
import { Flashpoints, Blocs, How, Fees, Token, Faq, Footer } from './components/Sections';
import { COUNTRIES, LEADER_COUNT, BLOC_MEMBERS } from './lib/world';
import { BLOC_META, BLOC_BY_CODE, ALIGN, type BlocCode } from './lib/blocs';
import { loadHeat, snapshotHeat, type Heat } from './lib/heat';
import { CONFIG } from './config';

const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function Typed({ text }: { text: string }) {
  const [n, setN] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setN((v) => { if (v >= text.length) { clearInterval(t); return v; } return v + 1; }), 70);
    return () => clearInterval(t);
  }, [text]);
  return <span className="cmd">{text.slice(0, n)}</span>;
}

export default function App() {
  const [heat, setHeat] = useState<Heat>(() => snapshotHeat());
  const [mode, setMode] = useState<MapMode>('align');
  const [bloc, setBloc] = useState<BlocCode | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [subjectKey, setSubjectKey] = useState('b:NATO');
  const [launchOn, setLaunchOn] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sc = document.querySelector('.map-scroll');
    if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) * 0.52;
    loadHeat().then(setHeat);
    const id = setInterval(() => loadHeat().then((h) => h.live && setHeat(h)), 10 * 60 * 1000);
    fetch('/api/config').then((r) => r.json()).then((j) => setLaunchOn(Boolean(j.launch))).catch(() => setLaunchOn(false));
    return () => clearInterval(id);
  }, []);

  const toMap = () => document.getElementById('map')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const showBloc = (b: BlocCode, scroll = false) => {
    if (mode === 'bloc' && bloc === b && !scroll) { setMode('align'); setBloc(null); return; }
    setMode('bloc'); setBloc(b); setSelected(null);
    if (scroll) toMap();
  };
  const pair = (key: string) => { setSubjectKey(key); document.getElementById('pair')?.scrollIntoView({ behavior: 'smooth' }); };
  const open = (i: number) => { setSelected(i); toMap(); };

  const ranked = heat.counts.map((v, i) => [v, i]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]);
  const maxHeat = ranked[0]?.[0] || 1;

  return (
    <>
      <Top />
      <main>
        <section className="hero" id="hero">
          <HeroArt />
          <div className="wrap">
            <div>
              <div className="prompt"><span>anon@bloc ~ %</span> <Typed text="bloc pair --live" /><span className="cur" /></div>
              <h1>every leader, every country, <b>every bloc.</b></h1>
              <p className="lede">Pair a coin to any world leader, any country or any alliance. Click the map, pick your side, launch it on pump.fun in one signature.</p>
              <div className="ctas">
                <a className="btn pri" href="#map">open the map →</a>
                <a className="btn" href="#pair">pair a coin</a>
              </div>
              <div className="ca">
                <span>ca</span>
                <code>{CONFIG.ca || 'posted here and on X at launch'}</code>
                {CONFIG.ca && <button className="chip" onClick={() => navigator.clipboard.writeText(CONFIG.ca).then(() => setCopied(true))}>{copied ? 'copied' : 'copy'}</button>}
              </div>
            </div>
            <div className="hero-vis" id="heroVis">
              <div className="term">
                <div className="bar"><i /><i /><i /><span>wire --live</span></div>
                <div className="body mini">
                  {ranked.slice(0, 5).map(([v, i]) => (
                    <div key={i} className="mini-row">
                      <span className="mini-c">{COUNTRIES[i].id.toLowerCase()}</span>
                      <span className="mini-b"><i style={{ width: `${(v / maxHeat) * 100}%` }} /></span>
                      <span className="mini-n">{v}</span>
                    </div>
                  ))}
                  <div className="mini-foot"><span className={`lamp ${heat.live ? 'live' : ''}`}>{heat.live ? 'live' : 'snapshot'}</span><span className="mut">{heat.total} headlines · 24h</span></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Strip heat={heat} />

        <section className="s" id="map">
          <div className="wrap wide">
            <Eyebrow n="01" label="world stage" />
            <h2><span className="pr">%</span>bloc map</h2>
            <p className="lede">{COUNTRIES.length} countries, {LEADER_COUNT} leaders, {BLOC_META.length} blocs. Click a country to see who runs it and pair a coin to them.</p>

            <div className="map-bar">
              <div className="modes" role="tablist" aria-label="Map mode">
                <button role="tab" aria-selected={mode === 'align'} className={`chip ${mode === 'align' ? 'on' : ''}`} onClick={() => { setMode('align'); setBloc(null); }}>alignment</button>
                <button role="tab" aria-selected={mode === 'heat'} className={`chip ${mode === 'heat' ? 'on' : ''}`} onClick={() => { setMode('heat'); setBloc(null); }}>flashpoints</button>
                <button role="tab" aria-selected={mode === 'bloc'} className={`chip ${mode === 'bloc' ? 'on' : ''}`} onClick={() => showBloc(bloc || 'NATO')}>blocs</button>
              </div>
              <div className="blocchips">
                {BLOC_META.map((b) => (
                  <button key={b.code} className={`bchip ${mode === 'bloc' && bloc === b.code ? 'on' : ''}`} style={{ '--c': b.color } as React.CSSProperties} onClick={() => showBloc(b.code)}>
                    <i />{b.label.toLowerCase()}<em>{BLOC_MEMBERS[b.code].length}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className="screen">
              <div className="bar"><i /><i /><i /><span className="screen-title">bloc-1 — world stage</span><span className={`lamp ${heat.live ? 'live' : ''}`}>{heat.live ? 'live' : 'snapshot'}</span></div>
              <div className={`screen-body ${selected != null ? 'has-panel' : ''}`}>
                <div className="map-scroll">
                  <DotMap mode={mode} bloc={bloc} heat={heat} selected={selected} onSelect={setSelected} />
                </div>
                <div className="legend">
                  {mode === 'align' && <>
                    <span><i style={{ background: ALIGN.NATO }} />nato</span>
                    <span><i style={{ background: ALIGN.BRICS }} />brics</span>
                    <span><i style={{ background: '#35503e' }} />neither</span>
                    <span><i className="ring" />flashpoint</span>
                  </>}
                  {mode === 'heat' && <span className="ramp-wrap">quiet<i className="ramp" />hot</span>}
                  {mode === 'bloc' && bloc && <span><i style={{ background: BLOC_BY_CODE[bloc].color }} />{BLOC_BY_CODE[bloc].name.toLowerCase()} · {BLOC_MEMBERS[bloc].length} members</span>}
                </div>
                {selected == null && <div className="map-hint">click any country_</div>}
                {selected != null && <CountryPanel index={selected} heat={heat} onClose={() => setSelected(null)} onPair={pair} />}
              </div>
            </div>
          </div>
        </section>

        <Flashpoints heat={heat} onOpen={open} onPair={pair} />
        <Blocs active={mode === 'bloc' ? bloc : null} onShow={(b) => showBloc(b, true)} onPair={pair} heat={heat} />
        <Pair subjectKey={subjectKey} setSubjectKey={setSubjectKey} launchOn={launchOn} />
        <How />
        <Fees />
        <Token />
        <Faq />
      </main>
      <Footer />
    </>
  );
}
