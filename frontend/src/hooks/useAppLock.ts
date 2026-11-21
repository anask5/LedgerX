import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { secureStore } from '../lib/secureStore';

const LOCK_TIMEOUT_MS = 30_000; // 30 seconds
const APP_LOCK_KEY = 'receiptwise_app_lock_enabled';

export function useAppLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    // Check if app lock is enabled
    checkEnabled();
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isEnabled]);

  const checkEnabled = async () => {
    try {
      const val = await secureStore.getAccessToken(); // Using a simple store check
      // In a real app, you'd store a separate "lock enabled" preference
      setIsEnabled(false); // Default off
    } catch {
      setIsEnabled(false);
    }
  };

  const handleAppStateChange = async (state: AppStateStatus) => {
    if (state === 'background') {
      backgroundedAt.current = Date.now();
    }
    if (
      state === 'active' &&
      backgroundedAt.current &&
      Date.now() - backgroundedAt.current > LOCK_TIMEOUT_MS
    ) {
      setIsLocked(true);
      await authenticate();
    }
  };

  const authenticate = useCallback(async (): Promise<boolean> => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      setIsLocked(false);
      return true;
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      setIsLocked(false);
      return true;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock LedgerX',
      fallbackLabel: 'Use device PIN',
      cancelLabel: 'Cancel',
    });

    setIsLocked(!result.success);
    return result.success;
  }, []);

  const toggleLock = useCallback(async (enable: boolean) => {
    if (enable) {
      const success = await authenticate();
      if (success) {
        setIsEnabled(true);
      }
    } else {
      setIsEnabled(false);
    }
  }, [authenticate]);

  return {
    isLocked,
    isEnabled,
    authenticate,
    toggleLock,
  };
}
