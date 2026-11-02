// Builds src/data/world.json: countries (leaders, blocs, aliases) + dot-matrix map.
// Run: node scripts/build-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { geoContains, geoBounds } from 'd3-geo';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const wc = require('world-countries');
const topo = require('world-atlas/countries-50m.json');
const leadersRaw = JSON.parse(fs.readFileSync(path.join(root, 'data/leaders.raw.json'), 'utf8'));

// ---- name -> cca3 -------------------------------------------------------
const MANUAL = {
  'Bahamas, The': 'BHS', 'Gambia, The': 'GMB', 'Congo, Democratic Republic of the': 'COD',
  'Congo, Republic of the': 'COG', 'Micronesia, Federated States of': 'FSM', 'Libya (GNU)': 'LBY',
  'Sudan (TSC)': 'SDN', 'Yemen (PLC)': 'YEM', 'Palestine (Palestinian Authority)': 'PSE',
  'Vatican City (Holy See)': 'VAT', 'Ivory Coast': 'CIV', 'Czech Republic': 'CZE', 'Cape Verde': 'CPV',
  'Timor-Leste': 'TLS', 'Eswatini': 'SWZ', 'North Macedonia': 'MKD', 'São Tomé and Príncipe': 'STP',
  'Myanmar': 'MMR', 'Turkey': 'TUR', 'South Korea': 'KOR', 'North Korea': 'PRK', 'Russia': 'RUS',
  'Laos': 'LAO', 'Vietnam': 'VNM', 'Iran': 'IRN', 'Syria': 'SYR', 'Moldova': 'MDA', 'Tanzania': 'TZA',
  'Bolivia': 'BOL', 'Venezuela': 'VEN', 'Brunei': 'BRN', 'Taiwan': 'TWN', 'Kosovo': 'UNK',
  'United States': 'USA', 'United Kingdom': 'GBR',
};
const byName = new Map();
for (const c of wc) {
  byName.set(c.name.common, c);
  byName.set(c.name.official, c);
}
const byCca3 = new Map(wc.map((c) => [c.cca3, c]));
const byCcn3 = new Map(wc.filter((c) => c.ccn3).map((c) => [c.ccn3, c]));

// Short display names
const DISPLAY = {
  COD: 'DR Congo', COG: 'Congo', FSM: 'Micronesia', PSE: 'Palestine', VAT: 'Vatican City', CIV: "Côte d'Ivoire",
  CZE: 'Czechia', UNK: 'Kosovo', TWN: 'Taiwan', USA: 'United States', GBR: 'United Kingdom', KOR: 'South Korea',
  PRK: 'North Korea', BIH: 'Bosnia and Herzegovina', VCT: 'St Vincent & Grenadines', KNA: 'St Kitts & Nevis',
  STP: 'São Tomé & Príncipe', CAF: 'Central African Rep.', DOM: 'Dominican Rep.', ARE: 'UAE', TUR: 'Türkiye',
};

// ---- Blocs (cca3) -------------------------------------------------------
const B = (s) => s.split(' ');
const BLOCS = {
  NATO: B('ALB BEL BGR CAN HRV CZE DNK EST FIN FRA DEU GRC HUN ISL ITA LVA LTU LUX MNE NLD MKD NOR POL PRT ROU SVK SVN ESP SWE TUR GBR USA'),
  BRICS: B('BRA RUS IND CHN ZAF EGY ETH IRN ARE IDN SAU'),
  EU: B('AUT BEL BGR HRV CYP CZE DNK EST FIN FRA DEU GRC HUN IRL ITA LVA LTU LUX MLT NLD POL PRT ROU SVK SVN ESP SWE'),
  G7: B('USA GBR FRA DEU ITA JPN CAN'),
  G20: B('ARG AUS BRA CAN CHN FRA DEU IND IDN ITA JPN MEX RUS SAU ZAF KOR TUR GBR USA'),
  P5: B('USA GBR FRA RUS CHN'),
  NUKE: B('USA RUS CHN GBR FRA IND PAK PRK ISR'),
  CRINK: B('CHN RUS IRN PRK'),
  SCO: B('CHN RUS IND PAK KAZ KGZ TJK UZB IRN BLR'),
  OPEC: B('DZA COG GNQ GAB IRN IRQ KWT LBY NGA SAU VEN'),
  GCC: B('BHR KWT OMN QAT SAU ARE'),
  ASEAN: B('BRN KHM IDN LAO MYS MMR PHL SGP THA VNM TLS'),
  AUKUS: B('AUS GBR USA'),
  QUAD: B('USA JPN IND AUS'),
  FVEY: B('USA GBR CAN AUS NZL'),
  ARAB: B('DZA BHR COM DJI EGY IRQ JOR KWT LBN LBY MRT MAR OMN PSE QAT SAU SOM SDN SYR TUN ARE YEM'),
  AES: B('MLI BFA NER'),
};

// ---- Extra aliases for headline matching -------------------------------
const EXTRA = {
  USA: ['U.S.', 'US', 'America', 'American', 'Americans', 'Washington', 'White House', 'Pentagon', 'Trump', 'Vance', 'Hegseth', 'CENTCOM'],
  RUS: ['Kremlin', 'Moscow', 'Putin', 'Russian'], UKR: ['Kyiv', 'Zelensky', 'Zelenskyy', 'Ukrainian'],
  ISR: ['Israeli', 'IDF', 'Netanyahu', 'Jerusalem', 'Tel Aviv'], IRN: ['Iranian', 'Tehran', 'Khamenei', 'IRGC', 'Pezeshkian'],
  PSE: ['Gaza', 'Hamas', 'West Bank', 'Palestinian', 'Palestinians'], LBN: ['Hezbollah', 'Beirut', 'Lebanese'],
  YEM: ['Houthi', 'Houthis', 'Yemeni', 'Sanaa'], CHN: ['Beijing', 'Chinese', 'Xi Jinping'], TWN: ['Taipei', 'Taiwanese'],
  PRK: ['Pyongyang', 'Kim Jong Un'], KOR: ['Seoul'], GBR: ['UK', 'Britain', 'British', 'London', 'Downing Street'],
  FRA: ['French', 'Paris', 'Macron'], DEU: ['German', 'Berlin', 'Merz'], IND: ['Indian', 'New Delhi', 'Modi'],
  PAK: ['Pakistani', 'Islamabad'], SAU: ['Saudi', 'Riyadh'], ARE: ['UAE', 'Emirati', 'Dubai', 'Abu Dhabi'],
  QAT: ['Qatari', 'Doha'], SYR: ['Syrian', 'Damascus'], IRQ: ['Iraqi', 'Baghdad'], TUR: ['Turkish', 'Ankara', 'Erdogan', 'Türkiye'],
  JPN: ['Japanese', 'Tokyo'], VEN: ['Venezuelan', 'Caracas', 'Maduro'], EGY: ['Egyptian', 'Cairo'],
  SDN: ['Sudanese', 'Khartoum', 'RSF'], POL: ['Polish', 'Warsaw'], BLR: ['Belarusian', 'Minsk', 'Lukashenko'],
  CUB: ['Cuban', 'Havana'], MEX: ['Mexican'], CAN: ['Canadian', 'Ottawa'], AUS: ['Australian', 'Canberra'],
  JOR: ['Jordanian', 'Amman'], OMN: ['Omani', 'Muscat'], KWT: ['Kuwaiti'], BHR: ['Bahraini'],
  AFG: ['Afghan', 'Taliban', 'Kabul'], GEO: ['Georgian', 'Tbilisi'], ARM: ['Armenian', 'Yerevan'], AZE: ['Azerbaijani', 'Baku'],
};
// Words that collide with ordinary English, a US state, or another country
const NO_ALIAS = new Set(['Chad', 'Georgia', 'Jordan', 'Guinea', 'Niger', 'Turkey', 'Dominica', 'Victoria', 'Kingston', 'Hamilton', 'Wellington', 'Ottawa', 'Male']);

const DROP_ALIAS = new Set(['Sofia', 'Georgetown', 'Santiago', 'Lima', 'Kingston', 'Victoria', 'Male', 'Congo', 'Dominican', 'Sucre', "Saint John's", 'Basseterre', 'Castries', 'Apia', 'Praia', 'Palikir', 'Suva', 'Majuro', 'Honiara', 'Funafuti', 'Tarawa', 'Ngerulmud', 'Yaren', 'Port Vila']);

// Territories drawn with their sovereign on the map
const TERRITORY = { GRL: 'DNK', GUF: 'FRA', NCL: 'FRA', PYF: 'FRA', ATF: 'FRA', PRI: 'USA', FLK: 'GBR', SJM: 'NOR', ALA: 'FIN', FRO: 'DNK', REU: 'FRA', GLP: 'FRA', MTQ: 'FRA', HKG: 'CHN', MAC: 'CHN', GUM: 'USA', ASM: 'USA', VIR: 'USA', MNP: 'USA', BMU: 'GBR', CYM: 'GBR', TCA: 'GBR', SHN: 'GBR', SGS: 'GBR', HMD: 'AUS', NFK: 'AUS', CXR: 'AUS', CCK: 'AUS', WLF: 'FRA', SPM: 'FRA', BLM: 'FRA', MAF: 'FRA', MYT: 'FRA', AIA: 'GBR', MSR: 'GBR', VGB: 'GBR', PCN: 'GBR', IOT: 'GBR', ABW: 'NLD', CUW: 'NLD', SXM: 'NLD', BES: 'NLD', COK: 'NZL', NIU: 'NZL', TKL: 'NZL', IMN: 'GBR', JEY: 'GBR', GGY: 'GBR', GIB: 'GBR' };

// ---- Countries ----------------------------------------------------------
const countries = [];
const idx = new Map();
for (const [rawName, list] of Object.entries(leadersRaw)) {
  const cca3 = MANUAL[rawName] || byName.get(rawName)?.cca3;
  if (!cca3) { console.warn('No cca3 for', rawName); continue; }
  const w = byCca3.get(cca3);
  if (!w) { console.warn('No world-countries entry', cca3); continue; }
  const blocs = Object.entries(BLOCS).filter(([, m]) => m.includes(cca3)).map(([k]) => k);
  const name = DISPLAY[cca3] || w.name.common;
  const aliases = new Set();
  if (!NO_ALIAS.has(w.name.common)) aliases.add(w.name.common);
  aliases.add(name);
  const dem = w.demonyms?.eng?.m; if (dem && !NO_ALIAS.has(dem) && dem.length > 3) aliases.add(dem);
  const cap = w.capital?.[0]; if (cap && !NO_ALIAS.has(cap) && cap.length > 3) aliases.add(cap);
  for (const a of EXTRA[cca3] || []) aliases.add(a);
  for (const n of NO_ALIAS) aliases.delete(n);
  for (const a of [...aliases]) if (DROP_ALIAS.has(a) || a.includes(',')) aliases.delete(a);
  if (cca3 === 'COD') ['Congo', 'Kinshasa', 'Congolese'].forEach((a) => aliases.add(a));
  if (cca3 === 'COG') { aliases.delete('Congolese'); aliases.add('Brazzaville'); }
  if (cca3 === 'DOM') aliases.add('Dominican');
  if (cca3 === 'TUR') aliases.add('Turkey');
  const leaders = list.map(([n, role, kind]) => ({ n, r: role, k: kind }));
  idx.set(cca3, countries.length);
  countries.push({ id: cca3, a2: w.cca2, name, official: w.name.official, region: w.subregion || w.region, lat: w.latlng[0], lng: w.latlng[1], blocs, leaders, alias: [...aliases] });
}
console.log('countries', countries.length);
for (const [k, m] of Object.entries(BLOCS)) for (const id of m) if (!idx.has(id)) console.warn('bloc', k, 'unknown member', id);

// ---- Dot matrix ---------------------------------------------------------
const geo = feature(topo, topo.objects.countries);
const feats = [];
for (const f of geo.features) {
  let cca3 = byCcn3.get(String(f.id).padStart(3, '0'))?.cca3;
  const pname = f.properties?.name;
  if (!cca3 && pname === 'Kosovo') cca3 = 'UNK';
  if (!cca3 && pname === 'Somaliland') cca3 = 'SOM';
  if (!cca3 && pname === 'N. Cyprus') cca3 = 'CYP';
  if (!cca3 && pname === 'Taiwan') cca3 = 'TWN';
  if (cca3 && TERRITORY[cca3]) cca3 = TERRITORY[cca3];
  const i = cca3 != null && idx.has(cca3) ? idx.get(cca3) : -1;
  if (cca3 === 'ATA') continue;
  feats.push({ f, i, b: geoBounds(f) });
}
const STEP = 1.2;
const LAT0 = 83.4, LAT1 = -56.0;
const cols = Math.round(360 / STEP);
const rows = Math.round((LAT0 - LAT1) / STEP) + 1;
const cell = new Int16Array(cols * rows).fill(-2); // -2 ocean, -1 land (unassigned), >=0 country
for (let r = 0; r < rows; r++) {
  const lat = LAT0 - r * STEP;
  for (let c = 0; c < cols; c++) {
    const lng = -180 + STEP / 2 + c * STEP;
    for (const { f, i, b } of feats) {
      const [[x0, y0], [x1, y1]] = b;
      if (lat < y0 - 0.1 || lat > y1 + 0.1) continue;
      if (x0 <= x1 ? (lng < x0 - 0.1 || lng > x1 + 0.1) : (lng < x0 - 0.1 && lng > x1 + 0.1)) continue;
      if (geoContains(f, [lng, lat])) { cell[r * cols + c] = i; break; }
    }
  }
}
// Make sure every country has at least one dot
const has = new Set();
for (const v of cell) if (v >= 0) has.add(v);
let added = 0;
countries.forEach((c, i) => {
  if (has.has(i)) return;
  let col = Math.round((c.lng + 180 - STEP / 2) / STEP), row = Math.round((LAT0 - c.lat) / STEP);
  col = (col + cols) % cols; row = Math.max(0, Math.min(rows - 1, row));
  outer: for (let rad = 0; rad < 4; rad++) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
    const rr = row + dr, cc = (col + dc + cols) % cols; if (rr < 0 || rr >= rows) continue;
    if (cell[rr * cols + cc] === -2) { cell[rr * cols + cc] = i; added++; break outer; }
  }
});
const dots = [];
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const v = cell[r * cols + c]; if (v !== -2) dots.push(c, r, v); }
// centroid in grid coords
const acc = countries.map(() => [0, 0, 0]);
for (let k = 0; k < dots.length; k += 3) { const v = dots[k + 2]; if (v >= 0) { acc[v][0] += dots[k]; acc[v][1] += dots[k + 1]; acc[v][2]++; } }
countries.forEach((c, i) => { const [sx, sy, n] = acc[i]; c.cx = n ? +(sx / n).toFixed(1) : 0; c.cy = n ? +(sy / n).toFixed(1) : 0; c.dots = n; });
console.log('grid', cols, 'x', rows, 'dots', dots.length / 3, 'micro dots added', added);

const blocMeta = Object.fromEntries(Object.entries(BLOCS).map(([k, m]) => [k, m]));
fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/data/world.json'), JSON.stringify({ captured: '2026-11-02', cols, rows, step: STEP, lat0: LAT0, countries, blocs: blocMeta, dots }));
console.log('wrote src/data/world.json', (fs.statSync(path.join(root, 'src/data/world.json')).size / 1024).toFixed(0) + 'KB');
