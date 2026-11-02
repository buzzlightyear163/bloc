import { useState } from 'react';
import { CONFIG } from '../config';
import type { Heat } from '../lib/heat';
import { ago } from '../lib/heat';

export function Mark({ size = 22 }: { size?: number }) {
  const r = 2.1, g = 6.6;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      {[0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => (
        <circle key={`${i}${j}`} cx={3.4 + j * g} cy={3.4 + i * g} r={r} fill={i === 2 && j === 0 ? '#ff6a2b' : '#f4f5f7'} />
      )))}
    </svg>
  );
}

export function Nav() {
  const [copied, setCopied] = useState(false);
  return (
    <header className="nav">
      <div className="wrap nav-in">
        <a href="#top" className="brand"><Mark /><span>BLOC</span></a>
        <nav className="nav-links">
          <a href="#top">Map</a>
          <a href="#flashpoints">Flashpoints</a>
          <a href="#blocs">Blocs</a>
          <a href="#pair">Pair</a>
          <a href="#docs">Docs</a>
        </nav>
        <div className="nav-right">
          {CONFIG.ca && (
            <button className="ca-chip" onClick={() => { navigator.clipboard.writeText(CONFIG.ca); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
              <span className="mono">{CONFIG.ticker}</span>{copied ? 'Copied' : `${CONFIG.ca.slice(0, 4)}…${CONFIG.ca.slice(-4)}`}
            </button>
          )}
          {CONFIG.x && (
            <a className="icon-btn" href={CONFIG.x} target="_blank" rel="noreferrer" aria-label="BLOC on X">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
          )}
          <a className="btn btn-primary btn-sm" href="#pair">Pair a coin</a>
        </div>
      </div>
    </header>
  );
}

export function Ticker({ heat }: { heat: Heat }) {
  const items = heat.ticker.length ? heat.ticker : [];
  const row = (
    <div className="ticker-row">
      {items.map((h, i) => (
        <span className="ticker-item" key={i}>
          <i />{h.t}<em>{h.s}{h.d ? ` · ${ago(h.d)}` : ''}</em>
        </span>
      ))}
    </div>
  );
  return (
    <div className="ticker">
      <div className={`ticker-tag ${heat.live ? 'live' : ''}`}>
        <i />{heat.live ? 'Live wire' : 'Wire · snapshot'}
      </div>
      <div className="ticker-track">
        <div className="ticker-move">{row}{row}</div>
      </div>
    </div>
  );
}
