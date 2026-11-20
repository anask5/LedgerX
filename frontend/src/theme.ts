import { MD3LightTheme, configureFonts } from 'react-native-paper';
import type { MD3Theme } from 'react-native-paper';

export const colors = {
  primary: '#0F766E',
  background: '#F8FAFC',
  text: '#0F172A',
  warning: '#D97706',
  danger: '#DC2626',
  success: '#16A34A',
  grey: '#64748B',
  white: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
};

export const statusBadge = {
  active: { bg: '#DCFCE7', fg: '#16A34A' },
  expiringSoon: { bg: '#FEF3C7', fg: '#D97706' },
  expired: { bg: '#FEE2E2', fg: '#DC2626' },
  none: { bg: '#F1F5F9', fg: '#64748B' },
};

export const theme: MD3Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary,
    background: colors.background,
    surface: colors.surface,
    surfaceVariant: colors.surfaceVariant,
    onSurface: colors.text,
    error: colors.danger,
    onBackground: colors.text,
    outline: colors.grey,
  },
};
