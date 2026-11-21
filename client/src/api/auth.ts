import type {
  AuthTokens,
  LoginRequest,
  SignupRequest,
  User,
} from './types';
import { api } from './client';

export const authApi = {
  async login(data: LoginRequest): Promise<AuthTokens> {
    return api.request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
      auth: false,
    });
  },

  async signup(data: SignupRequest): Promise<AuthTokens> {
    return api.request<AuthTokens>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
      auth: false,
    });
  },

  async forgotPassword(email: string): Promise<void> {
    await api.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      auth: false,
    });
  },

  async getMe(): Promise<User> {
    return api.request<User>('/me');
  },

  async updateMe(data: Partial<User>): Promise<User> {
    return api.request<User>('/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteAccount(): Promise<void> {
    await api.request('/me', { method: 'DELETE' });
  },

  async logout(): Promise<void> {
    try {
      await api.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore — still clear tokens locally
    }
  },
};
