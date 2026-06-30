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
    freeMode?: boolean;
  };
  gravatarUrl?: string;
  preferences?: {
    useGravatar?: boolean;
  };
  isLifetimeAccess?: boolean;
  botEnabled?: boolean;
  quantEnabled?: boolean;
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
  realisedR?: number | null;   // computed server-side: realised P&L ÷ account risk unit
  planR?: number | null;       // planned R: stored rr, or derived from entry/SL/TP
  mistakeTags?: string[];      // mistake-tag labels (set when logging/editing)
  confidence?: number | null;  // 1-5 confidence captured at log time
  mae?: number | null;         // max adverse excursion
  mfe?: number | null;         // max favourable excursion
  adherence?: boolean | null;  // derived: all captured pre-trade checklist items checked
  preTradeChecklistState?: any; // captured checklist [{label, checked}]
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
  onlineUsers?: number;
}

export interface SystemConfig {
  id: string;
  isMaintenanceMode: boolean;
  maintenanceMessage?: string | null;
  freeMode?: boolean;
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
  botEnabled?: boolean;
  quantEnabled?: boolean;
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
  consistencyRule?: number | null;
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
  consistencyRule?: number;
  isActive?: boolean;
}

// --- Quant (Polymarket wallet intelligence) ---

export interface PmWallet {
  id: string;
  address: string;
  pseudonym: string;
  profileImage: string;
  pnl: number;
  realizedPnl: number;
  volume: number;
  positionsValue: number;
  tradeCount: number;
  winRate: number;        // 0..1
  edgeScore: number;
  // --- EdgeScore engine (statistical realized edge per share) ---
  edgeLcb: number;        // PRIMARY rank metric: realized edge/share, one-sided 95% lower bound (e.g. 0.049 = ~4.9¢/share)
  meanEdge: number;       // mean realized edge/share
  stdEdge: number;        // std dev of realized edge/share
  nClosed: number;        // closed positions scored
  nEff: number;           // effective clustered sample size
  dollarEdge: number;     // notional-weighted mean edge/share
  qualified: boolean;     // nClosed >= 15 → statistically meaningful
  marketFocus: string;
  lastScanned: string;    // ISO date string
  invested?: number;      // capital deployed ($) — realized positions
  roiPct?: number;        // realized ROI (%) — already a percent, e.g. 12.5 = 12.5%
}

// --- Quant wallet position (for Trade / Mirror prefill) ---

export interface PmPosition {
  tokenId: string;          // CLOB ERC1155 outcome token id (the `tokenID` orders trade)
  outcome: string;          // outcome label, e.g. "Yes" / "No"
  outcomeIndex?: number;    // 0/1 index of the outcome within the market
  curPrice?: number;        // current implied price 0..1
  title?: string;           // market title
  size?: number;            // shares held by the scanned wallet
  avgPrice?: number;        // wallet's average entry price
  conditionId?: string;     // market condition id
  slug?: string;            // market slug
  icon?: string;            // market icon url
}

// --- Quant AI Verdict (ChatGPT-powered) ---

export interface QuantVerdict {
  verdict: 'COPY' | 'WATCH' | 'AVOID';
  edgeType: string;
  copyable: boolean;
  confidence: 'low' | 'medium' | 'high';
  summary: string;
}

// --- Quant AI Opportunity Finder (ChatGPT-powered scan of the leaderboard) ---

export interface AiOpportunity {
  wallet: string;       // display name / pseudonym
  addr: string;         // 0x… address (for Polymarket profile link)
  focus: string;        // market focus chip, e.g. "Politics"
  edge: string;         // human-readable edge description
  copyable: boolean;    // is the edge realistically copyable?
  action: string;       // what to do — the prominent call to action
  why: string;          // the reasoning behind the suggestion
}

// --- Quant AI Strategy Builder (ChatGPT-powered draft strategy) ---

export interface AiStrategy {
  name: string;
  marketType: string;
  entryRules: string[];
  exitRules: string[];
  riskRules: string[];
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
}

// --- Quant live trade feed (terminal ticker tape) ---

export interface QuantFeedItem {
  wallet: string;            // 0x… address
  pseudonym: string;         // display name
  side: 'BUY' | 'SELL';
  size: number;              // share count
  price: number;            // 0..1 implied probability
  usd: number;              // notional in USD
  title: string;             // market title
  outcome: string;           // outcome label (Yes/No/…)
  ts: number;               // UNIX timestamp (seconds or ms)
}

// --- AI Journal Analysis (ChatGPT-powered review of closed trades) ---

export interface AiJournalAnalysis {
  strengths?: string[];
  mistakes?: string[];
  lessons?: string[];
  summary?: string;
  // When the user has no closed trades to analyse, the backend returns a note instead.
  note?: string;
}

// --- AI Agent (autonomous mode: researches with read-only tools, then answers) ---

export interface AiAgentStep {
  tool: string;
  args?: Record<string, unknown>;
}

export interface AiAgentResult {
  answer: string;
  actions?: string[];
  steps: AiAgentStep[];
  raw?: unknown;
}

// --- AI Agent management (tools / skills + run audit log) ---

export interface AgentTool {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  builtin: boolean;
  enabled: boolean;
  kind: 'builtin' | 'http';
  httpMethod?: 'GET' | 'POST' | null;
  httpUrl?: string | null;
  createdAt: string;
}

export interface AgentRunStep {
  tool: string;
  args?: unknown;
  result?: unknown;
  ts?: string | number;
}

export interface AgentRun {
  id: string;
  goal: string;
  answer: string;
  status: 'done' | 'error' | 'limit';
  steps: AgentRunStep[];
  durationMs: number;
  createdAt: string;
}

export type ScheduledAgentFrequency = '15m' | 'hourly' | '6h' | 'daily';

export interface ScheduledAgent {
  id: string;
  name: string;
  goal: string;
  frequency: ScheduledAgentFrequency;
  enabled: boolean;
  lastRunAt: string | null;
  lastRunId: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

// --- Polymarket Market Browser ---

export interface PolymarketOutcome {
  label: string;     // e.g. "Yes", "No", "Trump", "Harris"
  tokenId: string;   // CLOB ERC1155 outcome token id
  price: number;     // implied probability 0..1 (e.g. 0.62 = 62¢)
}

export interface PolymarketMarket {
  question: string;             // full market question text
  slug: string;                 // URL slug
  conditionId: string;          // market condition id (unique key)
  image?: string;               // optional market icon / image URL
  category?: string;            // e.g. "Politics", "Crypto", "Economics"
  endDate?: string;             // ISO date when market closes
  volume?: number;              // total traded volume in USD
  outcomes: PolymarketOutcome[];
}

// --- Quant Learning (predictions vs outcomes) ---

export interface QuantLearningWallet {
  address: string;
  n: number;
  winRate: number;   // 0..1
  avgRoi: number;    // percent, e.g. 12.5 = 12.5%
  verdict: 'validated' | 'disabled' | 'watch' | 'learning';
}

export interface QuantLearning {
  overall: {
    resolved: number;
    pending: number;
    winRate: number;   // 0..1
    avgRoi: number;    // percent, e.g. 12.5 = 12.5%
  };
  wallets: QuantLearningWallet[];
}

export interface QuantDecision {
  id: string;
  createdAt: string;
  wallet: string;
  /** Human-readable wallet alias, e.g. "Alpha-7" */
  pseudonym?: string | null;
  market: string;
  prediction: string;
  /** What the engine called, e.g. "Yes" / "No" */
  outcomeLabel: string;
  /** Entry price in cents (0-100) */
  entryPrice: number;
  title: string;
  /** Direction: "BUY" | "SELL" or whatever the backend emits */
  side?: string | null;
  /** Topic/thematic focus of this wallet, e.g. "Crypto" */
  focus?: string | null;
  status: 'win' | 'loss' | 'pending';
  roiPct: number | null;
  resolvedAt: string | null;
  /** Decision mode: 'ai_judgment' for AI-sourced bets, undefined/null for wallet copy */
  mode?: string | null;
  /** AI's estimated true probability (0–1) — present when mode='ai_judgment' */
  aiTrueProb?: number | null;
  /** AI's reasoning for this bet — present when mode='ai_judgment' */
  rationale?: string | null;
}

// --- Quant Simulation ---

export interface QuantSimulationPoint {
  t: number;       // ms epoch
  balance: number;
}

export interface QuantSimulation {
  startBalance: number;
  finalBalance: number;
  returnPct: number;
  nTrades: number;
  winRate: number;         // 0..1
  maxDrawdownPct: number;
  riskFraction: number;
  curve: QuantSimulationPoint[];
  /** Which dataset the backend used: 'live' = out-of-sample forward signals, 'historical' = in-sample hindsight */
  sample?: 'live' | 'historical';
  /** Human-readable explanation from the backend about this result */
  note?: string;
}

// --- Quant Arbitrage Scanner ---

export interface ArbLeg {
  title: string;
  yesPrice: number;   // 0..1 implied probability
  tokenId: string;
}

export interface CrossMarketArb {
  type: 'cross';
  event: string;      // event/group title
  slug: string;
  nOutcomes: number;
  sumYes: number;     // sum of all yes prices (cents, e.g. 95 = 95¢ total = 5¢ edge)
  edgePct: number;    // edge as a percent, e.g. 5.2
  legs: ArbLeg[];
}

export interface SettlementLagArb {
  type: 'lag';
  title: string;      // market title
  slug: string;
  outcome: string;    // outcome label, e.g. "Yes"
  price: number;      // 0..1 current market price
  tokenId: string;
  edgePct: number;    // edge as a percent
  endsAt: string;     // ISO datetime of market close
}

export interface ArbScan {
  crossMarket: CrossMarketArb[];
  settlementLag: SettlementLagArb[];
  scannedAt: string;  // ISO datetime
}

// --- Quant Signals ("what to buy now") ---

export interface QuantSignal {
  type: 'ai' | 'arb';
  title: string;           // market title
  action: 'BUY';
  outcome: string;         // outcome label, e.g. "Yes"
  priceCents: number;      // market price in cents, e.g. 50
  edgePct: number;         // edge as a percent, e.g. 12.4
  detail: string;          // short chip text, e.g. "AI 92% vs crowd 50%"
  confidence?: number;     // 0..1, present for AI signals
  reason: string;          // 1–2 sentence explanation
  tokenId: string | null;  // null if not directly tradeable
  price: number;           // 0..1 implied price (for trade prefill)
  conditionId?: string;
}

export interface QuantSignalsResult {
  signals: QuantSignal[];
  generatedAt: string;     // ISO datetime
}

// --- Auto Bot ---

export interface AutobotStatus {
  address: string;
  mode: 'off' | 'auto';
  killSwitch: boolean;
  balance: { usdce: number; pol: number };
  limits: { maxTotalUsd: number; maxPerTradeUsd: number; dailyLossLimitUsd: number; minEdgePct?: number };
  daily: { spentUsd: number; pnlUsd: number };
  exposureUsd: number;
  stats: {
    trades: number;
    resolved: number;
    wins: number;
    winRate: number;
    realizedPnlUsd: number;
  };
  /** Polymarket proxy/deposit wallet linked to this bot (CLOB V2 requires it). */
  funderAddress?: string | null;
  /** True when funderAddress is set and the bot can place real orders. */
  linked?: boolean;
  /**
   * The REAL trading bankroll — Polymarket internal collateral when a deposit
   * wallet is linked; falls back to the EOA USDC.e balance when unlinked.
   */
  tradeableUsdce?: number;
  /** Cash free to deploy right now (tradeableUsdce − exposureUsd). */
  availableUsd?: number;
}

export type AutobotTradeStatus = 'pending' | 'placed' | 'filled' | 'failed' | 'resolved' | 'unfilled';

export interface AutobotTrade {
  id: string;
  createdAt: string;
  market: string;
  tokenId: string;
  outcome: string;
  title: string;
  side: string;
  sizeUsd: number;
  price: number;
  signalType: string;
  status: AutobotTradeStatus;
  error?: string | null;
  roiPct?: number | null;
  pnlUsd?: number | null;
  resolvedAt?: string | null;
  reason?: string | null;
  edgePct?: number | null;
  detail?: string | null;
}

export interface AutobotPerformance {
  stats: {
    trades: number;
    open: number;
    resolved: number;
    wins: number;
    losses: number;
    winRate: number;       // 0..1
    realizedPnlUsd: number;
    maxDrawdownUsd: number;
    walletUsdce: number;
    openExposureUsd: number;
  };
  curve: { t: number; pnl: number }[]; // t = ms epoch, pnl = cumulative realized P&L
}

// --- Notebook ---

export interface NotebookEntry {
  id: string;
  date: string;        // ISO date string, e.g. "2026-06-25"
  title: string | null;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// --- Crypto / Exchange ---

export interface CryptoFundingOpp {
  symbol: string;
  base: string;
  fundingPct8h: number;
  annualizedPct: number;
  netAnnualPct: number;
  markPrice: number;
  volume24hUsd: number;
  action: string;
  side: string;
}

export interface CryptoFundingScan {
  exchange: string;
  count: number;
  scannedAt: string;
  opportunities: CryptoFundingOpp[];
}

export type ExchangeStatusMap = Record<string, {
  configured: boolean;
  testnet: boolean;
  keyMask?: string;
}>;

export interface CryptoPerformance {
  strategy: string;
  stats: {
    open: number;
    resolved: number;
    wins: number;
    losses: number;
    winRate: number;          // 0..1
    realizedPnlUsd: number;
    openPnlUsd: number;
    avgRealizedYieldPct: number;
  };
  curve: { t: number; pnl: number }[];
  byBand: { band: string; n: number; realizedYieldPct: number }[];
}

export interface CryptoPaperTrade {
  id: string;
  exchange: string;
  strategy: string;
  symbol: string;
  base: string;
  sizeUsd: number;
  entryFundingPct: number;
  status: 'open' | 'closed';
  pnlUsd: number;
  feesUsd: number;
  openedAt: string;
  closedAt?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface CryptoMomentumCandidate {
  symbol: string;
  base: string;
  last: number;
  changePct: number;
  rangePct: number;
  volUsd: number;
  score: number;
}

export interface CryptoMomentum {
  exchange: string;
  count: number;
  scannedAt: string;
  candidates: CryptoMomentumCandidate[];
}

export interface CryptoVolatilityMover {
  symbol: string;
  base: string;
  last: number;
  changePct: number;
  rangePct: number;
  volUsd: number;
  volRegime: 'high' | 'normal' | 'low';
}

export interface CryptoVolatility {
  exchange: string;
  marketMedianRangePct: number;
  highVolMarket: boolean;
  scannedAt: string;
  movers: CryptoVolatilityMover[];
}

// ─── Crypto Bot (live exchange execution) ─────────────────────────────────────

export interface CryptoBotStatus {
  exchange: string;
  mode: 'off' | 'auto';
  strategy: string;
  killSwitch: boolean;
  limits: { maxPerTradeUsd: number; maxTotalUsd: number };
  exposureUsd: number;
  balances: { asset: string; free: number }[] | null;
  stats: {
    open: number;
    resolved: number;
    wins: number;
    losses: number;
    winRate: number;       // 0..1
    realizedPnlUsd: number;
  };
}

export interface CryptoBotTrade {
  id: string;
  symbol: string;
  base: string;
  side: string;
  sizeUsd: number;
  entryPrice: number;
  qty: number;
  status: 'open' | 'closed' | 'failed';
  target?: number | null;
  stop?: number | null;
  pnlUsd?: number | null;
  exitReason?: string | null;
  error?: string | null;
  openedAt: string;
  closedAt?: string | null;
  meta?: Record<string, unknown> | null;
}

export interface CryptoBotPerformance {
  exchange: string;
  curve: { t: number; pnl: number }[];
}