import { useEffect, useState } from 'react';
import DotMap, { type MapMode } from './components/DotMap';
import CountryPanel from './components/CountryPanel';
import Pair from './components/Pair';
import { Nav, Ticker } from './components/Chrome';
import { Flashpoints, Blocs, How, Docs, Footer } from './components/Sections';
import { COUNTRIES, LEADER_COUNT, BLOC_MEMBERS } from './lib/world';
import { BLOC_META, BLOC_BY_CODE, ALIGN, type BlocCode } from './lib/blocs';
import { loadHeat, snapshotHeat, ago, type Heat } from './lib/heat';

export default function App() {
  const [heat, setHeat] = useState<Heat>(() => snapshotHeat());
  const [mode, setMode] = useState<MapMode>('align');
  const [bloc, setBloc] = useState<BlocCode | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [subjectKey, setSubjectKey] = useState('b:NATO');
  const [launchOn, setLaunchOn] = useState(false);

  useEffect(() => {
    // On narrow screens the map scrolls sideways; start on Europe and the Middle East.
    const sc = document.querySelector('.map-scroll');
    if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) * 0.52;
    loadHeat().then(setHeat);
    const id = setInterval(() => loadHeat().then((h) => h.live && setHeat(h)), 10 * 60 * 1000);
    fetch('/api/config').then((r) => r.json()).then((j) => setLaunchOn(Boolean(j.launch))).catch(() => setLaunchOn(false));
    return () => clearInterval(id);
  }, []);

  const showBloc = (b: BlocCode, scroll = false) => {
    if (mode === 'bloc' && bloc === b && !scroll) { setMode('align'); setBloc(null); return; }
    setMode('bloc'); setBloc(b); setSelected(null);
    if (scroll) document.querySelector('.map-bar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const pair = (key: string) => { setSubjectKey(key); document.getElementById('pair')?.scrollIntoView({ behavior: 'smooth' }); };
  const open = (i: number) => { setSelected(i); document.querySelector('.map-bar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const hottest = heat.counts.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0])[0];

  return (
    <>
      <Nav />
      <Ticker heat={heat} />
      <main>
        <section className="hero" id="top">
          <div className="wrap">
            <div className="hero-head">
              <div>
                <div className="kicker mono">01 — World stage · {COUNTRIES.length} countries · {LEADER_COUNT} leaders · {BLOC_META.length} blocs</div>
                <h1 className="display hero-h1">Pick a bloc<span className="stop">.</span></h1>
                <p className="hero-sub">Pair a coin to any world leader, any country or any alliance. Click the map, pick your side and launch it on pump.fun in seconds.</p>
              </div>
              <div className="hero-stats mono">
                <div><span>Wire</span><b className={heat.live ? 'live' : ''}>{heat.live ? '● Live' : '● Snapshot'}</b></div>
                <div><span>Headlines · 24h</span><b>{heat.total}</b></div>
                <div><span>Hottest</span><b>{hottest && hottest[0] > 0 ? COUNTRIES[hottest[1]].name : '—'}</b></div>
                <div><span>Scanned</span><b>{ago(heat.at)} ago</b></div>
              </div>
            </div>

            <div className="map-bar">
              <div className="seg" role="tablist" aria-label="Map mode">
                <button role="tab" aria-selected={mode === 'align'} className={mode === 'align' ? 'on' : ''} onClick={() => { setMode('align'); setBloc(null); }}>Alignment</button>
                <button role="tab" aria-selected={mode === 'heat'} className={mode === 'heat' ? 'on' : ''} onClick={() => { setMode('heat'); setBloc(null); }}>Flashpoints</button>
                <button role="tab" aria-selected={mode === 'bloc'} className={mode === 'bloc' ? 'on' : ''} onClick={() => showBloc(bloc || 'NATO')}>Blocs</button>
              </div>
              <div className="chips">
                {BLOC_META.map((b) => (
                  <button key={b.code} className={`chip ${mode === 'bloc' && bloc === b.code ? 'on' : ''}`} style={{ '--c': b.color } as React.CSSProperties} onClick={() => showBloc(b.code)}>
                    <i />{b.label}<em>{BLOC_MEMBERS[b.code].length}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className={`map-frame ${selected != null ? 'has-panel' : ''}`}>
              <div className="map-scroll">
                <DotMap mode={mode} bloc={bloc} heat={heat} selected={selected} onSelect={setSelected} />
              </div>
              <div className="legend mono">
                {mode === 'align' && <>
                  <span><i style={{ background: ALIGN.NATO }} />NATO</span>
                  <span><i style={{ background: ALIGN.BRICS }} />BRICS</span>
                  <span><i style={{ background: '#3a3f47' }} />Neither</span>
                  <span><i className="ring" />Flashpoint</span>
                </>}
                {mode === 'heat' && <span className="ramp-wrap">Quiet<i className="ramp" />Hot</span>}
                {mode === 'bloc' && bloc && <span><i style={{ background: BLOC_BY_CODE[bloc].color }} />{BLOC_BY_CODE[bloc].name} · {BLOC_MEMBERS[bloc].length} members</span>}
              </div>
              <div className="map-hint mono">{selected == null ? 'Click any country' : ''}</div>
              {selected != null && (
                <CountryPanel index={selected} heat={heat} onClose={() => setSelected(null)} onPair={pair} />
              )}
            </div>
          </div>
        </section>

        <Flashpoints heat={heat} onOpen={open} onPair={pair} />
        <Blocs active={mode === 'bloc' ? bloc : null} onShow={(b) => showBloc(b, true)} onPair={pair} heat={heat} />
        <Pair subjectKey={subjectKey} setSubjectKey={setSubjectKey} launchOn={launchOn} />
        <How />
        <Docs />
      </main>
      <Footer />
    </>
  );
}
