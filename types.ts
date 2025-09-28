export interface User {
  id: string;
  email: string;
  fullName: string;
  isEmailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
  role: 'USER' | 'ADMIN';
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  trialEndsAt: string | null;
  proAccessExpiresAt?: string | null;
}

export enum BrokerAccountType {
  DEMO = 'DEMO',
  LIVE = 'LIVE',
  PROP_FIRM = 'PROP_FIRM',
}

export interface TradingObjective {
  id: string;
  profitTarget?: number | null;
  minTradingDays?: number | null;
  maxLoss?: number | null;
  maxDailyLoss?: number | null;
  isEnabled: boolean;
}

export interface SmartLimit {
  id: string;
  isEnabled: boolean;
  maxRiskPerTrade?: number | null;
  maxTradesPerDay?: number | null;
  maxLossesPerDay?: number | null;
}

export interface BrokerAccount {
  id: string;
  name: string;
  type: BrokerAccountType;
  initialBalance: number;
  currentBalance: number;
  currency: string;
  leverage?: number | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  objectives?: TradingObjective | null;
  smartLimits?: SmartLimit | null;
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

export interface TradeJournal {
  id: string;
  mindsetBefore: string;
  exitReasoning: string;
  lessonsLearned: string;
  tradeId: string;
}

export type TradeStatus = 'LIVE' | 'PENDING' | 'CLOSED';

export interface Trade {
  id: string;
  entryDate: string;
  exitDate?: string | null;
  asset: string;
  direction: Direction;
  entryPrice: number;
  exitPrice?: number | null;
  riskPercentage: number;
  rr?: number | null;
  profitLoss?: number | null;
  result?: TradeResult | null;
  isPendingOrder: boolean;
  
  // Execution details
  lotSize?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  commission?: number | null;
  swap?: number | null;

  screenshotBeforeUrl?: string | null;
  screenshotAfterUrl?: string | null;
  aiAnalysis?: AiAnalysis | null;
  tradeJournal?: TradeJournal | null;

  userId: string;
  brokerAccountId: string;
  playbookId: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface Candle {
  time: number; // UNIX timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

// --- NEW: Playbook data structure ---

export enum ChecklistItemType {
  ENTRY_CRITERIA = 'ENTRY_CRITERIA',
  RISK_MANAGEMENT = 'RISK_MANAGEMENT',
}

export interface ChecklistItem {
  id: string;
  text: string;
  type: ChecklistItemType;
}

export interface PlaybookSetup {
  id: string;
  name: string;
  screenshotBeforeUrl?: string | null;
  screenshotAfterUrl?: string | null;
  entryCriteria: ChecklistItem[];
  riskManagement: ChecklistItem[];
}

export interface Playbook {
  id: string;
  name: string;
  coreIdea?: string | null;
  isPublic: boolean;
  tradingStyles: string[];
  instruments: string[];
  timeframes: string[];
  pros: string[];
  cons: string[];
  userId: string;
  setups: PlaybookSetup[];
}

// Sanitized version for community viewing
export interface CommunityPlaybook {
  id: string;
  name: string;
  coreIdea?: string | null;
  tradingStyles: string[];
  instruments: string[];
  timeframes: string[];
  pros: string[];
  cons: string[];
  authorName: string;
  setups: PlaybookSetup[];
}

// --- NEW: Playbook Analytics ---

export interface EquityDataPoint {
  date: string;
  cumulativePL: number;
}

export interface PlaybookStats {
  netPL: number;
  totalTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  avgHoldTimeHours: number;
  equityCurve: EquityDataPoint[];
}


export interface ChecklistRule {
  id: string;
  rule: string;
}

// Admin Panel Types
export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  trialUsers: number;
  mrr: number;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
  lastLoginAt: string | null;
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  trialEndsAt: string | null;
  proAccessExpiresAt?: string | null;
  proAccessReason?: string | null;
}

// Trading Objectives Progress Type
export interface ObjectiveProgress {
  key: 'profitTarget' | 'minTradingDays' | 'maxLoss' | 'maxDailyLoss';
  title: string;
  currentValue: number;
  targetValue: number;
  remaining?: number;
  status: 'Success' | 'In Progress' | 'Failed';
  type: 'progress' | 'simple';
}

// Smart Limits Progress Type
export interface SmartLimitProgress {
  tradesToday: number;
  lossesToday: number;
  maxTradesPerDay?: number | null;
  maxLossesPerDay?: number | null;
  isTradeCreationBlocked: boolean;
  blockReason: string | null;
}

export interface AssetSpecification {
  id: string;
  symbol: string;
  name: string;
  pipSize?: number | null;
  lotSize?: number | null;
  valuePerPoint?: number | null;
}

// --- NEW: AI Pre-Trade Check ---
export interface PreTradeCheckItem {
  rule: string;
  met: 'Yes' | 'No' | 'Indeterminate';
  reasoning: string;
}
export type PreTradeCheckResult = PreTradeCheckItem[];

// --- NEW: AI Chart Analysis ---
export interface AnalyzeChartResult {
  asset: string | null;
  direction: 'Buy' | 'Sell' | null;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  entryDate: string | null;
  lotSize: number | null;
  commission: number | null;
  swap: number | null;
  exitPrice: number | null;
  exitDate: string | null;
  profitLoss: number | null;
}