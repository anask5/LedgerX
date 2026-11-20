import React, { useEffect, useRef } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '../src/hooks/useAuth';
import { theme } from '../src/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const lastBackPressAt = useRef(0);
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const inTabs = segments[0] === '(tabs)';

      if (inTabs) {
        const activeTab = segments.join('/').replace(/^\(tabs\)\/?/, '') || 'index';
        if (activeTab !== 'index') {
          router.replace('/(tabs)');
          return true;
        }
      }

      if (!inTabs && segments.length > 0 && router.canGoBack()) {
        router.back();
        return true;
      }

      if (!inTabs && segments.length > 0) {
        router.replace('/(tabs)');
        return true;
      }

      const now = Date.now();
      if (now - lastBackPressAt.current < 2000) {
        return false;
      }

      lastBackPressAt.current = now;
      ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);
      return true;
    });

    return () => subscription.remove();
  }, [segments]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Main Tab Navigator (Home, Vault, Add, Reminders, Settings) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Auth Navigator (Login, Signup, Forgot Password) */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Stack/Modal Screens */}
        <Stack.Screen
          name="receipt/[id]"
          options={{ headerShown: true, title: 'Receipt Details', presentation: 'card' }}
        />
        <Stack.Screen
          name="review/[id]"
          options={{ headerShown: true, title: 'Review & Edit', presentation: 'card' }}
        />
        <Stack.Screen
          name="share/[id]"
          options={{ headerShown: true, title: 'Share Proof', presentation: 'modal' }}
        />
        <Stack.Screen
          name="processing/[id]"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="folders"
          options={{ headerShown: true, title: 'Folders & Tags', presentation: 'modal' }}
        />
        <Stack.Screen
          name="filters"
          options={{ headerShown: true, title: 'Search & Filters', presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}