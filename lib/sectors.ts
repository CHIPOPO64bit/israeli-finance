export type SectorKey =
  | 'tech'
  | 'security'
  | 'semis'
  | 'pharma'
  | 'defense'
  | 'energy'
  | 'banking'
  | 'insurance'
  | 'realestate'
  | 'telecom'
  | 'industrial'
  | 'retail'
  | 'shipping'
  | 'fintech';

export type Sector = {
  key: SectorKey;
  en: string;
  he: string;
  glyph: string;
  hue: string;
};

export const SECTORS: Sector[] = [
  { key: 'tech',       en: 'Software & Internet',      he: 'תוכנה ואינטרנט',     glyph: '◐', hue: '#4d8ffd' },
  { key: 'security',   en: 'Cybersecurity',             he: 'סייבר',              glyph: '◇', hue: '#9b6dff' },
  { key: 'semis',      en: 'Semiconductors',            he: 'מוליכים למחצה',      glyph: '▢', hue: '#5ce1c0' },
  { key: 'pharma',     en: 'Pharma & Biotech',          he: 'תרופות וביוטק',      glyph: '◌', hue: '#ff8c61' },
  { key: 'defense',    en: 'Defense & Aerospace',       he: 'ביטחון ותעופה',      glyph: '✕', hue: '#d4a574' },
  { key: 'energy',     en: 'Energy & Materials',        he: 'אנרגיה וחומרי גלם',  glyph: '◉', hue: '#f5c34d' },
  { key: 'banking',    en: 'Banking',                   he: 'בנקאות',             glyph: '◫', hue: '#4ecdc4' },
  { key: 'insurance',  en: 'Insurance',                 he: 'ביטוח',              glyph: '◊', hue: '#a8d8b9' },
  { key: 'realestate', en: 'Real Estate',               he: 'נדל"ן',              glyph: '▤', hue: '#e89cae' },
  { key: 'telecom',    en: 'Telecom',                   he: 'תקשורת',             glyph: '◖', hue: '#7dd3fc' },
  { key: 'industrial', en: 'Industrials',               he: 'תעשייה',             glyph: '◮', hue: '#c4b5a0' },
  { key: 'retail',     en: 'Consumer & Retail',         he: 'צריכה וקמעונאות',    glyph: '◓', hue: '#fbb1d0' },
  { key: 'shipping',   en: 'Shipping & Logistics',      he: 'ספנות ולוגיסטיקה',   glyph: '⬡', hue: '#94a3b8' },
  { key: 'fintech',    en: 'Fintech & Markets',         he: 'פינטק ושווקים',      glyph: '◐', hue: '#fbbf24' },
];

export const SECTOR_BY_KEY: Record<SectorKey, Sector> =
  Object.fromEntries(SECTORS.map(s => [s.key, s])) as Record<SectorKey, Sector>;
