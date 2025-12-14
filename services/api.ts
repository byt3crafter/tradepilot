
import { AdminStats, AdminUser, BrokerAccount, ChecklistRule, ObjectiveProgress, SmartLimitProgress, Playbook, Trade, TradeJournal, PlaybookStats, AssetSpecification, CommunityPlaybook, PreTradeCheckResult, AnalyzeChartResult, AccountAnalytics, Notification } from "../types";

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
  analyzeTrade(id: string, token: string): Promise<Trade>;
  preTradeCheck(data: { playbookId: string; screenshotBeforeUrl: string; asset: string }, token: string): Promise<PreTradeCheckResult>;
  analyzeChart(screenshotUrl: string, availableAssets: string[], token: string): Promise<AnalyzeChartResult>;
  bulkImportTrades(data: { brokerAccountId: string; playbookId: string; trades: any[] }, token: string): Promise<{ imported: number; skipped: number }>;

  // Trade Journals
  createTradeJournal(tradeId: string, data: Omit<TradeJournal, 'id' | 'tradeId'>, token: string): Promise<TradeJournal>;
  updateTradeJournal(journalId: string, data: Partial<Omit<TradeJournal, 'id' | 'tradeId'>>, token: string): Promise<TradeJournal>;



  // Notifications
  getNotifications(token: string): Promise<Notification[]>;
  markNotificationAsRead(id: string, token: string): Promise<Notification>;

  // AI
  generateTradeIdea(data: { asset: string; strategyType: string, screenshotUrl?: string | null }, token: string): Promise<{ idea: string }>;
  parseTradeText(text: string, availableAssets: string[], token: string): Promise<Partial<Trade>>;

  // Auth
  verifyEmail(token: string): Promise<{ message: string }>;

  // Billing
  getBillingConfig(token: string): Promise<{ clientSideToken: string }>;
  createCheckoutTransaction(token: string, promoCode?: string, priceId?: string, customerEmail?: string): Promise<{ transactionId: string }>;
  syncSubscription(token: string): Promise<{ status: string }>;

  // Admin
  getAdminStats(token: string): Promise<AdminStats>;
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

  // Prop Firm Template Methods (Admin)
  getAllPropFirmTemplates(token: string): Promise<import('../types').PropFirmTemplate[]>;
  getPropFirmTemplate(token: string, id: string): Promise<import('../types').PropFirmTemplate>;
  createPropFirmTemplate(token: string, data: import('../types').CreatePropFirmTemplateDto): Promise<import('../types').PropFirmTemplate>;
  updatePropFirmTemplate(token: string, id: string, data: Partial<import('../types').CreatePropFirmTemplateDto>): Promise<import('../types').PropFirmTemplate>;
  deletePropFirmTemplate(token: string, id: string): Promise<{ message: string }>;
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
  analyzeTrade(id: string, token: string): Promise<Trade> { return this.post(`/api/trades/${id}/analyze`, {}, token); },
  preTradeCheck(data: { playbookId: string; screenshotBeforeUrl: string; asset: string }, token: string): Promise<PreTradeCheckResult> { return this.post('/api/trades/pre-trade-check', data, token); },
  analyzeChart(screenshotUrl: string, availableAssets: string[], token: string): Promise<AnalyzeChartResult> { return this.post('/api/trades/analyze-chart', { screenshotUrl, availableAssets }, token); },
  bulkImportTrades(data: { brokerAccountId: string; playbookId: string; trades: any[] }, token: string): Promise<{ imported: number; skipped: number }> { return this.post('/api/trades/bulk-import', data, token); },

  // Trade Journal Methods
  createTradeJournal(tradeId: string, data: Omit<TradeJournal, 'id' | 'tradeId'>, token: string): Promise<TradeJournal> { return this.post(`/api/trades/${tradeId}/journal`, data, token); },
  updateTradeJournal(journalId: string, data: Partial<Omit<TradeJournal, 'id' | 'tradeId'>>, token: string): Promise<TradeJournal> { return this.patch(`/api/trade-journals/${journalId}`, data, token); },



  // Notification Methods
  getNotifications(token: string): Promise<Notification[]> { return this.get('/api/notifications', token); },
  markNotificationAsRead(id: string, token: string): Promise<Notification> { return this.patch(`/api/notifications/${id}/read`, {}, token); },

  // AI Methods
  generateTradeIdea(data: { asset: string; strategyType: string, screenshotUrl?: string | null }, token: string): Promise<{ idea: string }> { return this.post('/api/ai/generate-idea', data, token); },
  parseTradeText(text: string, availableAssets: string[], token: string): Promise<Partial<Trade>> { return this.post('/api/ai/parse-trade-text', { text, availableAssets }, token); },

  // Auth Methods
  verifyEmail(token: string): Promise<{ message: string }> { return this.post('/api/auth/verify-email', { token }, null); },

  // Billing Methods
  getBillingConfig(token: string): Promise<{ clientSideToken: string }> { return this.get('/api/billing/config', token); },
  createCheckoutTransaction(token: string, promoCode?: string, priceId?: string, customerEmail?: string): Promise<{ transactionId: string }> { return this.post('/api/billing/checkout', { promoCode, priceId, customerEmail }, token); },
  syncSubscription(token: string): Promise<{ status: string }> { return this.post('/api/billing/sync', {}, token); },

  // Admin Methods
  getAdminStats(token: string): Promise<AdminStats> { return this.get('/api/admin/stats', token); },
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

  // Asset Methods
  getAssetSpecs(token: string): Promise<AssetSpecification[]> { return this.get('/api/assets/specs', token); },
  createAssetSpec(data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification> { return this.post('/api/assets', data, token); },
  updateAssetSpec(id: string, data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification> { return this.patch(`/api/assets/${id}`, data, token); },
  deleteAssetSpec(id: string, token: string): Promise<{ message: string }> { return this.delete(`/api/assets/${id}`, token); }
};

export default api;
