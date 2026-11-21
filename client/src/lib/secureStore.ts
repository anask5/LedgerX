import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'receiptwise_access_token';
const REFRESH_TOKEN_KEY = 'receiptwise_refresh_token';

async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const secureStore = {
  async getAccessToken(): Promise<string | null> {
    return getItem(ACCESS_TOKEN_KEY);
  },

  async setAccessToken(token: string): Promise<void> {
    await setItem(ACCESS_TOKEN_KEY, token);
  },

  async getRefreshToken(): Promise<string | null> {
    return getItem(REFRESH_TOKEN_KEY);
  },

  async setRefreshToken(token: string): Promise<void> {
    await setItem(REFRESH_TOKEN_KEY, token);
  },

  async setTokens(access: string, refresh: string): Promise<void> {
    await Promise.all([
      setItem(ACCESS_TOKEN_KEY, access),
      setItem(REFRESH_TOKEN_KEY, refresh),
    ]);
  },

  async clearTokens(): Promise<void> {
    await Promise.all([
      deleteItem(ACCESS_TOKEN_KEY),
      deleteItem(REFRESH_TOKEN_KEY),
    ]);
  },
};