import api from '../../../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Export Manager' | 'Logistics Coordinator' | 'Research Analyst';
  organization: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: User;
}

export interface SeedAccount {
  role: string;
  email: string;
  pass: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/v1/auth/login', { email, password });
    if (data.token) {
      localStorage.setItem('ceylon_auth_user', JSON.stringify(data.user));
      localStorage.setItem('ceylon_auth_token', data.token);
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/v1/auth/logout');
    } catch {
      // Ignore network failures on logout
    } finally {
      localStorage.removeItem('ceylon_auth_user');
      localStorage.removeItem('ceylon_auth_token');
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = localStorage.getItem('ceylon_auth_token');
      if (!token) return null;
      const { data } = await api.get<{ success: boolean; user: User }>('/v1/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data.user;
    } catch {
      return null;
    }
  },

  async getSeedAccounts(): Promise<SeedAccount[]> {
    try {
      const { data } = await api.get<{ success: boolean; accounts: SeedAccount[] }>('/v1/auth/seed-accounts');
      return data.accounts;
    } catch {
      return [
        { role: 'Admin', email: 'admin@ceylonintelligence.lk', pass: 'CeylonAdmin2026!' },
        { role: 'Export Manager', email: 'export.manager@ceylonintelligence.lk', pass: 'ExportMgr2026!' },
        { role: 'Logistics Coordinator', email: 'logistics@ceylonintelligence.lk', pass: 'Logistics2026!' },
        { role: 'Research Analyst', email: 'analyst@ceylonintelligence.lk', pass: 'Analyst2026!' },
      ];
    }
  },
};
