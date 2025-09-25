import { AdminStats, AdminUser, BrokerAccount, ChecklistRule, ObjectiveProgress, SmartLimitProgress, Playbook, Trade, TradeJournal, PlaybookStats, AssetSpecification } from "../types";

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

  // Playbooks
  getPlaybooks(token: string): Promise<Playbook[]>;
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

const refreshToken = async (): Promise<string | null> => {
    if (isRefreshing) {
        // Avoid race conditions if multiple requests fail at once
        return null;
    }
    isRefreshing = true;

    try {
        const response = await fetch(`${getApiUrl()}/auth/refresh`, {
            method: 'POST',
            credentials: 'include', // Crucial for sending the httpOnly cookie
        });
        
        if (!response.ok) throw new Error("Refresh token is invalid or expired.");

        const result: ApiResponse<{ accessToken: string }> = await response.json();
        if (!result.success || !result.data.accessToken) {
            throw new Error("Invalid response from refresh endpoint.");
        }
        
        const newAccessToken = result.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);

        // Notify the app (e.g., AuthContext) that the token has been updated
        window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: newAccessToken }));
        
        console.log('[API] Token refresh successful.');
        return newAccessToken;
    } catch (error) {
        console.error("[API] Token refresh failed:", error);
        localStorage.removeItem('accessToken');
        // Notify the app to log out the user
        window.dispatchEvent(new Event('logout'));
        return null;
    } finally {
        isRefreshing = false;
    }
};

async function request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const apiUrl = getApiUrl();
  const fullUrl = `${apiUrl}${endpoint}`;

  console.log(`[API] Making ${options.method || 'GET'} request to: ${fullUrl}`);

  try {
    let response = await fetch(fullUrl, options);
    
    // Check for 401 Unauthorized and attempt a token refresh
    if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
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
    return this.post<{ message: string }>('/auth/verify-email', { token });
  },

  // Broker Account Methods
  getAccounts(token: string): Promise<BrokerAccount[]> {
    return this.get<BrokerAccount[]>('/broker-accounts', token);
  },

  createAccount(data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount> {
    return this.post<BrokerAccount>('/broker-accounts', data, token);
  },
  
  updateAccount(id: string, data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount> {
    return this.patch<BrokerAccount>(`/broker-accounts/${id}`, data, token);
  },

  deleteAccount(id: string, token: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/broker-accounts/${id}`, token);
  },
  
  getObjectivesProgress(id: string, token: string): Promise<ObjectiveProgress[]> {
    return this.get<ObjectiveProgress[]>(`/broker-accounts/${id}/objectives`, token);
  },

  getSmartLimitsProgress(id: string, token: string): Promise<SmartLimitProgress> {
    return this.get<SmartLimitProgress>(`/broker-accounts/${id}/smart-limits-progress`, token);
  },

  // Playbook Methods
  getPlaybooks(token: string): Promise<Playbook[]> {
    return this.get<Playbook[]>('/playbooks', token);
  },
  createPlaybook(data: Partial<Playbook>, token: string): Promise<Playbook> {
    return this.post<Playbook>('/playbooks', data, token);
  },
  updatePlaybook(id: string, data: Partial<Playbook>, token: string): Promise<Playbook> {
    return this.patch<Playbook>(`/playbooks/${id}`, data, token);
  },
  deletePlaybook(id: string, token: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/playbooks/${id}`, token);
  },
  getPlaybookStats(id: string, token: string): Promise<PlaybookStats> {
    return this.get<PlaybookStats>(`/playbooks/${id}/stats`, token);
  },

  // Checklist Rule Methods
  getChecklistRules(token: string): Promise<ChecklistRule[]> {
    return this.get<ChecklistRule[]>('/checklist-rules', token);
  },
  createChecklistRule(data: { rule: string }, token: string): Promise<ChecklistRule> {
    return this.post<ChecklistRule>('/checklist-rules', data, token);
  },
  updateChecklistRule(id: string, data: { rule: string }, token: string): Promise<ChecklistRule> {
    return this.patch<ChecklistRule>(`/checklist-rules/${id}`, data, token);
  },
  deleteChecklistRule(id: string, token: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/checklist-rules/${id}`, token);
  },

  // Trade Methods
  getTrades(brokerAccountId: string, token: string): Promise<Trade[]> {
    return this.get<Trade[]>(`/trades?brokerAccountId=${brokerAccountId}`, token);
  },
  createTrade(data: Partial<Trade>, token: string): Promise<Trade> {
    return this.post<Trade>('/trades', data, token);
  },
  updateTrade(id: string, data: Partial<Trade>, token: string): Promise<Trade> {
    return this.patch<Trade>(`/trades/${id}`, data, token);
  },
  deleteTrade(id: string, token: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/trades/${id}`, token);
  },
  analyzeTrade(id: string, token: string): Promise<Trade> {
    return this.post<Trade>(`/trades/${id}/analyze`, {}, token);
  },

  // Trade Journal Methods
  createTradeJournal(tradeId: string, data: Omit<TradeJournal, 'id' | 'tradeId'>, token: string): Promise<TradeJournal> {
    return this.post<TradeJournal>(`/trades/${tradeId}/journal`, data, token);
  },
  updateTradeJournal(journalId: string, data: Partial<Omit<TradeJournal, 'id' | 'tradeId'>>, token: string): Promise<TradeJournal> {
    return this.patch<TradeJournal>(`/trade-journals/${journalId}`, data, token);
  },
  
  // Billing Methods
  getBillingConfig(token: string): Promise<{ clientSideToken: string }> {
    return this.get<{ clientSideToken: string }>('/billing/config', token);
  },
  createCheckoutTransaction(token: string): Promise<{ transactionId: string }> {
    return this.post<{ transactionId: string }>('/billing/checkout', {}, token);
  },
  
  // Admin Methods
  getAdminStats(token: string): Promise<AdminStats> {
    return this.get<AdminStats>('/admin/stats', token);
  },
  getAdminUsers(token: string): Promise<AdminUser[]> {
    return this.get<AdminUser[]>('/admin/users', token);
  },
  grantProAccess(userId: string, data: { expiresAt?: string | null; reason?: string }, token: string): Promise<AdminUser> {
    return this.patch<AdminUser>(`/admin/users/${userId}/grant-pro`, data, token);
  },
  revokeProAccess(userId: string, token: string): Promise<AdminUser> {
    return this.delete<AdminUser>(`/admin/users/${userId}/grant-pro`, token);
  },
  deleteUser(userId: string, token: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/admin/users/${userId}`, token);
  },

  // Asset Methods
  getAssetSpecs(token: string): Promise<AssetSpecification[]> {
      return this.get<AssetSpecification[]>('/assets/specs', token);
  },
  createAssetSpec(data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification> {
    return this.post<AssetSpecification>('/assets', data, token);
  },
  updateAssetSpec(id: string, data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification> {
    return this.patch<AssetSpecification>(`/assets/${id}`, data, token);
  },
  deleteAssetSpec(id: string, token: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/assets/${id}`, token);
  }
};


export default api;