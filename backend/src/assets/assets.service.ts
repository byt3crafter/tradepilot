import { Injectable } from '@nestjs/common';

export interface AssetSpecification {
  symbol: string;
  name: string;
  valuePerPoint: number;
  pipSize: number; // The smallest price move (e.g., 0.0001 for EURUSD, 1 for indices)
  lotSize: number; // Number of units in one standard lot
}

@Injectable()
export class AssetsService {
  private specifications: AssetSpecification[] = [
    // Forex Majors
    { symbol: 'EURUSD', name: 'Euro vs US Dollar', valuePerPoint: 10, pipSize: 0.0001, lotSize: 100000 },
    { symbol: 'GBPUSD', name: 'Great British Pound vs US Dollar', valuePerPoint: 10, pipSize: 0.0001, lotSize: 100000 },
    { symbol: 'USDJPY', name: 'US Dollar vs Japanese Yen', valuePerPoint: 10, pipSize: 0.001, lotSize: 100000 },
    { symbol: 'USDCAD', name: 'US Dollar vs Canadian Dollar', valuePerPoint: 10, pipSize: 0.0001, lotSize: 100000 },
    { symbol: 'AUDUSD', name: 'Australian Dollar vs US Dollar', valuePerPoint: 10, pipSize: 0.0001, lotSize: 100000 },
    { symbol: 'NZDUSD', name: 'New Zealand Dollar vs US Dollar', valuePerPoint: 10, pipSize: 0.0001, lotSize: 100000 },
    { symbol: 'USDCHF', name: 'US Dollar vs Swiss Franc', valuePerPoint: 10, pipSize: 0.0001, lotSize: 100000 },

    // Indices
    { symbol: 'US30', name: 'Dow Jones Industrial Average', valuePerPoint: 1, pipSize: 1, lotSize: 1 },
    { symbol: 'SPX500', name: 'S&P 500', valuePerPoint: 1, pipSize: 1, lotSize: 1 },
    { symbol: 'NAS100', name: 'Nasdaq 100', valuePerPoint: 1, pipSize: 1, lotSize: 1 },
    // DE40 value is ~1 EUR per point, converted to USD.
    { symbol: 'DE40', name: 'DAX 40 (Germany)', valuePerPoint: 1.15, pipSize: 1, lotSize: 1 },
    // UK100 value is ~1 GBP per point, converted to USD.
    { symbol: 'UK100', name: 'FTSE 100', valuePerPoint: 1.25, pipSize: 1, lotSize: 1 },

    // Crypto
    { symbol: 'BTCUSD', name: 'Bitcoin vs US Dollar', valuePerPoint: 1, pipSize: 1, lotSize: 1 },
    { symbol: 'ETHUSD', name: 'Ethereum vs US Dollar', valuePerPoint: 1, pipSize: 1, lotSize: 1 },

     // Commodities
    { symbol: 'XAUUSD', name: 'Gold vs US Dollar', valuePerPoint: 1, pipSize: 0.01, lotSize: 100 },
    { symbol: 'XAGUSD', name: 'Silver vs US Dollar', valuePerPoint: 50, pipSize: 0.01, lotSize: 5000 },
    { symbol: 'USOIL', name: 'WTI Crude Oil', valuePerPoint: 10, pipSize: 0.01, lotSize: 1000 },
  ];

  async getSpecifications(): Promise<AssetSpecification[]> {
    return this.specifications;
  }
  
  async findSpecBySymbol(symbol: string): Promise<AssetSpecification | null> {
    const found = this.specifications.find(s => s.symbol.toLowerCase() === symbol.toLowerCase());
    return found || null;
  }
}