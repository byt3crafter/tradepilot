// Map JTradePilot trade symbols → Twelve Data symbols.
// Forex/metal/crypto 6-char pairs become AAA/BBB; indices & commodities use
// explicit identifiers; anything else falls through unchanged (e.g. stocks).

const INDEX_MAP: Record<string, string> = {
  NAS100: 'NDX',
  NQ: 'NDX',
  US30: 'DJI',
  US500: 'GSPC',
  SPX500: 'GSPC',
  SP500: 'GSPC',
  DE40: 'GDAXI',
  DAX30: 'GDAXI',
  DAX40: 'GDAXI',
  UK100: 'FTSE',
  JP225: 'N225',
};

const COMMODITY_MAP: Record<string, string> = {
  USOIL: 'WTI/USD',
  WTI: 'WTI/USD',
  UKOIL: 'BRENT/USD',
  BRENT: 'BRENT/USD',
  NATGAS: 'NG/USD',
};

export function mapSymbol(raw: string): string | null {
  if (!raw) return null;
  const s = raw.toUpperCase().replace(/\s+/g, '');
  if (s.includes('/')) return s; // already provider format
  if (INDEX_MAP[s]) return INDEX_MAP[s];
  if (COMMODITY_MAP[s]) return COMMODITY_MAP[s];
  // 6-char forex / metal / crypto pair → AAA/BBB (EURUSD, XAUUSD, BTCUSD…)
  if (/^[A-Z]{6}$/.test(s)) return `${s.slice(0, 3)}/${s.slice(3)}`;
  return s; // stocks / already-valid identifiers
}

// Yahoo Finance fallback for indices (Twelve Data's free tier excludes them).
// Yahoo returns real index levels that roughly track the CFDs traders journal.
const YAHOO_INDEX_MAP: Record<string, string> = {
  NAS100: '^NDX',
  NQ: '^NDX',
  US30: '^DJI',
  SPX500: '^GSPC',
  SP500: '^GSPC',
  US500: '^GSPC',
  DE40: '^GDAXI',
  DAX30: '^GDAXI',
  DAX40: '^GDAXI',
  UK100: '^FTSE',
  JP225: '^N225',
};

export function yahooIndexSymbol(raw: string): string | null {
  if (!raw) return null;
  return YAHOO_INDEX_MAP[raw.toUpperCase().replace(/\s+/g, '')] || null;
}
