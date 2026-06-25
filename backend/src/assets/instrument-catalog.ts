// Built-in instrument catalog — lets the app auto-resolve contract specs for
// common symbols WITHOUT the user manually configuring them. Used as a fallback
// in calculations when a user has no AssetSpecification override for a symbol.
export interface InstrumentSpec {
  symbol: string;
  name: string;
  pipSize: number;
  lotSize: number;
  valuePerPoint: number;
}

const C: InstrumentSpec[] = [
  // Forex majors
  { symbol: 'EURUSD', name: 'Euro vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'GBPUSD', name: 'Great British Pound vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'USDJPY', name: 'US Dollar vs Japanese Yen', pipSize: 0.01, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'USDCAD', name: 'US Dollar vs Canadian Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'AUDUSD', name: 'Australian Dollar vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'USDCHF', name: 'US Dollar vs Swiss Franc', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'EURJPY', name: 'Euro vs Japanese Yen', pipSize: 0.01, lotSize: 100000, valuePerPoint: 10 },
  { symbol: 'GBPJPY', name: 'Great British Pound vs Japanese Yen', pipSize: 0.01, lotSize: 100000, valuePerPoint: 10 },
  // Indices
  { symbol: 'US30', name: 'Dow Jones Industrial Average', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  { symbol: 'SPX500', name: 'S&P 500', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  { symbol: 'NAS100', name: 'Nasdaq 100', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  { symbol: 'NQ', name: 'Nasdaq 100 Futures', pipSize: 0.25, lotSize: 1, valuePerPoint: 20 },
  { symbol: 'DE40', name: 'DAX 40 (Germany)', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  { symbol: 'DAX30', name: "Germany's DAX Index", pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  { symbol: 'UK100', name: 'FTSE 100', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  // Crypto
  { symbol: 'BTCUSD', name: 'Bitcoin vs US Dollar', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  { symbol: 'ETHUSD', name: 'Ethereum vs US Dollar', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
  // Metals & energy
  { symbol: 'XAUUSD', name: 'Gold vs US Dollar', pipSize: 0.01, lotSize: 100, valuePerPoint: 10 },
  { symbol: 'XAGUSD', name: 'Silver vs US Dollar', pipSize: 0.001, lotSize: 5000, valuePerPoint: 50 },
  { symbol: 'USOIL', name: 'WTI Crude Oil', pipSize: 0.01, lotSize: 1000, valuePerPoint: 10 },
];

export const INSTRUMENT_CATALOG: Record<string, InstrumentSpec> = Object.fromEntries(
  C.map((i) => [i.symbol, i]),
);

const FALLBACK: InstrumentSpec = { symbol: '', name: '', pipSize: 1, lotSize: 1, valuePerPoint: 1 };

/** Resolve a symbol's contract spec: user override > catalog > sane default. */
export function resolveInstrument(
  symbol: string,
  override?: Partial<InstrumentSpec> | null,
): InstrumentSpec {
  const key = (symbol || '').toUpperCase();
  const base = INSTRUMENT_CATALOG[key] || { ...FALLBACK, symbol: key, name: key };
  return { ...base, ...(override || {}), symbol: key };
}
