import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { formatINR } from '../lib/formatINR';
import { StatusBadge } from './StatusBadge';
import { colors } from '../theme';
import type { ReceiptItem } from '../api/types';

interface ItemRowProps {
  item: ReceiptItem;
  onEdit?: (item: ReceiptItem) => void;
  onRemove?: (item: ReceiptItem) => void;
  editable?: boolean;
}

export function ItemRow({ item, onEdit, onRemove, editable = false }: ItemRowProps) {
  const statusMap: Record<string, 'active' | 'expiringSoon' | 'expired' | 'none'> = {
    active: 'active',
    expiring_soon: 'expiringSoon',
    expired: 'expired',
    returned: 'none',
    none: 'none',
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainInfo}>
        <View style={styles.nameRow}>
          <Text variant="bodyLarge" style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <StatusBadge status={statusMap[item.status] || 'none'} />
        </View>
        <View style={styles.detailsRow}>
          <Text variant="bodySmall" style={styles.detail}>
            Qty: {item.quantity}
          </Text>
          <Text variant="bodySmall" style={styles.detail}>
            {formatINR(item.price)}
          </Text>
          {item.brand_warranty_months != null && item.brand_warranty_months > 0 && (
            <Text variant="bodySmall" style={styles.detail}>
              Brand: {item.brand_warranty_months}mo
            </Text>
          )}
          {item.extended_warranty_months != null && item.extended_warranty_months > 0 && (
            <Text variant="bodySmall" style={styles.detail}>
              Extended: {item.extended_warranty_months}mo
            </Text>
          )}
        </View>
        {item.brand_warranty_expiry && (
          <Text variant="bodySmall" style={styles.warrantyDate}>
            Brand Warranty until {item.brand_warranty_expiry}
          </Text>
        )}
        {item.extended_warranty_expiry && (
          <Text variant="bodySmall" style={styles.warrantyDate}>
            Extended Warranty until {item.extended_warranty_expiry}
          </Text>
        )}
        {item.serial_number && (
          <Text variant="bodySmall" style={styles.serial}>
            S/N: {item.serial_number}
          </Text>
        )}
      </View>
      {editable && (
        <View style={styles.actions}>
          {onEdit && (
            <IconButton icon="pencil" size={18} onPress={() => onEdit(item)} />
          )}
          {onRemove && (
            <IconButton icon="close" size={18} onPress={() => onRemove(item)} iconColor={colors.danger} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  mainInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontWeight: '500',
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  detail: {
    color: colors.grey,
  },
  serial: {
    color: colors.grey,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  warrantyDate: {
    color: colors.primary,
    marginTop: 2,
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
});
