import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../config';
import type { Heat } from '../lib/heat';
import { ago } from '../lib/heat';

const THEME = 'paper';

/** The BLOC pixel computer, drawn by termkit.js (same object as the pfp, banner and favicon). */
export function Logo({ h = 26 }: { h?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = TK.OBJECTS[CONFIG.object]({ ticker: CONFIG.ticker }), c = ref.current!, k = 2;
    c.width = g.w * k; c.height = g.h * k;
    TK.draw(c.getContext('2d')!, g, { theme: THEME, cell: k, x: 0, y: 0, shadow: false });
    c.style.width = Math.round(h * g.w / g.h) + 'px'; c.style.height = h + 'px';
  }, [h]);
  return <canvas ref={ref} />;
}

export function Eyebrow({ n, label }: { n: string; label: string }) {
  return <div className="eyebrow"><b>{n}</b> · {label} <i /></div>;
}

export function Top() {
  const [solid, setSolid] = useState(false);
  const [on, setOn] = useState('');
  useEffect(() => {
    const f = () => {
      setSolid(scrollY > 10);
      const secs = [...document.querySelectorAll('section.s')] as HTMLElement[];
      const cur = secs.filter((s) => s.getBoundingClientRect().top < innerHeight * 0.4).pop();
      setOn(cur ? cur.id : '');
    };
    addEventListener('scroll', f, { passive: true }); f();
    return () => removeEventListener('scroll', f);
  }, []);
  const links = [['map', 'map'], ['wire', 'wire'], ['blocs', 'blocs'], ['pair', 'pair'], ['how', 'how'], ['token', 'token'], ['faq', 'faq']];
  return (
    <header className={`top ${solid ? 'solid' : ''}`} id="top">
      <div className="wrap">
        <a className="brand" href="#hero"><Logo />bloc</a>
        <nav className="nav">{links.map(([id, l]) => <a key={id} href={`#${id}`} className={on === id ? 'on' : ''}>{l}</a>)}</nav>
        {CONFIG.x && <a className="btn top-x" href={CONFIG.x} target="_blank" rel="noreferrer">x</a>}
        <a className="btn" href={CONFIG.ca ? `https://pump.fun/coin/${CONFIG.ca}` : '#token'} target={CONFIG.ca ? '_blank' : undefined} rel="noreferrer">buy</a>
      </div>
    </header>
  );
}

export function Strip({ heat }: { heat: Heat }) {
  const items = heat.ticker.slice(0, 16);
  const mk = (p: string) => items.map((h, i) => (
    <span key={p + i}><span className="red">■</span> {h.t} <span className="mut">{h.s} · {ago(h.d)}</span></span>
  ));
  return <div className="strip"><div className="run">{mk('a')}{mk('b')}</div></div>;
}

/** Hero art: the object + long shadow on a canvas behind the whole hero, anchored to #heroVis. */
export function HeroArt() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      const hero = document.getElementById('hero')!, c = ref.current!, d = devicePixelRatio || 1;
      const vis = document.getElementById('heroVis'); if (!vis) return;
      const r = hero.getBoundingClientRect(), a = vis.getBoundingClientRect();
      c.width = r.width * d; c.height = r.height * d;
      const x = c.getContext('2d')!; x.scale(d, d); x.imageSmoothingEnabled = false;
      const g = TK.OBJECTS[CONFIG.object]({ ticker: CONFIG.ticker });
      const cell = Math.max(3, Math.floor(Math.min(a.width * 0.78 / g.w, a.height * 0.78 / g.h)));
      const ox = a.left - r.left + (a.width - g.w * cell) * 0.32, oy = a.top - r.top + (a.height - g.h * cell) * 0.22;
      TK.draw(x, g, { theme: THEME, cell, x: ox, y: oy, shadowLen: 1600 });
    };
    draw(); addEventListener('resize', draw); document.fonts.ready.then(draw);
    const t = setTimeout(draw, 300);
    return () => { removeEventListener('resize', draw); clearTimeout(t); };
  }, []);
  return <canvas ref={ref} className="hero-bg" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }} />;
}
