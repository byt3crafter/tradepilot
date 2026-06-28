
import { AdminStats, AdminUser, BrokerAccount, Candle, ChecklistRule, ObjectiveProgress, SmartLimitProgress, Playbook, Trade, TradeJournal, PlaybookStats, AssetSpecification, CommunityPlaybook, AccountAnalytics, Notification, SystemConfig, User, NotebookEntry, PmWallet, PmPosition, QuantVerdict, QuantFeedItem, QuantLearning, QuantDecision, QuantSimulation, AiJournalAnalysis, AiAgentResult, AgentTool, AgentRun, ScheduledAgent, ScheduledAgentFrequency, PolymarketMarket, ArbScan } from "../types";

export interface CandlesResult {
  symbol: string;
  mappedSymbol: string;
  candles: Candle[];
  note?: string;
}

const getApiUrl = () => (window as any).APP_CONFIG?.API_URL || 'http://localhost:8080';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Re-export interface for component usage if needed
export interface ApiService {
  get<T>(endpoint: string, token?: string | null): Promise<T>;
  post<T>(endpoint: string, body: any, token?: string | null): Promise<T>;
  patch<T>(endpoint: string, body: any, token?: string | null): Promise<T>;
  delete<T>(endpoint: string, token?: string | null): Promise<T>;

  // Accounts
  getAccounts(token: string): Promise<BrokerAccount[]>;
  createAccount(data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount>;
  updateAccount(id: string, data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount>;
  deleteAccount(id: string, token: string): Promise<{ message: string }>;
  getObjectivesProgress(id: string, token: string): Promise<ObjectiveProgress[]>;
  getSmartLimitsProgress(id: string, token: string): Promise<SmartLimitProgress>;
  getWeeklyDebrief(accountId: string, token: string): Promise<{ debrief: string }>;
  getDailyDebrief(accountId: string, token: string): Promise<{ debrief: string }>;
  getDrawdownCalculation(token: string, accountId: string): Promise<any>;
  getAnalytics(accountId: string, token: string, params?: { startDate?: string; endDate?: string }): Promise<AccountAnalytics>;

  // Playbooks
  getPlaybooks(token: string): Promise<Playbook[]>;
  getCommunityPlaybooks(token: string): Promise<CommunityPlaybook[]>;
  createPlaybook(data: Partial<Playbook>, token: string): Promise<Playbook>;
  updatePlaybook(id: string, data: Partial<Playbook>, token: string): Promise<Playbook>;
  deletePlaybook(id: string, token: string): Promise<{ message: string }>;
  getPlaybookStats(id: string, token: string): Promise<PlaybookStats>;

  // Checklist Rules
  getChecklistRules(token: string): Promise<ChecklistRule[]>;
  createChecklistRule(data: { rule: string }, token: string): Promise<ChecklistRule>;
  updateChecklistRule(id: string, data: { rule: string }, token: string): Promise<ChecklistRule>;
  deleteChecklistRule(id: string, token: string): Promise<{ message: string }>;

  // Trades
  getTrades(brokerAccountId: string, token: string): Promise<Trade[]>;
  createTrade(data: Partial<Trade>, token: string): Promise<Trade>;
  updateTrade(id: string, data: Partial<Trade>, token: string): Promise<Trade>;
  deleteTrade(id: string, token: string): Promise<{ message: string }>;
  bulkDeleteTrades(tradeIds: string[], token: string): Promise<{ message: string }>;
  bulkImportTrades(data: { brokerAccountId: string; playbookId: string; trades: any[] }, token: string): Promise<{ imported: number; skipped: number }>;

  // Trade Journals
  createTradeJournal(tradeId: string, data: Omit<TradeJournal, 'id' | 'tradeId'>, token: string): Promise<TradeJournal>;
  updateTradeJournal(journalId: string, data: Partial<Omit<TradeJournal, 'id' | 'tradeId'>>, token: string): Promise<TradeJournal>;



  // Notifications
  getNotifications(token: string): Promise<Notification[]>;
  markNotificationAsRead(id: string, token: string): Promise<Notification>;

  // Auth
  verifyEmail(token: string): Promise<{ message: string }>;

  // Billing
  getBillingConfig(token: string): Promise<{ clientSideToken: string; environment: 'production' | 'sandbox' }>;
  getPublicPlans(): Promise<any[]>;
  getSystemStatus(): Promise<{ maintenance: boolean; message?: string }>;
  createCheckoutTransaction(token: string, promoCode?: string, priceId?: string, customerEmail?: string): Promise<{ transactionId: string }>;
  syncSubscription(token: string): Promise<{ status: string }>;

  // Auth / User
  getMe(token: string): Promise<User>;

  // Admin
  getAdminStats(token: string): Promise<AdminStats>;
  getSystemConfig(token: string): Promise<SystemConfig>;
  setFreeMode(enabled: boolean, token: string): Promise<SystemConfig>;
  setUserBotEnabled(userId: string, enabled: boolean, token: string): Promise<AdminUser>;
  setUserQuantEnabled(userId: string, enabled: boolean, token: string): Promise<AdminUser>;
  toggleMaintenance(enabled: boolean, token: string): Promise<SystemConfig>;
  getAdminUsers(token: string): Promise<AdminUser[]>;
  grantProAccess(userId: string, data: { expiresAt?: string | null; reason?: string }, token: string): Promise<AdminUser>;
  revokeProAccess(userId: string, token: string): Promise<AdminUser>;
  deleteUser(userId: string, token: string): Promise<{ message: string }>;
  getReferralStats(token: string): Promise<any>;
  grantLifetimeAccess(userId: string, token: string): Promise<AdminUser>;
  extendTrial(userId: string, days: number, token: string): Promise<AdminUser>;
  generateInvite(type: 'TRIAL' | 'LIFETIME', duration: number | undefined, token: string): Promise<any>;
  getInvites(token: string): Promise<any[]>;
  validateInvite(code: string): Promise<any>;
  claimInvite(code: string, token: string): Promise<any>;

  // Promo Codes
  createPromoCode(data: any, token: string): Promise<any>;
  getPromoCodes(token: string): Promise<any[]>;
  deletePromoCode(id: string, token: string): Promise<any>;
  validatePromoCode(code: string, token: string): Promise<any>;

  // Assets
  getAssetSpecs(token: string): Promise<AssetSpecification[]>;
  createAssetSpec(data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification>;
  updateAssetSpec(id: string, data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification>;
  deleteAssetSpec(id: string, token: string): Promise<{ message: string }>;

  // Market Data
  getCandles(symbol: string, interval: string, start: string, end: string, token?: string | null): Promise<CandlesResult>;

  // Prop Firm Template Methods (Admin)
  getAllPropFirmTemplates(token: string): Promise<import('../types').PropFirmTemplate[]>;
  getPropFirmTemplate(token: string, id: string): Promise<import('../types').PropFirmTemplate>;
  createPropFirmTemplate(token: string, data: import('../types').CreatePropFirmTemplateDto): Promise<import('../types').PropFirmTemplate>;
  updatePropFirmTemplate(token: string, id: string, data: Partial<import('../types').CreatePropFirmTemplateDto>): Promise<import('../types').PropFirmTemplate>;
  deletePropFirmTemplate(token: string, id: string): Promise<{ message: string }>;
  getPricingPlans(token: string): Promise<any[]>;
  updatePricingPlan(id: string, data: any, token: string): Promise<any>;

  // Notebook
  getNotebookEntries(token: string): Promise<NotebookEntry[]>;
  createNotebookEntry(body: { date?: string; title?: string; content?: string; tags?: string[] }, token: string): Promise<NotebookEntry>;
  updateNotebookEntry(id: string, body: { date?: string; title?: string; content?: string; tags?: string[] }, token: string): Promise<NotebookEntry>;
  deleteNotebookEntry(id: string, token: string): Promise<{ message: string }>;

  // cTrader
  ctraderConnect(token: string): Promise<{ url: string }>;
  ctraderStatus(token: string): Promise<{ connected: boolean; configured: boolean; expiresAt?: string; scope?: string; connectedAt?: string }>;
  ctraderDisconnect(token: string): Promise<{ disconnected: true }>;

  // Quant (Polymarket wallet intelligence)
  quantLeaderboard(limit?: number, token?: string | null): Promise<PmWallet[]>;
  quantFeed(limit?: number, token?: string | null): Promise<QuantFeedItem[]>;
  quantStats(token?: string | null): Promise<{ total: number; scanned: number; qualified: number }>;
  quantWallet(address: string, token?: string | null): Promise<PmWallet>;
  quantWalletPositions(address: string, token?: string | null): Promise<PmPosition[]>;
  quantScan(address: string, token?: string | null): Promise<PmWallet>;
  quantVerdict(address: string, token?: string | null): Promise<QuantVerdict>;
  quantMarkets(q?: string, token?: string | null): Promise<PolymarketMarket[]>;
  quantLearning(token?: string | null): Promise<QuantLearning>;
  quantLearningDecisions(limit?: number, sample?: 'live' | 'historical', token?: string | null): Promise<QuantDecision[]>;
  quantSimulation(bankroll: number, risk: number, sample?: 'live' | 'historical', token?: string | null): Promise<QuantSimulation>;
  quantArbs(token?: string | null): Promise<ArbScan>;

  // Quant AI features (ChatGPT-powered)
  aiOpportunities(token?: string | null): Promise<{ opportunities: AiOpportunity[]; note?: string }>;
  aiStrategy(token?: string | null): Promise<AiStrategy>;

  // ChatGPT connection (paste-URL OAuth flow)
  chatgptStart(token?: string | null): Promise<{ authUrl: string }>;
  chatgptExchange(code: string, state: string, token?: string | null): Promise<{ connected: true }>;
  chatgptStatus(token?: string | null): Promise<ChatGptStatus>;
  chatgptDisconnect(token?: string | null): Promise<{ disconnected: true }>;
  chatgptSetPermissions(perms: Partial<ChatGptPermissions>, token?: string | null): Promise<ChatGptStatus>;
  chatgptModels(token?: string | null): Promise<{ models: string[]; working: string | null }>;
  chatgptSetModel(model: string, token?: string | null): Promise<ChatGptStatus>;

  // AI (ChatGPT-grounded journal analysis + copilot chat)
  aiJournalAnalysis(token?: string | null): Promise<AiJournalAnalysis>;
  aiChat(message: string, history?: string, token?: string | null): Promise<{ reply: string }>;
  aiAgent(goal: string, token?: string | null): Promise<AiAgentResult>;

  // AI Agent management (tools / skills + run audit log)
  aiTools(token?: string | null): Promise<AgentTool[]>;
  aiAddTool(body: { name: string; description: string; method: 'GET' | 'POST'; url: string; category?: string }, token?: string | null): Promise<AgentTool>;
  aiToggleTool(id: string, enabled: boolean, token?: string | null): Promise<AgentTool>;
  aiDeleteTool(id: string, token?: string | null): Promise<{ message: string }>;
  aiRuns(token?: string | null): Promise<AgentRun[]>;
  aiRun(id: string, token?: string | null): Promise<AgentRun>;

  // AI scheduled agents
  aiSchedules(token?: string | null): Promise<ScheduledAgent[]>;
  aiCreateSchedule(body: { name: string; goal: string; frequency: ScheduledAgentFrequency }, token?: string | null): Promise<ScheduledAgent>;
  aiUpdateSchedule(id: string, body: { name?: string; goal?: string; frequency?: ScheduledAgentFrequency; enabled?: boolean }, token?: string | null): Promise<ScheduledAgent>;
  aiDeleteSchedule(id: string, token?: string | null): Promise<{ message: string }>;
  aiRunScheduleNow(id: string, token?: string | null): Promise<AiAgentResult>;
}

export interface ChatGptPermissions {
  verdict: boolean;
  bot: boolean;
  analysis: boolean;
}

export interface ChatGptStatus {
  connected: boolean;
  connectedAt?: string;
  permissions?: ChatGptPermissions;
  model?: string | null;
}

const buildHeaders = (token?: string | null): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}${endpoint}`;

  try {
    const response = await fetch(fullUrl, options);

    if (response.status === 401) {
      // Check if we actually sent a token
      const hasAuthHeader = options.headers && (options.headers as any)['Authorization'];

      if (hasAuthHeader) {
        console.error('API returned 401 with valid token - possible token expiry');
        throw new Error('Session expired. Please refresh the page.');
      } else {
        console.error('API returned 401 without auth header');
        throw new Error('Authentication required');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      if (errorData.message && Array.isArray(errorData.message)) {
        throw new Error(errorData.message.join(', '));
      }
      if (errorData.error && errorData.error.message) {
        throw new Error(errorData.error.message);
      }
      if (errorData.message) {
        throw new Error(errorData.message);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message || 'API request failed');
    }

    return result.data;
  } catch (error) {
    throw error;
  }
}

const api: ApiService = {
  get<T>(endpoint: string, token?: string | null): Promise<T> {
    return request<T>(endpoint, { method: 'GET', headers: buildHeaders(token) });
  },

  post<T>(endpoint: string, body: any, token?: string | null): Promise<T> {
    return request<T>(endpoint, { method: 'POST', headers: buildHeaders(token), body: JSON.stringify(body) });
  },

  patch<T>(endpoint: string, body: any, token?: string | null): Promise<T> {
    return request<T>(endpoint, { method: 'PATCH', headers: buildHeaders(token), body: JSON.stringify(body) });
  },

  delete<T>(endpoint: string, token?: string | null): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE', headers: buildHeaders(token) });
  },

  // Broker Account Methods
  getAccounts(token: string): Promise<BrokerAccount[]> { return this.get('/api/broker-accounts', token); },
  createAccount(data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount> { return this.post('/api/broker-accounts', data, token); },
  updateAccount(id: string, data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount> { return this.patch(`/api/broker-accounts/${id}`, data, token); },
  deleteAccount(id: string, token: string): Promise<{ message: string }> { return this.delete(`/api/broker-accounts/${id}`, token); },
  getObjectivesProgress(id: string, token: string): Promise<ObjectiveProgress[]> { return this.get(`/api/broker-accounts/${id}/objectives`, token); },
  getSmartLimitsProgress(id: string, token: string): Promise<SmartLimitProgress> { return this.get(`/api/broker-accounts/${id}/smart-limits-progress`, token); },
  getWeeklyDebrief(accountId: string, token: string): Promise<{ debrief: string }> { return this.post(`/api/broker-accounts/${accountId}/weekly-debrief`, {}, token); },
  getDailyDebrief(accountId: string, token: string): Promise<{ debrief: string }> { return this.post(`/api/broker-accounts/${accountId}/daily-debrief`, {}, token); },
  getDrawdownCalculation(token: string, accountId: string): Promise<any> { return this.get(`/api/broker-accounts/${accountId}/drawdown`, token); },
  getAnalytics(accountId: string, token: string, params?: { startDate?: string; endDate?: string }): Promise<AccountAnalytics> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const queryString = query.toString();
    return this.get(`/api/analytics/${accountId}${queryString ? `?${queryString}` : ''}`, token);
  },

  // Playbook Methods
  getPlaybooks(token: string): Promise<Playbook[]> { return this.get('/api/playbooks', token); },
  getCommunityPlaybooks(token: string): Promise<CommunityPlaybook[]> { return this.get('/api/playbooks/community', token); },
  createPlaybook(data: Partial<Playbook>, token: string): Promise<Playbook> { return this.post('/api/playbooks', data, token); },
  updatePlaybook(id: string, data: Partial<Playbook>, token: string): Promise<Playbook> { return this.patch(`/api/playbooks/${id}`, data, token); },
  deletePlaybook(id: string, token: string): Promise<{ message: string }> { return this.delete(`/api/playbooks/${id}`, token); },
  getPlaybookStats(id: string, token: string): Promise<PlaybookStats> { return this.get(`/api/playbooks/${id}/stats`, token); },

  // Checklist Rule Methods
  getChecklistRules(token: string): Promise<ChecklistRule[]> { return this.get('/api/checklist-rules', token); },
  createChecklistRule(data: { rule: string }, token: string): Promise<ChecklistRule> { return this.post('/api/checklist-rules', data, token); },
  updateChecklistRule(id: string, data: { rule: string }, token: string): Promise<ChecklistRule> { return this.patch(`/api/checklist-rules/${id}`, data, token); },
  deleteChecklistRule(id: string, token: string): Promise<{ message: string }> { return this.delete(`/api/checklist-rules/${id}`, token); },

  // Trade Methods
  getTrades(brokerAccountId: string, token: string): Promise<Trade[]> { return this.get(`/api/trades?brokerAccountId=${brokerAccountId}`, token); },
  createTrade(data: Partial<Trade>, token: string): Promise<Trade> { return this.post('/api/trades', data, token); },
  updateTrade(id: string, data: Partial<Trade>, token: string): Promise<Trade> { return this.patch(`/api/trades/${id}`, data, token); },
  deleteTrade(id: string, token: string): Promise<{ message: string }> { return this.delete(`/api/trades/${id}`, token); },
  bulkDeleteTrades(tradeIds: string[], token: string): Promise<{ message: string }> { return this.post('/api/trades/bulk-delete', { tradeIds }, token); },
  bulkImportTrades(data: { brokerAccountId: string; playbookId: string; trades: any[] }, token: string): Promise<{ imported: number; skipped: number }> { return this.post('/api/trades/bulk-import', data, token); },

  // Trade Journal Methods
  createTradeJournal(tradeId: string, data: Omit<TradeJournal, 'id' | 'tradeId'>, token: string): Promise<TradeJournal> { return this.post(`/api/trades/${tradeId}/journal`, data, token); },
  updateTradeJournal(journalId: string, data: Partial<Omit<TradeJournal, 'id' | 'tradeId'>>, token: string): Promise<TradeJournal> { return this.patch(`/api/trade-journals/${journalId}`, data, token); },



  // Notification Methods
  getNotifications(token: string): Promise<Notification[]> { return this.get('/api/notifications', token); },
  markNotificationAsRead(id: string, token: string): Promise<Notification> { return this.patch(`/api/notifications/${id}/read`, {}, token); },

  // Auth Methods
  verifyEmail(token: string): Promise<{ message: string }> { return this.post('/api/auth/verify-email', { token }, null); },

  // Billing Methods
  getBillingConfig(token: string): Promise<{ clientSideToken: string; environment: 'production' | 'sandbox' }> { return this.get('/api/billing/config', token); },
  createCheckoutTransaction(token: string, promoCode?: string, priceId?: string, customerEmail?: string): Promise<{ transactionId: string }> { return this.post('/api/billing/checkout', { promoCode, priceId, customerEmail }, token); },
  syncSubscription(token: string): Promise<{ status: string }> { return this.post('/api/billing/sync', {}, token); },
  getPublicPlans(): Promise<any[]> { return this.get('/api/billing/plans'); },
  getSystemStatus(): Promise<{ maintenance: boolean; message?: string }> { return this.get('/api/billing/status'); },

  // User Methods
  getMe(token: string): Promise<User> { return this.get('/api/users/me', token); },

  // Admin Methods
  getAdminStats(token: string): Promise<AdminStats> { return this.get('/api/admin/stats', token); },
  getSystemConfig(token: string): Promise<SystemConfig> { return this.get('/api/admin/system/config', token); },
  toggleMaintenance(enabled: boolean, token: string): Promise<SystemConfig> { return this.post('/api/admin/system/maintenance', { enabled }, token); },
  setFreeMode(enabled: boolean, token: string): Promise<SystemConfig> { return this.post('/api/admin/system/free-mode', { enabled }, token); },
  setUserBotEnabled(userId: string, enabled: boolean, token: string): Promise<AdminUser> { return this.patch(`/api/admin/users/${userId}/bot`, { enabled }, token); },
  setUserQuantEnabled(userId: string, enabled: boolean, token: string): Promise<AdminUser> { return this.patch(`/api/admin/users/${userId}/quant`, { enabled }, token); },
  getAdminUsers(token: string): Promise<AdminUser[]> { return this.get('/api/admin/users', token); },
  grantProAccess(userId: string, data: { expiresAt?: string | null; reason?: string }, token: string): Promise<AdminUser> { return this.patch(`/api/admin/users/${userId}/grant-pro`, data, token); },
  revokeProAccess(userId: string, token: string): Promise<AdminUser> { return this.delete(`/api/admin/users/${userId}/grant-pro`, token); },
  deleteUser(userId: string, token: string): Promise<{ message: string }> { return this.delete(`/api/admin/users/${userId}`, token); },
  getReferralStats(token: string): Promise<any> { return this.get('/api/admin/referrals/stats', token); },
  grantLifetimeAccess(userId: string, token: string): Promise<AdminUser> { return this.post(`/api/admin/users/${userId}/lifetime`, {}, token); },
  extendTrial(userId: string, days: number, token: string): Promise<AdminUser> { return this.post(`/api/admin/users/${userId}/extend-trial`, { days }, token); },
  generateInvite(type: 'TRIAL' | 'LIFETIME', duration: number | undefined, token: string): Promise<any> { return this.post('/api/admin/invites/generate', { type, duration }, token); },
  getInvites(token: string): Promise<any[]> { return this.get('/api/admin/invites', token); },
  validateInvite(code: string): Promise<any> { return this.get(`/api/invites/validate/${code}`); },
  claimInvite(code: string, token: string): Promise<any> { return this.post('/api/invites/claim', { code }, token); },

  // Promo Codes
  createPromoCode(data: any, token: string): Promise<any> { return this.post('/api/promo-codes', data, token); },
  getPromoCodes(token: string): Promise<any[]> { return this.get('/api/promo-codes', token); },
  deletePromoCode(id: string, token: string): Promise<any> { return this.delete(`/api/promo-codes/${id}`, token); },
  validatePromoCode(code: string, token: string): Promise<any> { return this.post('/api/promo-codes/validate', { code }, token); },

  // Prop Firm Template Methods (Admin)
  getAllPropFirmTemplates(token: string): Promise<import('../types').PropFirmTemplate[]> { return this.get('/api/admin/templates', token); },
  getPropFirmTemplate(token: string, id: string): Promise<import('../types').PropFirmTemplate> { return this.get(`/api/admin/templates/${id}`, token); },
  createPropFirmTemplate(token: string, data: import('../types').CreatePropFirmTemplateDto): Promise<import('../types').PropFirmTemplate> { return this.post('/api/admin/templates', data, token); },
  updatePropFirmTemplate(token: string, id: string, data: Partial<import('../types').CreatePropFirmTemplateDto>): Promise<import('../types').PropFirmTemplate> { return this.patch(`/api/admin/templates/${id}`, data, token); },
  deletePropFirmTemplate(token: string, id: string): Promise<{ message: string }> { return this.delete(`/api/admin/templates/${id}`, token); },

  // Pricing Plans (Admin)
  getPricingPlans(token: string): Promise<any[]> { return this.get('/api/admin/pricing-plans', token); },
  updatePricingPlan(id: string, data: any, token: string): Promise<any> { return this.patch(`/api/admin/pricing-plans/${id}`, data, token); },

  // Asset Methods
  getAssetSpecs(token: string): Promise<AssetSpecification[]> { return this.get('/api/assets/specs', token); },
  createAssetSpec(data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification> { return this.post('/api/assets', data, token); },
  updateAssetSpec(id: string, data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification> { return this.patch(`/api/assets/${id}`, data, token); },
  deleteAssetSpec(id: string, token: string): Promise<{ message: string }> { return this.delete(`/api/assets/${id}`, token); },

  // Notebook Methods
  getNotebookEntries(token: string): Promise<NotebookEntry[]> { return this.get('/api/notebook', token); },
  createNotebookEntry(body: { date?: string; title?: string; content?: string; tags?: string[] }, token: string): Promise<NotebookEntry> { return this.post('/api/notebook', body, token); },
  updateNotebookEntry(id: string, body: { date?: string; title?: string; content?: string; tags?: string[] }, token: string): Promise<NotebookEntry> { return this.patch(`/api/notebook/${id}`, body, token); },
  deleteNotebookEntry(id: string, token: string): Promise<{ message: string }> { return this.delete(`/api/notebook/${id}`, token); },

  // Market Data Methods
  getCandles(symbol: string, interval: string, start: string, end: string, token?: string | null): Promise<CandlesResult> {
    const params = new URLSearchParams({ symbol, interval, start, end });
    return this.get<CandlesResult>(`/api/market-data/candles?${params.toString()}`, token);
  },

  // cTrader Methods
  ctraderConnect(token: string): Promise<{ url: string }> { return this.get('/api/ctrader/connect', token); },
  ctraderStatus(token: string): Promise<{ connected: boolean; configured: boolean; expiresAt?: string; scope?: string; connectedAt?: string }> { return this.get('/api/ctrader/status', token); },
  ctraderDisconnect(token: string): Promise<{ disconnected: true }> { return this.post('/api/ctrader/disconnect', {}, token); },

  // Quant Methods (Polymarket wallet intelligence)
  quantLeaderboard(limit?: number, token?: string | null): Promise<PmWallet[]> {
    const query = limit !== undefined ? `?limit=${limit}` : '';
    return this.get(`/api/quant/leaderboard${query}`, token);
  },
  quantFeed(limit?: number, token?: string | null): Promise<QuantFeedItem[]> {
    const query = limit !== undefined ? `?limit=${limit}` : '';
    return this.get(`/api/quant/feed${query}`, token);
  },
  quantStats(token?: string | null): Promise<{ total: number; scanned: number; qualified: number }> { return this.get('/api/quant/stats', token); },
  quantWallet(address: string, token?: string | null): Promise<PmWallet> { return this.get(`/api/quant/wallet/${address}`, token); },
  quantWalletPositions(address: string, token?: string | null): Promise<PmPosition[]> { return this.get(`/api/quant/wallet/${address}/positions`, token); },
  quantScan(address: string, token?: string | null): Promise<PmWallet> { return this.post('/api/quant/scan', { address }, token); },
  quantVerdict(address: string, token?: string | null): Promise<QuantVerdict> { return this.post('/api/quant/verdict', { address }, token); },
  quantMarkets(q?: string, token?: string | null): Promise<PolymarketMarket[]> {
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.get(`/api/quant/markets${query}`, token);
  },
  quantLearning(token?: string | null): Promise<QuantLearning> { return this.get('/api/quant/learning', token); },
  quantLearningDecisions(limit?: number, sample?: 'live' | 'historical', token?: string | null): Promise<QuantDecision[]> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.set('limit', String(limit));
    if (sample !== undefined) params.set('sample', sample);
    const qs = params.toString();
    return this.get(`/api/quant/learning/decisions${qs ? `?${qs}` : ''}`, token);
  },
  quantSimulation(bankroll: number, risk: number, sample?: 'live' | 'historical', token?: string | null): Promise<QuantSimulation> {
    return this.get(`/api/quant/simulation?bankroll=${bankroll}&risk=${risk}&sample=${sample ?? 'live'}`, token);
  },
  quantArbs(token?: string | null): Promise<ArbScan> { return this.get('/api/quant/arbs', token); },

  // Quant AI features (ChatGPT-powered)
  aiOpportunities(token?: string | null): Promise<{ opportunities: AiOpportunity[]; note?: string }> { return this.post('/api/ai/opportunities', {}, token); },
  aiStrategy(token?: string | null): Promise<AiStrategy> { return this.post('/api/ai/strategy', {}, token); },

  // ChatGPT Connection Methods (paste-URL OAuth flow)
  chatgptStart(token?: string | null): Promise<{ authUrl: string }> { return this.post('/api/chatgpt/start', {}, token); },
  chatgptExchange(code: string, state: string, token?: string | null): Promise<{ connected: true }> { return this.post('/api/chatgpt/exchange', { code, state }, token); },
  chatgptStatus(token?: string | null): Promise<ChatGptStatus> { return this.get('/api/chatgpt/status', token); },
  chatgptDisconnect(token?: string | null): Promise<{ disconnected: true }> { return this.post('/api/chatgpt/disconnect', {}, token); },
  chatgptSetPermissions(perms: Partial<ChatGptPermissions>, token?: string | null): Promise<ChatGptStatus> { return this.patch('/api/chatgpt/permissions', perms, token); },
  chatgptModels(token?: string | null): Promise<{ models: string[]; working: string | null }> { return this.get('/api/chatgpt/models', token); },
  chatgptSetModel(model: string, token?: string | null): Promise<ChatGptStatus> { return this.patch('/api/chatgpt/model', { model }, token); },

  // AI Methods (ChatGPT-grounded journal analysis + copilot chat)
  aiJournalAnalysis(token?: string | null): Promise<AiJournalAnalysis> { return this.post('/api/ai/journal-analysis', {}, token); },
  aiChat(message: string, history?: string, token?: string | null): Promise<{ reply: string }> { return this.post('/api/ai/chat', { message, history }, token); },
  aiAgent(goal: string, token?: string | null): Promise<AiAgentResult> { return this.post('/api/ai/agent', { goal }, token); },

  // AI Agent management (tools / skills + run audit log)
  aiTools(token?: string | null): Promise<AgentTool[]> { return this.get('/api/ai/tools', token); },
  aiAddTool(body: { name: string; description: string; method: 'GET' | 'POST'; url: string; category?: string }, token?: string | null): Promise<AgentTool> { return this.post('/api/ai/tools', body, token); },
  aiToggleTool(id: string, enabled: boolean, token?: string | null): Promise<AgentTool> { return this.patch(`/api/ai/tools/${id}`, { enabled }, token); },
  aiDeleteTool(id: string, token?: string | null): Promise<{ message: string }> { return this.delete(`/api/ai/tools/${id}`, token); },
  aiRuns(token?: string | null): Promise<AgentRun[]> { return this.get('/api/ai/runs', token); },
  aiRun(id: string, token?: string | null): Promise<AgentRun> { return this.get(`/api/ai/runs/${id}`, token); },

  aiSchedules(token?: string | null): Promise<ScheduledAgent[]> { return this.get('/api/ai/schedules', token); },
  aiCreateSchedule(body: { name: string; goal: string; frequency: ScheduledAgentFrequency }, token?: string | null): Promise<ScheduledAgent> { return this.post('/api/ai/schedules', body, token); },
  aiUpdateSchedule(id: string, body: { name?: string; goal?: string; frequency?: ScheduledAgentFrequency; enabled?: boolean }, token?: string | null): Promise<ScheduledAgent> { return this.patch(`/api/ai/schedules/${id}`, body, token); },
  aiDeleteSchedule(id: string, token?: string | null): Promise<{ message: string }> { return this.delete(`/api/ai/schedules/${id}`, token); },
  aiRunScheduleNow(id: string, token?: string | null): Promise<AiAgentResult> { return this.post(`/api/ai/schedules/${id}/run`, {}, token); },
};

export default api;
