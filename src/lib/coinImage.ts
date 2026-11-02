import { drawMiniMap } from '../components/DotMap';
import { CONFIG } from '../config';
import { COLS, ROWS, COUNTRIES, BLOC_MEMBERS, COUNTRY_INDEX, alignmentOf, type Subject } from './world';
import { ALIGN, BLOC_BY_CODE } from './blocs';

const PAPER = '#f0e7d8';
const CARD = '#f8f3ea';
const SHADOW = '#dcd2bf';
const INK = '#2b2a26';
const LINE = '#3a372f';
const MUTED = '#8b8474';
const ACCENT = '#2f9e4f';
const SCREEN = '#16211a';
const MONO = '"JetBrains Mono", monospace';

export function subjectColor(s: Subject): string {
  if (s.kind === 'bloc' && s.bloc) return BLOC_BY_CODE[s.bloc].color;
  if (s.country != null) {
    const a = alignmentOf(COUNTRIES[s.country]);
    return a === 'NONE' ? '#45e07f' : ALIGN[a];
  }
  return '#45e07f';
}

export async function renderCoinImage(canvas: HTMLCanvasElement, s: Subject, ticker: string, size = 1000) {
  try {
    await Promise.all([document.fonts.load(`500 40px ${MONO}`), document.fonts.load(`400 20px ${MONO}`), document.fonts.load(`700 40px ${MONO}`)]);
  } catch { /* ignore */ }
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const u = size / 1000;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'rgba(60,50,30,0.10)';
  for (let y = 11 * u; y < size; y += 22 * u) for (let x = 11 * u; x < size; x += 22 * u) { ctx.beginPath(); ctx.arc(x, y, 1.2 * u, 0, Math.PI * 2); ctx.fill(); }

  const color = subjectColor(s);
  const members = s.kind === 'bloc' && s.bloc ? new Set(BLOC_MEMBERS[s.bloc].map((id) => COUNTRY_INDEX.get(id))) : null;
  const code = s.kind === 'bloc' ? s.bloc! : COUNTRIES[s.country!].id;

  // ---- terminal card: bar + dark screen with the map
  const bx = 64 * u, by = 70 * u, bw = 872 * u, barH = 54 * u, bh = 470 * u;
  ctx.fillStyle = SHADOW; ctx.fillRect(bx + 14 * u, by + 14 * u, bw, bh);
  ctx.fillStyle = CARD; ctx.fillRect(bx, by, bw, barH);
  ctx.fillStyle = SCREEN; ctx.fillRect(bx, by + barH, bw, bh - barH);
  ctx.strokeStyle = LINE; ctx.lineWidth = 4 * u;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.beginPath(); ctx.moveTo(bx, by + barH); ctx.lineTo(bx + bw, by + barH); ctx.stroke();
  ctx.lineWidth = 3 * u;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(bx + (34 + i * 30) * u, by + barH / 2, 8 * u, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = MUTED; ctx.font = `400 ${22 * u}px ${MONO}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  ctx.fillText(`bloc-1 — ${code.toLowerCase()}`, bx + bw - 24 * u, by + barH / 2 + 1 * u);
  ctx.textAlign = 'left';

  const sx = bx + 30 * u, sw = bw - 60 * u;
  const cell = sw / COLS;
  const sy = by + barH + (bh - barH - ROWS * cell) / 2;
  drawMiniMap(ctx, sx, sy, sw, (i) => (members ? (members.has(i) ? color : null) : i === s.country ? color : null), '#26392d', 0.4, true);
  if (s.country != null) {
    const c = COUNTRIES[s.country];
    const cx = sx + c.cx * cell + cell / 2, cy = sy + c.cy * cell + cell / 2;
    ctx.strokeStyle = '#f8f3ea'; ctx.lineWidth = 3 * u;
    const r = 26 * u, k = 9 * u;
    ctx.beginPath();
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      ctx.moveTo(cx + dx * r, cy + dy * (r - k)); ctx.lineTo(cx + dx * r, cy + dy * r); ctx.lineTo(cx + dx * (r - k), cy + dy * r);
    }
    ctx.stroke();
  }

  // ---- prompt + ticker
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = MUTED; ctx.font = `400 ${34 * u}px ${MONO}`;
  ctx.fillText('anon@bloc ~ % pair', 66 * u, 640 * u);
  const t = '$' + (ticker || s.ticker).toUpperCase();
  let fs = 150 * u;
  const tf = () => `500 ${fs}px ${MONO}`;
  ctx.font = tf();
  while (ctx.measureText(t).width > 790 * u && fs > 50 * u) { fs -= 6 * u; ctx.font = tf(); }
  ctx.fillStyle = INK;
  const base = 640 * u + 30 * u + fs * 0.8;
  ctx.fillText(t, 60 * u, base);
  const tw = ctx.measureText(t).width;
  ctx.fillStyle = ACCENT;
  ctx.fillRect(60 * u + tw + 10 * u, base - fs * 0.74, fs * 0.5, fs * 0.86);

  // ---- subject line + pixel computer + label
  const blocsOf = s.country != null ? COUNTRIES[s.country].blocs.map((b) => BLOC_BY_CODE[b].label).join(' · ') : '';
  const line = (s.kind === 'leader'
    ? `${s.name} — ${s.sub.split(' · ').slice(-2).join(', ')}`
    : s.kind === 'country'
      ? `${s.name}${blocsOf ? ' — ' + blocsOf : ''}`
      : `${s.bloc ? BLOC_BY_CODE[s.bloc].name : s.name} — ${members ? members.size : 0} members`).toLowerCase();
  ctx.font = `400 ${26 * u}px ${MONO}`;
  ctx.fillStyle = MUTED;
  ctx.fillText(fit(ctx, line, 870 * u), 66 * u, 885 * u);
  if (typeof TK !== 'undefined') {
    const g = TK.OBJECTS[CONFIG.object]({ ticker: CONFIG.ticker });
    const cellPx = Math.max(1, Math.floor(46 * u / g.h));
    TK.draw(ctx, g, { theme: 'paper', cell: cellPx, x: 66 * u, y: 914 * u, shadow: false });
    ctx.fillStyle = INK; ctx.font = `500 ${22 * u}px ${MONO}`;
    ctx.fillText('paired on bloc', 66 * u + g.w * cellPx + 16 * u, 950 * u);
  }
}

function fit(ctx: CanvasRenderingContext2D, s: string, w: number) {
  if (ctx.measureText(s).width <= w) return s;
  let out = s;
  while (out.length > 4 && ctx.measureText(out + '…').width > w) out = out.slice(0, -1);
  return out + '…';
}

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('image'))), 'image/png'));
}
