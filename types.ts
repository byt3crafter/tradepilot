export type AuthPage = 'login' | 'signup';

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
  featureFlags?: {
    analysisTrackerEnabled?: boolean;
  };
  gravatarUrl?: string;
  preferences?: {
    useGravatar?: boolean;
  };
}

export enum BrokerAccountType {
  DEMO = 'DEMO',
  LIVE = 'LIVE',
  PROP_FIRM = 'PROP_FIRM',
}

export enum FeeModel {
  SPREAD_ONLY = 'SPREAD_ONLY',
  COMMISSION_ONLY = 'COMMISSION_ONLY',
  COMMISSION_AND_SWAP = 'COMMISSION_AND_SWAP',
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
  severity: 'SOFT' | 'HARD';
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
  feeModel: FeeModel;
  userId: string;
  templateId?: string | null;
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

export enum Direction {
  Buy = 'Buy',
  Sell = 'Sell',
}

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
  pips?: number | null;

  screenshotBeforeUrl?: string | null;
  screenshotAfterUrl?: string | null;
  aiAnalysis?: AiAnalysis | null;
  tradeJournal?: TradeJournal | null;

  userId: string;
  brokerAccountId: string;
  playbookId: string;
  playbookSetupId?: string | null;

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
  EXIT_RULES = 'EXIT_RULES',
  CONFIRMATION_FILTERS = 'CONFIRMATION_FILTERS',
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
  exitRules: ChecklistItem[];
  confirmationFilters: ChecklistItem[];
  riskSettings?: any;
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
  authorId: string;
  setups: PlaybookSetup[];
  winRate?: number;
  tradeCount?: number;
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
  riskRewardRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  largestDailyLoss: number;
  recoveryFactor: number;
  tradesPerDay: string | number;
  maxConsecutiveProfitableDays: number;
  currentStreak: number;
  avgHoldTimeHours: number;
  equityCurve: EquityDataPoint[];
  setups?: {
    setupId: string;
    setupName: string;
    winRate: number;
    totalTrades: number;
    netPL: number;
  }[];
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
  role: 'USER' | 'ADMIN';
  createdAt: string;
  lastLoginAt: string | null;
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  trialEndsAt: string | null;
  proAccessExpiresAt?: string | null;
  proAccessReason?: string | null;
  apiUsageCost: number;
  apiUsageTokens: number;
  lastApiUsage: string | null;
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
  format?: 'currency' | 'days';
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

// --- NEW: Bulk Importer Types ---
export interface ParsedTradeData {
  asset: string;
  direction: Direction;
  entryDate: string; // ISO string
  exitDate: string; // ISO string
  entryPrice: number;
  exitPrice: number;
  lotSize: number | null;
  profitLoss: number | null;
}

// --- NEW: Advanced Analytics Types ---
export interface PerformanceByAsset {
  symbol: string;
  totalTrades: number;
  netPL: number;
  winRate: number;
  totalPips: number;
}
export interface PerformanceByTime {
  key: string; // e.g., 'Monday' or '09' (for 9 AM)
  netPL: number;
  totalTrades: number;
}

export interface AccountAnalytics {
  largestWinningTrade: number;
  largestLosingTrade: number;
  totalPips: number;
  averagePips: number;
  averageTradeDurationMinutes: number;
  performanceByAsset: PerformanceByAsset[];
  performanceByDayOfWeek: PerformanceByTime[];
  performanceByHourOfDay: PerformanceByTime[];
  winRate?: number;
  profitFactor?: number;
  expectancy?: number;
  currentStreak?: number;
  totalTrades?: number;
  netProfit?: number;
}

// --- NEW: ANALYSIS TRACKER ---

export enum IncomeCategory {
  ACTIVE_INCOME = 'ACTIVE_INCOME',
  DAILY_INCOME = 'DAILY_INCOME',
  WEEKLY_INCOME = 'WEEKLY_INCOME',
  MONTHLY_INCOME = 'MONTHLY_INCOME',
  LONG_TERM_INCOME = 'LONG_TERM_INCOME',
}

export enum AssetClass {
  FOREX = 'FOREX',
  INDEX = 'INDEX',
  METAL = 'METAL',
  CRYPTO = 'CRYPTO',
  EQUITY = 'EQUITY',
  ENERGY = 'ENERGY',
}

export enum MarketVenue {
  SPOT = 'SPOT',
  CFD = 'CFD',
  FUTURES = 'FUTURES',
  PERP = 'PERP',
  OPTIONS = 'OPTIONS',
}

export enum InstrumentSubtype {
  FOREX_PAIR = 'FOREX_PAIR',
  INDEX_CFD = 'INDEX_CFD',
  METAL_CFD = 'METAL_CFD',
  METAL_FUT = 'METAL_FUT',
  CRYPTO_SPOT = 'CRYPTO_SPOT',
  CRYPTO_PERP = 'CRYPTO_PERP',
  INDEX_FUT = 'INDEX_FUT',
  EQUITY_CFD = 'EQUITY_CFD',
  EQUITY_SPOT = 'EQUITY_SPOT',
}

export enum ReviewCycle {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
}

export enum AnalysisStatus {
  WATCHING = 'WATCHING',
  ALERTED = 'ALERTED',
  TRIGGERED = 'TRIGGERED',
  EXECUTED = 'EXECUTED',
  MISSED = 'MISSED',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

export interface Analysis {
  id: string;
  createdAt: string;
  updatedAt: string;
  screenshotUrls: string[];

  // Classification
  category: IncomeCategory;
  assetClass: AssetClass;
  marketVenue: MarketVenue;
  instrumentSubtype?: InstrumentSubtype | null;
  contract?: any | null; // JSON
  leverage?: number | null;

  // Context
  symbol: string;
  assetName?: string | null;
  exchange?: string | null;
  quote?: any | null; // JSON
  brokerId: string;

  // Platforms
  platforms?: any | null; // JSON

  // Analysis Details
  htf?: string | null; // Higher Time Frame
  ltf: string[]; // Lower Time Frames
  directionalBias: Direction;
  structureNotes?: string | null; // Markdown
  levels?: any | null; // JSON
  triggers?: any | null; // JSON

  // Invalidation & Validity
  invalidation?: any | null; // JSON
  validityStartsAt?: string | null;
  validityExpiresAt?: string | null;

  // Review & Status
  reviewCycle: ReviewCycle;
  nextReviewAt: string;
  status: AnalysisStatus;

  // Meta & Threading
  tags: string[];
  revision: number;
  parentAnalysisId?: string | null;

  // Relations
  userId: string;
  sessionId?: string | null;
}

export interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
  analysisId?: string | null;
}

// Prop Firm Template Types
export enum DrawdownType {
  TRAILING = 'TRAILING',
  STATIC = 'STATIC',
}

export interface PropFirmTemplate {
  id: string;
  name: string;
  firmName: string;
  accountSize: number;
  profitTarget: number;
  dailyDrawdown: number;
  maxDrawdown: number;
  drawdownType: DrawdownType;
  minTradingDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePropFirmTemplateDto {
  name: string;
  firmName: string;
  accountSize: number;
  profitTarget: number;
  dailyDrawdown: number;
  maxDrawdown: number;
  drawdownType: 'TRAILING' | 'STATIC';
  minTradingDays: number;
  isActive?: boolean;
}