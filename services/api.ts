import { AdminStats, AdminUser, BrokerAccount, ChecklistRule, ObjectiveProgress, SmartLimitProgress, Playbook, Trade, TradeJournal, PlaybookStats, AssetSpecification, CommunityPlaybook, PreTradeCheckResult } from "../types";

// The API_URL is configured in a <script> tag within index.html
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

interface ApiService {
  get<T>(endpoint: string, token?: string): Promise<T>;
  post<T>(endpoint:string, body: any, token?: string): Promise<T>;
  patch<T>(endpoint: string, body: any, token?: string): Promise<T>;
  delete<T>(endpoint: string, token?: string): Promise<T>;
  verifyEmail(token: string): Promise<{ message: string }>;
  
  // Accounts
  getAccounts(token: string): Promise<BrokerAccount[]>;
  createAccount(data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount>;
  updateAccount(id: string, data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount>;
  deleteAccount(id: string, token: string): Promise<{ message: string }>;
  getObjectivesProgress(id: string, token: string): Promise<ObjectiveProgress[]>;
  getSmartLimitsProgress(id: string, token: string): Promise<SmartLimitProgress>;
  getWeeklyDebrief(accountId: string, token: string): Promise<{ debrief: string }>;
  getDailyDebrief(accountId: string, token: string): Promise<{ debrief: string }>;

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
  analyzeTrade(id: string, token: string): Promise<Trade>;
  preTradeCheck(data: { playbookId: string; screenshotBeforeUrl: string; asset: string }, token: string): Promise<PreTradeCheckResult>;
  
  // Trade Journals
  createTradeJournal(tradeId: string, data: Omit<TradeJournal, 'id' | 'tradeId'>, token: string): Promise<TradeJournal>;
  updateTradeJournal(journalId: string, data: Partial<Omit<TradeJournal, 'id' | 'tradeId'>>, token: string): Promise<TradeJournal>;

  // Billing
  getBillingConfig(token: string): Promise<{ clientSideToken: string }>;
  createCheckoutTransaction(token: string): Promise<{ transactionId: string }>;
  
  // Admin
  getAdminStats(token: string): Promise<AdminStats>;
  getAdminUsers(token: string): Promise<AdminUser[]>;
  grantProAccess(userId: string, data: { expiresAt?: string | null; reason?: string }, token: string): Promise<AdminUser>;
  revokeProAccess(userId: string, token: string): Promise<AdminUser>;
  deleteUser(userId: string, token: string): Promise<{ message: string }>;

  // Assets
  getAssetSpecs(token: string): Promise<AssetSpecification[]>;
  createAssetSpec(data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification>;
  updateAssetSpec(id: string, data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification>;
  deleteAssetSpec(id: string, token: string): Promise<{ message: string }>;
}

const buildHeaders = (token?: string): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// --- Token Refresh Logic ---
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const refreshToken = (): Promise<string | null> => {
  if (isRefreshing && refreshPromise) {
    // A refresh is already in progress, return the existing promise to avoid a race condition.
    console.log('[API] Attaching to an in-progress token refresh.');
    return refreshPromise;
  }

  isRefreshing = true;
  
  refreshPromise = new Promise(async (resolve) => {
    try {
      console.log('[API] Initiating new token refresh...');
      const apiUrl = getApiUrl();
      const refreshEndpoint = '/api/auth/refresh';
      const fullUrl = `${apiUrl}${refreshEndpoint}`;

      const response = await fetch(fullUrl, {
        method: 'POST',
        credentials: 'include', // This is crucial for sending the httpOnly cookie.
      });

      if (!response.ok) {
        throw new Error('Refresh token is invalid or expired.');
      }

      const result: ApiResponse<{ accessToken: string }> = await response.json();
      if (!result.success || !result.data.accessToken) {
        throw new Error('Invalid response from the refresh endpoint.');
      }

      const newAccessToken = result.data.accessToken;
      localStorage.setItem('accessToken', newAccessToken);

      // Notify the application that the token has been updated.
      window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: newAccessToken }));
      
      console.log('[API] Token refresh successful.');
      resolve(newAccessToken);

    } catch (error) {
      console.error('[API] Token refresh failed:', error);
      localStorage.removeItem('accessToken');
      // Notify the application to log out the user.
      window.dispatchEvent(new Event('logout'));
      resolve(null); // Resolve with null on failure to signal that logout should occur.
    } finally {
      // Reset state for the next time a token expires.
      isRefreshing = false;
      refreshPromise = null;
    }
  });

  return refreshPromise;
};


async function request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}${endpoint}`;

  console.log(`[API] Making ${options.method || 'GET'} request to: ${fullUrl}`);

  try {
    let response = await fetch(fullUrl, options);
    
    // Check for 401 Unauthorized and attempt a token refresh
    if (response.status === 401 && endpoint !== '/api/auth/refresh' && endpoint !== '/api/auth/login') {
        const newAccessToken = await refreshToken();
        
        if (newAccessToken) {
            // Retry the original request with the new token
            const newOptions = { ...options };
            const headers = new Headers(options.headers);
            headers.set('Authorization', `Bearer ${newAccessToken}`);
            newOptions.headers = headers;
            
            console.log('[API] Retrying original request with new token.');
            response = await fetch(fullUrl, newOptions);
        } else {
            // Refresh failed, logout is handled by the refreshToken function
            throw new Error('Session expired. Please log in again.');
        }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
      // Handle NestJS validation errors
      if (errorData.message && Array.isArray(errorData.message)) {
        throw new Error(errorData.message.join(', '));
      }
      // Handle our custom error structure
      if (errorData.error && errorData.error.message) {
          throw new Error(errorData.error.message);
      }
      // Handle our direct exception messages (like from ForbiddenException)
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
  } catch(error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
           console.error(`[API] NetworkError when fetching ${fullUrl}:`, error);
           throw new Error(`NetworkError when attempting to fetch resource.`);
      }
      throw error;
  }
}

// FIX: Add ApiService type annotation to correctly type `this` inside the object methods.
const api: ApiService = {
  get<T>(endpoint: string, token?: string): Promise<T> {
    return request<T>(endpoint, {
      method: 'GET',
      headers: buildHeaders(token),
    });
  },

  post<T>(endpoint:string, body: any, token?: string): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    });
  },
  
  patch<T>(endpoint: string, body: any, token?: string): Promise<T> {
     return request<T>(endpoint, {
      method: 'PATCH',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    });
  },

  delete<T>(endpoint: string, token?: string): Promise<T> {
    return request<T>(endpoint, {
      method: 'DELETE',
      headers: buildHeaders(token),
    });
  },

  verifyEmail(token: string): Promise<{ message: string }> {
    return this.post('/api/auth/verify-email', { token });
  },

  // Broker Account Methods
  getAccounts(token: string): Promise<BrokerAccount[]> {
    return this.get<BrokerAccount[]>('/api/broker-accounts', token);
  },

  createAccount(data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount> {
    return this.post<BrokerAccount>('/api/broker-accounts', data, token);
  },
  
  updateAccount(id: string, data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount> {
    return this.patch<BrokerAccount>(`/api/broker-accounts/${id}`, data, token);
  },

  deleteAccount(id: string, token: string): Promise<{ message: string }> {
    return this.delete(`/api/broker-accounts/${id}`, token);
  },
  
  getObjectivesProgress(id: string, token: string): Promise<ObjectiveProgress[]> {
    return this.get<ObjectiveProgress[]>(`/api/broker-accounts/${id}/objectives`, token);
  },

  getSmartLimitsProgress(id: string, token: string): Promise<SmartLimitProgress> {
    return this.get<SmartLimitProgress>(`/api/broker-accounts/${id}/smart-limits-progress`, token);
  },
  
  getWeeklyDebrief(accountId: string, token: string): Promise<{ debrief: string }> {
    return this.post<{ debrief: string }>(`/api/broker-accounts/${accountId}/weekly-debrief`, {}, token);
  },

  getDailyDebrief(accountId: string, token: string): Promise<{ debrief: string }> {
    return this.post<{ debrief: string }>(`/api/broker-accounts/${accountId}/daily-debrief`, {}, token);
  },

  // Playbook Methods
  getPlaybooks(token: string): Promise<Playbook[]> {
    return this.get<Playbook[]>('/api/playbooks', token);
  },
  getCommunityPlaybooks(token: string): Promise<CommunityPlaybook[]> {
    return this.get<CommunityPlaybook[]>('/api/playbooks/community', token);
  },
  createPlaybook(data: Partial<Playbook>, token: string): Promise<Playbook> {
    return this.post<Playbook>('/api/playbooks', data, token);
  },
  updatePlaybook(id: string, data: Partial<Playbook>, token: string): Promise<Playbook> {
    return this.patch<Playbook>(`/api/playbooks/${id}`, data, token);
  },
  deletePlaybook(id: string, token: string): Promise<{ message: string }> {
    return this.delete(`/api/playbooks/${id}`, token);
  },
  getPlaybookStats(id: string, token: string): Promise<PlaybookStats> {
    return this.get<PlaybookStats>(`/api/playbooks/${id}/stats`, token);
  },

  // Checklist Rule Methods
  getChecklistRules(token: string): Promise<ChecklistRule[]> {
    return this.get<ChecklistRule[]>('/api/checklist-rules', token);
  },
  createChecklistRule(data: { rule: string }, token: string): Promise<ChecklistRule> {
    return this.post<ChecklistRule>('/api/checklist-rules', data, token);
  },
  updateChecklistRule(id: string, data: { rule: string }, token: string): Promise<ChecklistRule> {
    return this.patch<ChecklistRule>(`/api/checklist-rules/${id}`, data, token);
  },
  deleteChecklistRule(id: string, token: string): Promise<{ message: string }> {
    return this.delete(`/api/checklist-rules/${id}`, token);
  },

  // Trade Methods
  getTrades(brokerAccountId: string, token: string): Promise<Trade[]> {
    return this.get<Trade[]>(`/api/trades?brokerAccountId=${brokerAccountId}`, token);
  },
  createTrade(data: Partial<Trade>, token: string): Promise<Trade> {
    return this.post<Trade>('/api/trades', data, token);
  },
  updateTrade(id: string, data: Partial<Trade>, token: string): Promise<Trade> {
    return this.patch<Trade>(`/api/trades/${id}`, data, token);
  },
  deleteTrade(id: string, token: string): Promise<{ message: string }> {
    return this.delete(`/api/trades/${id}`, token);
  },
  analyzeTrade(id: string, token: string): Promise<Trade> {
    return this.post<Trade>(`/api/trades/${id}/analyze`, {}, token);
  },
  preTradeCheck(data: { playbookId: string; screenshotBeforeUrl: string; asset: string }, token: string): Promise<PreTradeCheckResult> {
    return this.post<PreTradeCheckResult>('/api/trades/pre-trade-check', data, token);
  },

  // Trade Journal Methods
  createTradeJournal(tradeId: string, data: Omit<TradeJournal, 'id' | 'tradeId'>, token: string): Promise<TradeJournal> {
    return this.post<TradeJournal>(`/api/trades/${tradeId}/journal`, data, token);
  },
  updateTradeJournal(journalId: string, data: Partial<Omit<TradeJournal, 'id' | 'tradeId'>>, token: string): Promise<TradeJournal> {
    return this.patch<TradeJournal>(`/api/trade-journals/${journalId}`, data, token);
  },
  
  // Billing Methods
  getBillingConfig(token: string): Promise<{ clientSideToken: string }> {
    return this.get<{ clientSideToken: string }>('/api/billing/config', token);
  },
  createCheckoutTransaction(token: string): Promise<{ transactionId: string }> {
    return this.post<{ transactionId: string }>('/api/billing/checkout', {}, token);
  },
  
  // Admin Methods
  getAdminStats(token: string): Promise<AdminStats> {
    return this.get<AdminStats>('/api/admin/stats', token);
  },
  getAdminUsers(token: string): Promise<AdminUser[]> {
    return this.get<AdminUser[]>('/api/admin/users', token);
  },
  grantProAccess(userId: string, data: { expiresAt?: string | null; reason?: string }, token: string): Promise<AdminUser> {
    return this.patch<AdminUser>(`/api/admin/users/${userId}/grant-pro`, data, token);
  },
  revokeProAccess(userId: string, token: string): Promise<AdminUser> {
    return this.delete<AdminUser>(`/api/admin/users/${userId}/grant-pro`, token);
  },
  deleteUser(userId: string, token: string): Promise<{ message: string }> {
    return this.delete(`/api/admin/users/${userId}`, token);
  },

  // Asset Methods
  getAssetSpecs(token: string): Promise<AssetSpecification[]> {
      return this.get<AssetSpecification[]>('/api/assets/specs', token);
  },
  createAssetSpec(data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification> {
    return this.post<AssetSpecification>('/api/assets', data, token);
  },
  updateAssetSpec(id: string, data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification> {
    return this.patch<AssetSpecification>(`/api/assets/${id}`, data, token);
  },
  deleteAssetSpec(id: string, token: string): Promise<{ message: string }> {
    return this.delete(`/api/assets/${id}`, token);
  }
};


export default api;