import raw from '../data/world.json';
import type { BlocCode } from './blocs';
import { BLOC_META } from './blocs';

export interface Leader { n: string; r: string; k: string }
export interface Country {
  id: string; a2: string; name: string; official: string; region: string;
  lat: number; lng: number; blocs: BlocCode[]; leaders: Leader[]; alias: string[];
  cx: number; cy: number; dots: number;
}
interface WorldRaw {
  captured: string; cols: number; rows: number; step: number; lat0: number;
  countries: Country[]; blocs: Record<BlocCode, string[]>; dots: number[];
}

const W = raw as unknown as WorldRaw;
export const COLS = W.cols;
export const ROWS = W.rows;
export const CAPTURED = W.captured;
export const LAT0 = W.lat0;
export const STEP = W.step;
export const COUNTRIES = W.countries;
export const BLOC_MEMBERS = W.blocs;
export const DOTS = Int16Array.from(W.dots);
export const DOT_COUNT = DOTS.length / 3;
export const COUNTRY_INDEX = new Map(COUNTRIES.map((c, i) => [c.id, i]));

// Grid lookup: cell -> country index (-1 land/unassigned, -2 ocean)
export const GRID = new Int16Array(COLS * ROWS).fill(-2);
for (let k = 0; k < DOTS.length; k += 3) GRID[DOTS[k + 1] * COLS + DOTS[k]] = DOTS[k + 2];

// Dots per country, for fast highlight drawing
export const COUNTRY_DOTS: number[][] = COUNTRIES.map(() => []);
for (let k = 0; k < DOTS.length; k += 3) { const v = DOTS[k + 2]; if (v >= 0) COUNTRY_DOTS[v].push(DOTS[k], DOTS[k + 1]); }

export function hitTest(col: number, row: number): number {
  const at = (c: number, r: number) => (r >= 0 && r < ROWS && c >= 0 && c < COLS ? GRID[r * COLS + c] : -2);
  const v = at(col, row);
  if (v >= 0) return v;
  for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const w = at(col + dc, row + dr);
    if (w >= 0 && COUNTRIES[w].dots <= 6) return w; // forgiving for micro states only
  }
  return -1;
}

export function alignmentOf(c: Country): 'NATO' | 'BRICS' | 'NONE' {
  if (c.blocs.includes('NATO')) return 'NATO';
  if (c.blocs.includes('BRICS')) return 'BRICS';
  return 'NONE';
}

// ---------- Subjects (what a coin can be paired to) ----------
export type SubjectKind = 'leader' | 'country' | 'bloc';
export interface Subject {
  key: string;
  kind: SubjectKind;
  name: string;
  sub: string;
  ticker: string;
  country?: number; // index
  bloc?: BlocCode;
  search: string;
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const clean = (s: string) => fold(s).toUpperCase().replace(/[^A-Z0-9]/g, '');

const LEADER_TICKER: Record<string, string> = {
  'Xi Jinping': 'XI', 'Kim Jong Un': 'KIM', 'Lee Jae Myung': 'LEE', 'Li Qiang': 'LIQIANG', 'Lai Ching-te': 'LAI',
  'Tô Lâm': 'TOLAM', 'Pak Thae-song': 'PAK', 'Cho Jung-tai': 'CHO', 'Mohammed bin Salman': 'MBS',
  'Mohamed bin Zayed Al Nahyan': 'MBZ', 'Mohammed bin Rashid Al Maktoum': 'MBR', 'Hun Sen': 'HUNSEN', 'Hun Manet': 'HUNMANET',
  'Luiz Inácio Lula da Silva': 'LULA', 'Bongbong Marcos': 'BBM', 'Recep Tayyip Erdoğan': 'ERDOGAN', 'Ahmed al-Sharaa': 'SHARAA',
  'Abdel Fattah el-Sisi': 'SISI', 'Abdel Fattah al-Burhan': 'BURHAN', 'Mojtaba Khamenei': 'KHAMENEI', 'Volodymyr Zelenskyy': 'ZELENSKY',
  'Leo XIV': 'POPELEO', 'Charles III': 'CHARLES', 'Kassym-Jomart Tokayev': 'TOKAYEV', 'Min Aung Hlaing': 'HLAING',
  'Ukhnaagiin Khürelsükh': 'KHURELSUKH', 'Nyam-Osoryn Uchral': 'UCHRAL', 'Abelardo de la Espriella': 'ESPRIELLA',
  'Alexander Van der Bellen': 'VDB', 'Bart De Wever': 'DEWEVER', 'Frank-Walter Steinmeier': 'STEINMEIER',
};
const ROMAN = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIV|XVI)$/;

export function leaderTicker(name: string): string {
  if (LEADER_TICKER[name]) return LEADER_TICKER[name];
  const parts = name.replace(/\b(Jr\.|Sr\.)/g, '').trim().split(/\s+/);
  if (parts.length > 1 && ROMAN.test(parts[parts.length - 1])) return clean(parts[0]).slice(0, 10);
  if (/ bin /.test(name)) return clean(parts[0]).slice(0, 10);
  const last = clean(parts[parts.length - 1]);
  return (last.length >= 3 ? last : clean(parts.slice(-2).join(''))).slice(0, 10);
}

const COUNTRY_TICKER: Record<string, string> = {
  USA: 'USA', GBR: 'UK', ARE: 'UAE', PRK: 'NKOREA', KOR: 'SKOREA', ZAF: 'SAFRICA', COD: 'DRC', CAF: 'CAR', NZL: 'NZ',
  SAU: 'SAUDI', BIH: 'BOSNIA', TTO: 'TRINIDAD', VAT: 'VATICAN', PSE: 'PALESTINE', TUR: 'TURKIYE', CIV: 'IVORY', DOM: 'DOMREP',
  PNG: 'PNG', SLB: 'SOLOMON', MHL: 'MARSHALL', ATG: 'ANTIGUA', KNA: 'STKITTS', VCT: 'STVINCENT', STP: 'SAOTOME', GNQ: 'EQGUINEA',
};
export function countryTicker(c: Country): string {
  if (COUNTRY_TICKER[c.id]) return COUNTRY_TICKER[c.id];
  const t = clean(c.name);
  return t.length <= 10 ? t : c.id;
}

// The leader people usually mean when they name the country
const HOS_FIRST = new Set('RUS UKR FRA EGY KAZ UZB AZE TJK ARE PSE AFG CMR RWA DZA TUN JOR MAR QAT KWT BHR SWZ MCO LIE GIN TCD CAF COD COG BDI GNQ MRT CIV SOM SYR IRN'.split(' '));
export function primaryLeader(c: Country): number {
  const p = c.leaders.findIndex((l) => /P/.test(l.k) && !/^Former/.test(l.r));
  if (p >= 0) return p;
  if (HOS_FIRST.has(c.id)) { const s = c.leaders.findIndex((l) => /S/.test(l.k)); if (s >= 0) return s; }
  const g = c.leaders.findIndex((l) => /G/.test(l.k));
  return g >= 0 ? g : 0;
}

export function countryOfLeader(c: Country, l: Leader) {
  return `${l.r} · ${c.name}`;
}

export const SUBJECTS: Subject[] = [];
for (const b of BLOC_META) {
  SUBJECTS.push({ key: `b:${b.code}`, kind: 'bloc', name: b.name === b.label ? b.name : `${b.label}`, sub: `${b.name} · ${BLOC_MEMBERS[b.code].length} members`, ticker: b.ticker, bloc: b.code, search: fold(`${b.label} ${b.name} ${b.code}`).toLowerCase() });
}
COUNTRIES.forEach((c, i) => {
  SUBJECTS.push({ key: `c:${c.id}`, kind: 'country', name: c.name, sub: `${c.region} · ${c.id}`, ticker: countryTicker(c), country: i, search: fold(`${c.name} ${c.official} ${c.id} ${c.alias.join(' ')}`).toLowerCase() });
  c.leaders.forEach((l, j) => {
    SUBJECTS.push({ key: `l:${c.id}:${j}`, kind: 'leader', name: l.n, sub: countryOfLeader(c, l), ticker: leaderTicker(l.n), country: i, search: fold(`${l.n} ${l.r} ${c.name}`).toLowerCase() });
  });
});
export const SUBJECT_BY_KEY = new Map(SUBJECTS.map((s) => [s.key, s]));
export const LEADER_COUNT = SUBJECTS.filter((s) => s.kind === 'leader').length;

export function searchSubjects(q: string, limit = 60): Subject[] {
  const s = fold(q.trim()).toLowerCase();
  if (!s) return SUBJECTS.filter((x) => x.kind !== 'country').slice(0, limit);
  const out: [number, Subject][] = [];
  for (const x of SUBJECTS) {
    const i = x.search.indexOf(s);
    if (i < 0) continue;
    const nameHit = fold(x.name).toLowerCase().startsWith(s) ? 0 : 1;
    out.push([nameHit * 10 + (i > 0 ? 1 : 0) + (x.kind === 'leader' ? 0 : 0.5), x]);
  }
  return out.sort((a, b) => a[0] - b[0]).slice(0, limit).map((x) => x[1]);
}

export function initials(name: string) {
  const p = fold(name).replace(/[^A-Za-z\s-]/g, '').split(/[\s-]+/).filter(Boolean);
  if (!p.length) return '··';
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : p[0][1] || '')).toUpperCase();
}
