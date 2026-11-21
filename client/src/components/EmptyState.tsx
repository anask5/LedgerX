import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { colors } from '../theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '📄', title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text variant="headlineSmall" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={styles.message}>
        {message}
      </Text>
      {actionLabel && onAction && (
        <Button
          mode="contained"
          onPress={onAction}
          style={styles.button}
          buttonColor={colors.primary}
        >
          {actionLabel}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  message: {
    textAlign: 'center',
    color: colors.grey,
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    borderRadius: 24,
    paddingHorizontal: 8,
  },
});
