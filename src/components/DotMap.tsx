import { useEffect, useMemo, useRef, useState } from 'react';
import { COLS, ROWS, DOTS, COUNTRIES, COUNTRY_DOTS, LAT0, STEP, hitTest, alignmentOf, primaryLeader } from '../lib/world';
import { ALIGN, BLOC_BY_CODE, type BlocCode } from '../lib/blocs';
import type { Heat } from '../lib/heat';

export type MapMode = 'align' | 'heat' | 'bloc';

interface Props {
  mode: MapMode;
  bloc: BlocCode | null;
  heat: Heat | null;
  selected: number | null;
  onSelect: (i: number | null) => void;
}

const LAND = '#1f3026';
const DIM = '#24372b';

function hex(h: string) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a: number[], b: number[], t: number) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
const RAMP = ['#2a3d30', '#6e2a1c', '#e0533d', '#ffe1d6'].map(hex);
function heatColor(t: number) {
  if (t <= 0) return '#26392d';
  const x = Math.min(1, t) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const c = mix(RAMP[i], RAMP[i + 1], x - i);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// Column buckets for the radar sweep
const COL_BUCKETS: number[][] = Array.from({ length: COLS }, () => []);
for (let k = 0; k < DOTS.length; k += 3) COL_BUCKETS[DOTS[k]].push(DOTS[k + 1], DOTS[k + 2]);

export function countryColor(i: number, mode: MapMode, bloc: BlocCode | null, heat: Heat | null) {
  if (i < 0) return LAND;
  const c = COUNTRIES[i];
  if (mode === 'align') return ALIGN[alignmentOf(c)];
  if (mode === 'bloc' && bloc) return c.blocs.includes(bloc) ? BLOC_BY_CODE[bloc].color : DIM;
  if (mode === 'heat' && heat) return heatColor(Math.sqrt(heat.counts[i] / heat.max));
  return DIM;
}

export default function DotMap({ mode, bloc, heat, selected, onSelect }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const base = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0, dpr: 1 });
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const hoverRef = useRef<number>(-1);
  const selRef = useRef<number | null>(selected);
  const visible = useRef(true);
  const born = useRef(performance.now());

  const hot = useMemo(() => {
    if (!heat) return [] as number[];
    return heat.counts.map((v, i) => [v, i]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 7).map((x) => x[1]);
  }, [heat]);

  // Resize
  useEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = Math.round((w / COLS) * ROWS);
      setSize({ w, h, dpr: Math.min(2, window.devicePixelRatio || 1) });
    });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); };
  }, []);

  // Base layer
  useEffect(() => {
    if (!size.w) return;
    const { w, h, dpr } = size;
    const b = base.current || document.createElement('canvas');
    base.current = b;
    b.width = Math.round(w * dpr); b.height = Math.round(h * dpr);
    const ctx = b.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const cell = w / COLS;
    const r = Math.max(0.6, cell * 0.34);
    // graticule: equator, tropics, polar circles, prime meridian
    ctx.save();
    ctx.setLineDash([2, 5]);
    ctx.lineWidth = 1;
    ctx.font = `500 ${Math.max(10, Math.round(cell * 2.3))}px "JetBrains Mono", monospace`;
    ctx.textBaseline = 'bottom';
    for (const [lat, label] of [[66.56, '66.5°N'], [23.44, '23.4°N'], [0, '0°'], [-23.44, '23.4°S']] as const) {
      const y = ((LAT0 - lat) / STEP) * cell + cell / 2;
      ctx.strokeStyle = lat === 0 ? 'rgba(69,224,127,0.12)' : 'rgba(69,224,127,0.06)';
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillStyle = 'rgba(69,224,127,0.35)';
      ctx.fillText(label, 4, y - 3);
    }
    const x0 = (180 / STEP) * cell;
    ctx.strokeStyle = 'rgba(69,224,127,0.06)';
    ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, h); ctx.stroke();
    ctx.restore();
    const groups = new Map<string, number[]>();
    const colorOf = new Map<number, string>();
    for (let k = 0; k < DOTS.length; k += 3) {
      const i = DOTS[k + 2];
      let col = colorOf.get(i);
      if (!col) { col = countryColor(i, mode, bloc, heat); colorOf.set(i, col); }
      let g = groups.get(col); if (!g) { g = []; groups.set(col, g); }
      g.push(DOTS[k], DOTS[k + 1]);
    }
    for (const [col, pts] of groups) {
      ctx.fillStyle = col;
      ctx.beginPath();
      for (let p = 0; p < pts.length; p += 2) {
        ctx.rect(pts[p] * cell + cell / 2 - r, pts[p + 1] * cell + cell / 2 - r, r * 2, r * 2);
      }
      ctx.fill();
    }
  }, [size, mode, bloc, heat]);

  useEffect(() => { selRef.current = selected; }, [selected]);

  // Animation loop
  useEffect(() => {
    if (!size.w) return;
    const c = cvs.current!;
    const { w, h, dpr } = size;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d')!;
    const cell = w / COLS;
    const r = Math.max(0.6, cell * 0.34);
    let raf = 0;
    let drawn = false;
    const drawDots = (pts: number[], color: string, rad = r) => {
      ctx.fillStyle = color; ctx.beginPath();
      for (let p = 0; p < pts.length; p += 2) {
        ctx.rect(pts[p] * cell + cell / 2 - rad, pts[p + 1] * cell + cell / 2 - rad, rad * 2, rad * 2);
      }
      ctx.fill();
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible.current && drawn && performance.now() - born.current > 1700) return;
      drawn = true;
      const t = now - born.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      // intro reveal
      const intro = Math.min(1, t / 1600);
      const ease = 1 - Math.pow(1 - intro, 3);
      const revealX = ease * (w + 40);
      if (base.current) {
        if (intro < 1) {
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, revealX, h); ctx.clip();
          ctx.drawImage(base.current, 0, 0, w, h); ctx.restore();
          const g = ctx.createLinearGradient(revealX - 60, 0, revealX, 0);
          g.addColorStop(0, 'rgba(69,224,127,0)'); g.addColorStop(1, 'rgba(69,224,127,0.22)');
          ctx.fillStyle = g; ctx.fillRect(revealX - 60, 0, 60, h);
        } else {
          ctx.drawImage(base.current, 0, 0, w, h);
        }
      }
      // radar sweep (every 9s)
      if (intro >= 1) {
        const period = 9000;
        const ph = ((t - 1600) % period) / period;
        const sx = ph * (COLS + 40) - 20;
        ctx.globalCompositeOperation = 'lighter';
        for (let col = Math.max(0, Math.floor(sx - 14)); col <= Math.min(COLS - 1, Math.ceil(sx)); col++) {
          const a = Math.max(0, 1 - (sx - col) / 14) * 0.22;
          if (a <= 0.01) continue;
          const b = COL_BUCKETS[col];
          ctx.fillStyle = `rgba(69,224,127,${(a * 0.8).toFixed(3)})`; ctx.beginPath();
          for (let p = 0; p < b.length; p += 2) {
            ctx.rect(col * cell + cell / 2 - r, b[p] * cell + cell / 2 - r, r * 2, r * 2);
          }
          ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
      }
      // flashpoint rings
      if (mode !== 'bloc' && intro > 0.6) {
        hot.forEach((i, n) => {
          const cty = COUNTRIES[i];
          const x = cty.cx * cell + cell / 2, y = cty.cy * cell + cell / 2;
          const strength = heat ? Math.sqrt(heat.counts[i] / heat.max) : 0.5;
          for (let k = 0; k < 2; k++) {
            const ph = ((t / 2600 + n * 0.17 + k * 0.5) % 1);
            const rad = 4 + ph * (18 + 34 * strength) * (cell / 4.5);
            ctx.strokeStyle = `rgba(224,83,61,${((1 - ph) * 0.55 * (0.4 + strength)).toFixed(3)})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.stroke();
          }
          ctx.fillStyle = '#e0533d';
          const q = Math.max(1.8, r);
          ctx.fillRect(x - q, y - q, q * 2, q * 2);
        });
      }
      // hover + selected
      const hv = hoverRef.current;
      if (hv >= 0 && hv !== selRef.current) drawDots(COUNTRY_DOTS[hv], 'rgba(248,243,234,0.85)');
      const sel = selRef.current;
      if (sel != null && sel >= 0) {
        const pulse = 0.75 + Math.sin(t / 260) * 0.25;
        drawDots(COUNTRY_DOTS[sel], `rgba(248,243,234,${pulse.toFixed(3)})`, r * 1.08);
        const cty = COUNTRIES[sel];
        const x = cty.cx * cell + cell / 2, y = cty.cy * cell + cell / 2;
        ctx.strokeStyle = 'rgba(248,243,234,0.7)'; ctx.lineWidth = 1.5;
        const s = 14 + Math.sin(t / 400) * 2;
        ctx.beginPath();
        for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          ctx.moveTo(x + dx * s, y + dy * (s - 5)); ctx.lineTo(x + dx * s, y + dy * s); ctx.lineTo(x + dx * (s - 5), y + dy * s);
        }
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size, hot, mode, heat]);

  const locate = (e: { clientX: number; clientY: number }) => {
    const rect = cvs.current!.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const cell = rect.width / COLS;
    return { i: hitTest(Math.floor(x / cell), Math.floor(y / cell)), x, y };
  };

  const hc = hover && hover.i >= 0 && hover.i !== selected ? COUNTRIES[hover.i] : null;
  const lead = hc ? hc.leaders[primaryLeader(hc)] : null;

  return (
    <div className="dotmap" ref={wrap}>
      <canvas
        ref={cvs}
        style={{ width: size.w, height: size.h, cursor: hover && hover.i >= 0 ? 'pointer' : 'crosshair' }}
        onPointerMove={(e) => { const h = locate(e); hoverRef.current = h.i; setHover(h); }}
        onPointerLeave={() => { hoverRef.current = -1; setHover(null); }}
        onClick={(e) => { const h = locate(e); onSelect(h.i >= 0 ? h.i : null); }}
        aria-label="World map. Click a country to see its leaders."
        role="img"
      />
      {hc && hover && (
        <div className="maptip" style={{ left: Math.min(hover.x + 16, size.w - 240), top: Math.max(0, hover.y - 18) }}>
          <div className="maptip-top"><span className="mono">{hc.id}</span>{hc.name}</div>
          {lead && <div className="maptip-sub">{lead.n} · {lead.r.split(' · ').pop()}</div>}
          {heat && heat.counts[hover.i] > 0 && <div className="maptip-heat"><i />{heat.counts[hover.i]} headlines · 24h</div>}
        </div>
      )}
    </div>
  );
}

// Static mini map used on bloc cards and coin images
export function drawMiniMap(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, lit: (i: number) => string | null, dim = '#1d2127', rf = 0.36, square = true) {
  const cell = w / COLS;
  const r = Math.max(0.5, cell * rf);
  const groups = new Map<string, number[]>();
  for (let k = 0; k < DOTS.length; k += 3) {
    const i = DOTS[k + 2];
    const col = (i >= 0 && lit(i)) || dim;
    let g = groups.get(col); if (!g) { g = []; groups.set(col, g); }
    g.push(DOTS[k], DOTS[k + 1]);
  }
  for (const [col, pts] of groups) {
    ctx.fillStyle = col; ctx.beginPath();
    for (let p = 0; p < pts.length; p += 2) {
      const x = x0 + pts[p] * cell + cell / 2, y = y0 + pts[p + 1] * cell + cell / 2;
      if (square) ctx.rect(x - r, y - r, r * 2, r * 2);
      else { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
    }
    ctx.fill();
  }
}
