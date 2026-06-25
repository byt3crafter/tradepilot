import { mapSymbol } from './symbol-map';

describe('mapSymbol', () => {
  it('inserts a slash into 6-char forex/metal/crypto pairs', () => {
    expect(mapSymbol('EURUSD')).toBe('EUR/USD');
    expect(mapSymbol('XAUUSD')).toBe('XAU/USD');
    expect(mapSymbol('BTCUSD')).toBe('BTC/USD');
    expect(mapSymbol('usdjpy')).toBe('USD/JPY');
  });

  it('maps index aliases to provider identifiers', () => {
    expect(mapSymbol('NAS100')).toBe('NDX');
    expect(mapSymbol('US30')).toBe('DJI');
    expect(mapSymbol('SPX500')).toBe('GSPC');
    expect(mapSymbol('DAX30')).toBe('GDAXI');
  });

  it('maps commodity aliases', () => {
    expect(mapSymbol('USOIL')).toBe('WTI/USD');
  });

  it('passes through already-formatted or unknown symbols', () => {
    expect(mapSymbol('EUR/USD')).toBe('EUR/USD');
    expect(mapSymbol('AAPL')).toBe('AAPL');
  });

  it('handles empty/whitespace input', () => {
    expect(mapSymbol('')).toBeNull();
    expect(mapSymbol(' nas100 ')).toBe('NDX');
  });
});
