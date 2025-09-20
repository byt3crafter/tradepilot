export interface User {
  id: string;
  email: string;
  fullName: string;
  isEmailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export enum BrokerAccountType {
  DEMO = 'DEMO',
  LIVE = 'LIVE',
  PROP_FIRM = 'PROP_FIRM',
}

export interface BrokerAccount {
  id: string;
  name: string;
  type: BrokerAccountType;
  initialBalance: number;
  currentBalance: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}


export enum TradeResult {
  Win = 'Win',
  Loss = 'Loss',
  Breakeven = 'Breakeven',
}

export type Direction = 'Buy' | 'Sell';

export interface AiAnalysis {
  summary: string;
  mistakes: { mistake: string; reasoning: string }[];
  goodPoints: { point: string; reasoning: string }[];
}


export interface Trade {
  id: string;
  tradeDate: string;
  asset: string;
  direction: Direction;
  entryPrice: number;
  exitPrice?: number | null;
  riskPercentage: number;
  rr?: number | null;
  profitLoss?: number | null;
  result?: TradeResult | null;
  notes?: string | null;
  isPendingOrder: boolean;
  
  screenshotBeforeUrl?: string | null;
  screenshotAfterUrl?: string | null;
  aiAnalysis?: AiAnalysis | null;

  userId: string;
  brokerAccountId: string;
  strategyId: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface Strategy {
  id: string;
  name: string;
  description?: string;
}

export interface ChecklistRule {
  id: string;
  rule: string;
}