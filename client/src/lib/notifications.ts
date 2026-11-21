import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { api } from '../api/client';

type ExpoNotifications = typeof import('expo-notifications');

function getNotifications(): ExpoNotifications | null {
  if (Platform.OS === 'web') return null;

  // In Expo Go on Android SDK 52+, remote notifications are not supported
  try {
    if (Constants.appOwnership === 'expo') {
      return null;
    }
    return require('expo-notifications') as ExpoNotifications;
  } catch {
    return null;
  }
}

/**
 * Register for push notifications and send the token to the backend.
 */
export async function registerForPush(): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId || projectId === 'your-eas-project-id') {
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    try {
      await api.request('/me/push-token', {
        method: 'PUT',
        body: JSON.stringify({ expo_push_token: token }),
      });
    } catch {
      // Ignore background token sync failure
    }

    return token;
  } catch {
    return null;
  }
}

/**
 * Set up notification tap handler → deep link to receipt.
 */
export function setupNotificationHandler(): void {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    Notifications.addNotificationResponseReceivedListener((response: any) => {
      const receiptId = response.notification.request.content.data?.receipt_id;
      if (receiptId) {
        router.push(`/receipt/${receiptId}`);
      }
    });

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // Ignore in unsupported environments
  }
}
