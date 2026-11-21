import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { statusBadge as statusColors } from '../theme';

type BadgeStatus = 'active' | 'expiringSoon' | 'expired' | 'none';

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
}

const STATUS_LABELS: Record<BadgeStatus, string> = {
  active: 'Active',
  expiringSoon: 'Expiring Soon',
  expired: 'Expired',
  none: 'No Warranty',
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = statusColors[status];
  const displayLabel = label || STATUS_LABELS[status];

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.fg }]} variant="labelSmall">
        {displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
