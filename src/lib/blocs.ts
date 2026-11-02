export type BlocCode =
  | 'NATO' | 'BRICS' | 'EU' | 'G7' | 'G20' | 'P5' | 'NUKE' | 'CRINK' | 'SCO'
  | 'OPEC' | 'GCC' | 'ASEAN' | 'AUKUS' | 'QUAD' | 'FVEY' | 'ARAB' | 'AES';

export interface BlocMeta {
  code: BlocCode;
  label: string;   // short label shown on chips
  name: string;    // full name
  ticker: string;  // suggested ticker
  color: string;
  line: string;    // one-line description
}

export const BLOC_META: BlocMeta[] = [
  { code: 'NATO', label: 'NATO', name: 'North Atlantic Treaty Organization', ticker: 'NATO', color: '#4d8dff', line: 'Military alliance, founded 1949. An attack on one is an attack on all.' },
  { code: 'BRICS', label: 'BRICS', name: 'BRICS', ticker: 'BRICS', color: '#e6a23c', line: 'Emerging-economy bloc, expanded from five founders to eleven members.' },
  { code: 'CRINK', label: 'CRINK', name: 'China · Russia · Iran · North Korea', ticker: 'CRINK', color: '#c084fc', line: 'Media shorthand for the four states aligned against the US-led order.' },
  { code: 'NUKE', label: 'Nuclear 9', name: 'Nuclear-armed states', ticker: 'NUKES', color: '#a3e635', line: 'The nine states believed to hold nuclear weapons. Israel has never declared.' },
  { code: 'P5', label: 'P5', name: 'UN Security Council · permanent five', ticker: 'P5', color: '#f472b6', line: 'Five permanent seats, five vetoes.' },
  { code: 'G7', label: 'G7', name: 'Group of Seven', ticker: 'G7', color: '#a8b0bd', line: 'Seven large advanced economies, meeting yearly since 1975.' },
  { code: 'G20', label: 'G20', name: 'Group of Twenty', ticker: 'G20', color: '#2dd4bf', line: 'Nineteen countries plus the EU and the African Union.' },
  { code: 'EU', label: 'EU', name: 'European Union', ticker: 'EU', color: '#8b7cff', line: 'Political and economic union of 27 European states.' },
  { code: 'SCO', label: 'SCO', name: 'Shanghai Cooperation Organisation', ticker: 'SCO', color: '#fb923c', line: 'Eurasian security and economic organisation led by China and Russia.' },
  { code: 'OPEC', label: 'OPEC', name: 'Organization of the Petroleum Exporting Countries', ticker: 'OPEC', color: '#22c55e', line: 'Oil cartel founded in Baghdad in 1960. The UAE left in May 2026.' },
  { code: 'GCC', label: 'GCC', name: 'Gulf Cooperation Council', ticker: 'GCC', color: '#34d399', line: 'Six Gulf monarchies on the Arabian Peninsula.' },
  { code: 'ARAB', label: 'Arab League', name: 'League of Arab States', ticker: 'ARAB', color: '#4ade80', line: 'Regional organisation of 22 Arab states.' },
  { code: 'ASEAN', label: 'ASEAN', name: 'Association of Southeast Asian Nations', ticker: 'ASEAN', color: '#38bdf8', line: 'Eleven Southeast Asian states. Timor-Leste joined in 2025.' },
  { code: 'AUKUS', label: 'AUKUS', name: 'Australia · United Kingdom · United States', ticker: 'AUKUS', color: '#60a5fa', line: 'Security pact built around nuclear-powered submarines.' },
  { code: 'QUAD', label: 'Quad', name: 'Quadrilateral Security Dialogue', ticker: 'QUAD', color: '#22d3ee', line: 'The US, Japan, India and Australia, focused on the Indo-Pacific.' },
  { code: 'FVEY', label: 'Five Eyes', name: 'Five Eyes', ticker: 'FVEY', color: '#94a3b8', line: 'Intelligence-sharing alliance of five English-speaking states.' },
  { code: 'AES', label: 'AES', name: 'Alliance of Sahel States', ticker: 'SAHEL', color: '#f97316', line: 'Mali, Burkina Faso and Niger, after leaving ECOWAS.' },
];

export const BLOC_BY_CODE = Object.fromEntries(BLOC_META.map((b) => [b.code, b])) as Record<BlocCode, BlocMeta>;

export const ALIGN = {
  NATO: '#4d8dff',
  BRICS: '#e6a23c',
  NONE: '#35503e',
};
