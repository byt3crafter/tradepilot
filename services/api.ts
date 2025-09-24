import { AdminStats, AdminUser, BrokerAccount, BrokerAccountType, ChecklistRule, ObjectiveProgress, SmartLimitProgress, Playbook, Trade, TradeJournal, PlaybookStats, AssetSpecification } from "../types";

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

// FIX: Define a type for the API service to help TypeScript correctly infer generic method types.
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

const api: ApiService = {
  async get<T>(endpoint: string, token?: string): Promise<T> {
    return request<T>(endpoint, {
      method: 'GET',
      headers: buildHeaders(token),
    });
  },

  async post<T>(endpoint:string, body: any, token?: string): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    });
  },
  
  async patch<T>(endpoint: string, body: any, token?: string): Promise<T> {
     return request<T>(endpoint, {
      method: 'PATCH',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    });
  },

  async delete<T>(endpoint: string, token?: string): Promise<T> {
    return request<T>(endpoint, {
      method: 'DELETE',
      headers: buildHeaders(token),
    });
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    return request<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ token }),
    });
  },

  // Broker Account Methods
  getAccounts(token: string): Promise<BrokerAccount[]> {
    return (this as ApiService).get<BrokerAccount[]>('/broker-accounts', token);
  },

  createAccount(data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount> {
    return (this as ApiService).post<BrokerAccount>('/broker-accounts', data, token);
  },
  
  updateAccount(id: string, data: Partial<BrokerAccount>, token: string): Promise<BrokerAccount> {
    return (this as ApiService).patch<BrokerAccount>(`/broker-accounts/${id}`, data, token);
  },

  deleteAccount(id: string, token: string): Promise<{ message: string }> {
    return (this as ApiService).delete<{ message: string }>(`/broker-accounts/${id}`, token);
  },
  
  getObjectivesProgress(id: string, token: string): Promise<ObjectiveProgress[]> {
    return (this as ApiService).get<ObjectiveProgress[]>(`/broker-accounts/${id}/objectives`, token);
  },

  getSmartLimitsProgress(id: string, token: string): Promise<SmartLimitProgress> {
    return (this as ApiService).get<SmartLimitProgress>(`/broker-accounts/${id}/smart-limits-progress`, token);
  },

  // Playbook Methods
  getPlaybooks(token: string): Promise<Playbook[]> {
    return (this as ApiService).get<Playbook[]>('/playbooks', token);
  },
  createPlaybook(data: Partial<Playbook>, token: string): Promise<Playbook> {
    return (this as ApiService).post<Playbook>('/playbooks', data, token);
  },
  updatePlaybook(id: string, data: Partial<Playbook>, token: string): Promise<Playbook> {
    return (this as ApiService).patch<Playbook>(`/playbooks/${id}`, data, token);
  },
  deletePlaybook(id: string, token: string): Promise<{ message: string }> {
    return (this as ApiService).delete<{ message: string }>(`/playbooks/${id}`, token);
  },
  getPlaybookStats(id: string, token: string): Promise<PlaybookStats> {
    return (this as ApiService).get<PlaybookStats>(`/playbooks/${id}/stats`, token);
  },

  // Checklist Rule Methods
  getChecklistRules(token: string): Promise<ChecklistRule[]> {
    return (this as ApiService).get<ChecklistRule[]>('/checklist-rules', token);
  },
  createChecklistRule(data: { rule: string }, token: string): Promise<ChecklistRule> {
    return (this as ApiService).post<ChecklistRule>('/checklist-rules', data, token);
  },
  updateChecklistRule(id: string, data: { rule: string }, token: string): Promise<ChecklistRule> {
    return (this as ApiService).patch<ChecklistRule>(`/checklist-rules/${id}`, data, token);
  },
  deleteChecklistRule(id: string, token: string): Promise<{ message: string }> {
    return (this as ApiService).delete<{ message: string }>(`/checklist-rules/${id}`, token);
  },

  // Trade Methods
  getTrades(brokerAccountId: string, token: string): Promise<Trade[]> {
    return (this as ApiService).get<Trade[]>(`/trades?brokerAccountId=${brokerAccountId}`, token);
  },
  createTrade(data: Partial<Trade>, token: string): Promise<Trade> {
    return (this as ApiService).post<Trade>('/trades', data, token);
  },
  updateTrade(id: string, data: Partial<Trade>, token: string): Promise<Trade> {
    return (this as ApiService).patch<Trade>(`/trades/${id}`, data, token);
  },
  deleteTrade(id: string, token: string): Promise<{ message: string }> {
    return (this as ApiService).delete<{ message: string }>(`/trades/${id}`, token);
  },
  analyzeTrade(id: string, token: string): Promise<Trade> {
    return (this as ApiService).post<Trade>(`/trades/${id}/analyze`, {}, token);
  },

  // Trade Journal Methods
  createTradeJournal(tradeId: string, data: Omit<TradeJournal, 'id' | 'tradeId'>, token: string): Promise<TradeJournal> {
    return (this as ApiService).post<TradeJournal>(`/trades/${tradeId}/journal`, data, token);
  },
  updateTradeJournal(journalId: string, data: Partial<Omit<TradeJournal, 'id' | 'tradeId'>>, token: string): Promise<TradeJournal> {
    return (this as ApiService).patch<TradeJournal>(`/trade-journals/${journalId}`, data, token);
  },
  
  // Billing Methods
  getBillingConfig(token: string): Promise<{ clientSideToken: string }> {
    return (this as ApiService).get<{ clientSideToken: string }>('/billing/config', token);
  },
  createCheckoutTransaction(token: string): Promise<{ transactionId: string }> {
    return (this as ApiService).post<{ transactionId: string }>('/billing/checkout', {}, token);
  },
  
  // Admin Methods
  getAdminStats(token: string): Promise<AdminStats> {
    return (this as ApiService).get<AdminStats>('/admin/stats', token);
  },
  getAdminUsers(token: string): Promise<AdminUser[]> {
    return (this as ApiService).get<AdminUser[]>('/admin/users', token);
  },
  grantProAccess(userId: string, data: { expiresAt?: string | null; reason?: string }, token: string): Promise<AdminUser> {
    return (this as ApiService).patch<AdminUser>(`/admin/users/${userId}/grant-pro`, data, token);
  },
  revokeProAccess(userId: string, token: string): Promise<AdminUser> {
    return (this as ApiService).delete<AdminUser>(`/admin/users/${userId}/grant-pro`, token);
  },
  deleteUser(userId: string, token: string): Promise<{ message: string }> {
    return (this as ApiService).delete<{ message: string }>(`/admin/users/${userId}`, token);
  },

  // Asset Methods
  getAssetSpecs(token: string): Promise<AssetSpecification[]> {
      return (this as ApiService).get<AssetSpecification[]>('/assets/specs', token);
  },
  createAssetSpec(data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification> {
    return (this as ApiService).post<AssetSpecification>('/assets', data, token);
  },
  updateAssetSpec(id: string, data: Partial<AssetSpecification>, token: string): Promise<AssetSpecification> {
    return (this as ApiService).patch<AssetSpecification>(`/assets/${id}`, data, token);
  },
  deleteAssetSpec(id: string, token: string): Promise<{ message: string }> {
    return (this as ApiService).delete<{ message: string }>(`/assets/${id}`, token);
  }
};


export default api;