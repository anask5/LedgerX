import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { router } from 'expo-router';
import { formatINR } from '../lib/formatINR';
import { formatDate } from '../lib/formatDate';
import { StatusBadge } from './StatusBadge';
import { colors } from '../theme';
import type { Receipt } from '../api/types';

interface ReceiptCardProps {
  receipt: Receipt;
  compact?: boolean;
}

export function ReceiptCard({ receipt, compact = false }: ReceiptCardProps) {
  const handlePress = () => {
    router.push(`/receipt/${receipt.id}`);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.content}>
          {receipt.thumbnail_url && !compact && (
            <View style={styles.thumbnailContainer}>
              <Card.Cover
                source={{ uri: receipt.thumbnail_url }}
                style={styles.thumbnail}
              />
            </View>
          )}
          <View style={styles.info}>
            <View style={styles.topRow}>
              <Text variant="titleMedium" style={styles.storeName} numberOfLines={1}>
                {receipt.store_name || 'Unknown Store'}
              </Text>
              {receipt.is_favorite && (
                <Text style={styles.favorite}>★</Text>
              )}
            </View>
            <Text variant="bodySmall" style={styles.date}>
              {formatDate(receipt.purchase_date)}
            </Text>
            <View style={styles.bottomRow}>
              <Text variant="titleMedium" style={styles.amount}>
                {formatINR(receipt.total_amount)}
              </Text>
              <StatusBadge status={getReceiptStatus(receipt)} />
            </View>
            {receipt.category && (
              <Text variant="labelSmall" style={styles.category}>
                {receipt.category}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

function getReceiptStatus(receipt: Receipt): 'active' | 'expiringSoon' | 'expired' | 'none' {
  const deadlines: Date[] = [];

  if (receipt.return_deadline) {
    deadlines.push(new Date(receipt.return_deadline));
  }

  // Collect warranty deadlines from all items
  if (receipt.items) {
    for (const item of receipt.items) {
      if (item.brand_warranty_expiry) deadlines.push(new Date(item.brand_warranty_expiry));
      if (item.extended_warranty_expiry) deadlines.push(new Date(item.extended_warranty_expiry));
    }
  }

  if (deadlines.length === 0) return 'none';

  const now = new Date();
  const soonest = deadlines.reduce((min, d) => (d < min ? d : min));
  const daysLeft = Math.ceil((soonest.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 7) return 'expiringSoon';
  return 'active';
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    backgroundColor: colors.white,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumbnailContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 60,
    height: 60,
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storeName: {
    flex: 1,
    fontWeight: '600',
    color: colors.text,
  },
  favorite: {
    color: colors.warning,
    fontSize: 18,
    marginLeft: 4,
  },
  date: {
    color: colors.grey,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  amount: {
    color: colors.primary,
    fontWeight: '700',
  },
  category: {
    color: colors.grey,
    marginTop: 2,
  },
});
