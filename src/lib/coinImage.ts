import { drawMiniMap } from '../components/DotMap';
import { COLS, ROWS, COUNTRIES, BLOC_MEMBERS, COUNTRY_INDEX, alignmentOf, type Subject } from './world';
import { ALIGN, BLOC_BY_CODE } from './blocs';

export function subjectColor(s: Subject): string {
  if (s.kind === 'bloc' && s.bloc) return BLOC_BY_CODE[s.bloc].color;
  if (s.country != null) {
    const a = alignmentOf(COUNTRIES[s.country]);
    return a === 'NONE' ? '#f2f3f5' : ALIGN[a];
  }
  return '#f2f3f5';
}

export async function renderCoinImage(canvas: HTMLCanvasElement, s: Subject, ticker: string, size = 1000) {
  try {
    await Promise.all([document.fonts.load('800 100px "Archivo Variable"'), document.fonts.load('500 20px "JetBrains Mono Variable"'), document.fonts.load('600 20px "JetBrains Mono Variable"')]);
  } catch { /* ignore */ }
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const u = size / 1000;
  ctx.fillStyle = '#07080a';
  ctx.fillRect(0, 0, size, size);
  // faint grid
  ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
  for (let x = 0; x <= size; x += 50 * u) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke(); }
  for (let y = 0; y <= size; y += 50 * u) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }

  const color = subjectColor(s);
  const members = s.kind === 'bloc' && s.bloc ? new Set(BLOC_MEMBERS[s.bloc].map((id) => COUNTRY_INDEX.get(id))) : null;
  const mapW = 940 * u, x0 = 30 * u, y0 = 230 * u;
  drawMiniMap(ctx, x0, y0, mapW, (i) => (members ? (members.has(i) ? color : null) : i === s.country ? color : null), '#20242b', 0.38);
  const cell = mapW / COLS;
  if (s.country != null) {
    const c = COUNTRIES[s.country];
    const cx = x0 + c.cx * cell + cell / 2, cy = y0 + c.cy * cell + cell / 2;
    for (const [rad, a] of [[26, 0.9], [54, 0.45], [86, 0.2]] as const) {
      ctx.strokeStyle = hexA(color, a); ctx.lineWidth = 2 * u;
      ctx.beginPath(); ctx.arc(cx, cy, rad * u, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // frame lines
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5 * u;
  ctx.beginPath(); ctx.moveTo(30 * u, 200 * u); ctx.lineTo(970 * u, 200 * u); ctx.moveTo(30 * u, y0 + ROWS * cell + 26 * u); ctx.lineTo(970 * u, y0 + ROWS * cell + 26 * u); ctx.stroke();

  // header
  drawMark(ctx, 40 * u, 64 * u, 11 * u, '#ffffff');
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${26 * u}px "JetBrains Mono Variable", monospace`;
  ctx.textBaseline = 'middle';
  ctx.fillText('PAIRED ON BLOC', 132 * u, 78 * u);
  ctx.textAlign = 'right';
  ctx.fillStyle = color;
  const code = s.kind === 'bloc' ? s.bloc! : COUNTRIES[s.country!].id;
  ctx.fillText(code, 960 * u, 78 * u);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `500 ${20 * u}px "JetBrains Mono Variable", monospace`;
  ctx.fillText(s.kind === 'leader' ? 'WORLD LEADER' : s.kind === 'country' ? 'COUNTRY' : 'BLOC', 132 * u, 110 * u);

  // ticker
  const t = '$' + (ticker || s.ticker).toUpperCase();
  let fs = 200 * u;
  const tf = () => `800 expanded ${fs}px "Archivo Variable", sans-serif`;
  ctx.font = tf();
  while (ctx.measureText(t).width > 920 * u && fs > 60 * u) { fs -= 6 * u; ctx.font = tf(); }
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(t, 38 * u, 855 * u);
  // subject line
  ctx.font = `500 ${26 * u}px "JetBrains Mono Variable", monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  const blocsOf = s.country != null ? COUNTRIES[s.country].blocs.map((b) => BLOC_BY_CODE[b].label).join(' · ') : '';
  const line = (s.kind === 'leader'
    ? `${s.name} — ${s.sub.split(' · ').slice(-2).join(', ')}`
    : s.kind === 'country'
      ? `${s.name}${blocsOf ? ' — ' + blocsOf : ''}`
      : `${s.bloc ? BLOC_BY_CODE[s.bloc].name : s.name} — ${members ? members.size : 0} members`).toUpperCase();
  ctx.fillText(fit(ctx, line, 920 * u), 40 * u, 925 * u);
  ctx.fillStyle = color;
  ctx.fillRect(40 * u, 950 * u, 64 * u, 6 * u);
}

function fit(ctx: CanvasRenderingContext2D, s: string, w: number) {
  if (ctx.measureText(s).width <= w) return s;
  let out = s;
  while (out.length > 4 && ctx.measureText(out + '…').width > w) out = out.slice(0, -1);
  return out + '…';
}

function hexA(h: string, a: number) {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// The BLOC mark: a 3x3 block of dots with one dot pulled out of line.
export function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (i === 2 && j === 0) continue;
    ctx.beginPath(); ctx.arc(x + j * r * 2.6, y + i * r * 2.6, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ff6a2b';
  ctx.beginPath(); ctx.arc(x, y + 2 * r * 2.6, r, 0, Math.PI * 2); ctx.fill();
}

export function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('image'))), 'image/png'));
}
