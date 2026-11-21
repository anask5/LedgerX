import React, { useEffect, useRef } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { BackHandler, Platform, ToastAndroid, Pressable, StyleSheet } from 'react-native';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ChevronLeft } from 'lucide-react-native';
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

const OBSIDIAN = {
  bg: '#09090B',
  headerBg: '#0E0E12',
  surface: '#121216',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FAFAFA',
  emerald: '#10B981',
};

const obsidianPaperTheme = {
  ...MD3DarkTheme,
  ...theme,
  dark: true,
  colors: {
    ...MD3DarkTheme.colors,
    ...(theme?.colors || {}),
    primary: OBSIDIAN.emerald,
    background: OBSIDIAN.bg,
    surface: OBSIDIAN.surface,
    surfaceVariant: '#18181E',
    onSurface: OBSIDIAN.textPrimary,
    onBackground: OBSIDIAN.textPrimary,
  },
};

function HeaderBackButton() {
  return (
    <Pressable
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }}
      hitSlop={10}
      style={({ pressed }) => [
        styles.backPill,
        pressed && { opacity: 0.75, transform: [{ scale: 0.94 }] },
      ]}
    >
      <ChevronLeft size={20} color={OBSIDIAN.emerald} strokeWidth={2.4} />
    </Pressable>
  );
}

function RootNavigator() {
  const lastBackPressAt = useRef(0);
  const segments = useSegments();
  const { isAuthenticated, isLoading } = useAuth();

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

  const obsidianHeaderOptions = {
    headerStyle: {
      backgroundColor: OBSIDIAN.headerBg,
    },
    headerTintColor: OBSIDIAN.textPrimary,
    headerTitleStyle: {
      color: OBSIDIAN.textPrimary,
      fontWeight: '700' as const,
      fontSize: 17,
    },
    headerShadowVisible: false,
    headerBackTitle: '',
    headerLeft: () => <HeaderBackButton />,
  };

  return (
    <>
      <StatusBar style="light" backgroundColor={OBSIDIAN.bg} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: OBSIDIAN.bg },
          animation: 'fade_from_bottom',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="receipt/[id]"
          options={{
            ...obsidianHeaderOptions,
            headerShown: true,
            title: 'Receipt Details',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="review/[id]"
          options={{
            ...obsidianHeaderOptions,
            headerShown: true,
            title: 'Review & Edit',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="share/[id]"
          options={{
            ...obsidianHeaderOptions,
            headerShown: true,
            title: 'Share Proof',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="processing/[id]"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="folders"
          options={{
            ...obsidianHeaderOptions,
            headerShown: true,
            title: 'Folders & Tags',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="filters"
          options={{
            ...obsidianHeaderOptions,
            headerShown: true,
            title: 'Search & Filters',
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: OBSIDIAN.bg }}>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={obsidianPaperTheme}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  backPill: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Platform.OS === 'web' ? 12 : 6,
  },
});