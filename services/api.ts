import { AdminStats, AdminUser, BrokerAccount, BrokerAccountType, ChecklistRule, ObjectiveProgress, SmartLimitProgress, Strategy, Trade, TradeJournal } from "../types";

const API_URL = 'http://localhost:8080'; // In a real app, this should be an environment variable

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

  // Strategies
  getStrategies(token: string): Promise<Strategy[]>;
  createStrategy(data: { name: string; description?: string }, token: string): Promise<Strategy>;
  updateStrategy(id: string, data: Partial<Strategy>, token: string): Promise<Strategy>;
  deleteStrategy(id: string, token: string): Promise<{ message: string }>;

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


async function request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
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

  // Strategy Methods
  getStrategies(token: string): Promise<Strategy[]> {
    return (this as ApiService).get<Strategy[]>('/strategies', token);
  },
  createStrategy(data: { name: string; description?: string }, token: string): Promise<Strategy> {
    return (this as ApiService).post<Strategy>('/strategies', data, token);
  },
  updateStrategy(id: string, data: Partial<Strategy>, token: string): Promise<Strategy> {
    return (this as ApiService).patch<Strategy>(`/strategies/${id}`, data, token);
  },
  deleteStrategy(id: string, token: string): Promise<{ message: string }> {
    return (this as ApiService).delete<{ message: string }>(`/strategies/${id}`, token);
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
};


export default api;