import React from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { Text, Button, Divider } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useReceipt } from '../../src/hooks/useReceipt';
import { receiptsApi } from '../../src/api/receipts';
import { ImageZoom } from '../../src/components/ImageZoom';
import { FieldRow } from '../../src/components/FieldRow';
import { ItemRow } from '../../src/components/ItemRow';
import { StatusBadge } from '../../src/components/StatusBadge';
import { LoadingSkeleton } from '../../src/components/LoadingSkeleton';
import { ErrorView } from '../../src/components/ErrorView';
import { formatINR } from '../../src/lib/formatINR';
import { formatDate } from '../../src/lib/formatDate';
import { colors } from '../../src/theme';

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receipt, isLoading, isError, refetch, invalidate } = useReceipt(id);
  const queryClient = useQueryClient();

  if (isLoading) return <LoadingSkeleton count={5} />;
  if (isError || !receipt) return <ErrorView onRetry={refetch} />;

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleFavorite = async () => {
    try {
      await receiptsApi.toggleFavorite(id, !receipt.is_favorite);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to update favorite');
    }
  };

  const handleArchive = async () => {
    try {
      await receiptsApi.archive(id, !receipt.is_archived);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      if (!receipt.is_archived) {
        showAlert('Archived', 'Receipt has been archived.');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to archive receipt');
    }
  };

  const executeDelete = async () => {
    try {
      await receiptsApi.delete(id);
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'Failed to delete receipt');
    }
  };

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete Receipt\n\nThis action cannot be undone. Are you sure?')) {
        executeDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Receipt',
      'This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: executeDelete,
        },
      ]
    );
  };

  const getOverallStatus = (): 'active' | 'expiringSoon' | 'expired' | 'none' => {
    const deadlines: Date[] = [];
    if (receipt.return_deadline) deadlines.push(new Date(receipt.return_deadline));
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
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Receipt Image */}
        {receipt.image_url && (
          <ImageZoom uri={receipt.image_url} thumbnailHeight={300} />
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text variant="headlineSmall" style={styles.storeName}>
              {receipt.store_name || 'Unknown Store'}
            </Text>
            <StatusBadge status={getOverallStatus()} />
          </View>
          <Text variant="headlineMedium" style={styles.amount}>
            {formatINR(receipt.total_amount)}
          </Text>
          <Text variant="bodyMedium" style={styles.date}>
            {formatDate(receipt.purchase_date)}
          </Text>
        </View>

        <Divider />

        {/* Action Buttons */}
        <View style={styles.actions}>
          <ActionButton
            icon="🔗"
            label="Share"
            onPress={() => router.push(`/share/${id}`)}
          />
          <ActionButton
            icon={receipt.is_favorite ? '★' : '☆'}
            label="Favorite"
            onPress={handleFavorite}
            active={receipt.is_favorite}
          />
          <ActionButton
            icon="📁"
            label="Folder"
            onPress={() => router.push('/folders')}
          />
          <ActionButton
            icon="🏷️"
            label="Tags"
            onPress={() => router.push('/folders')}
          />
          <ActionButton
            icon="📦"
            label={receipt.is_archived ? 'Unarchive' : 'Archive'}
            onPress={handleArchive}
          />
          <ActionButton
            icon="🗑️"
            label="Delete"
            onPress={handleDelete}
            danger
          />
        </View>

        <Divider />

        {/* Details */}
        <View style={styles.details}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Details
          </Text>
          <FieldRow
            label="Store"
            value={receipt.store_name}
            editable={false}
            onPress={() => router.push(`/review/${id}`)}
          />
          {receipt.store_address && (
            <FieldRow
              label="Address"
              value={receipt.store_address}
              editable={false}
            />
          )}
          {receipt.store_phone && (
            <FieldRow
              label="Phone"
              value={receipt.store_phone}
              editable={false}
            />
          )}
          <FieldRow
            label="Date"
            value={formatDate(receipt.purchase_date)}
            editable={false}
          />
          {receipt.receipt_number && (
            <FieldRow
              label="Receipt #"
              value={receipt.receipt_number}
              editable={false}
            />
          )}
          {receipt.subtotal != null && (
            <FieldRow
              label="Subtotal"
              value={formatINR(receipt.subtotal)}
              editable={false}
            />
          )}
          {receipt.tax != null && (
            <FieldRow
              label="Tax"
              value={formatINR(receipt.tax)}
              editable={false}
            />
          )}
          <FieldRow
            label="Total"
            value={formatINR(receipt.total_amount)}
            editable={false}
          />
          <FieldRow
            label="Payment"
            value={receipt.payment_mode?.replace('_', ' ') || '—'}
            editable={false}
          />
          <FieldRow
            label="Category"
            value={receipt.category || '—'}
            editable={false}
          />
          {receipt.return_deadline && (
            <FieldRow
              label="Return Deadline"
              value={formatDate(receipt.return_deadline)}
              editable={false}
            />
          )}
          {receipt.notes && (
            <FieldRow
              label="Notes"
              value={receipt.notes}
              editable={false}
            />
          )}
        </View>

        {/* Items */}
        {receipt.items && receipt.items.length > 0 && (
          <View style={styles.itemsSection}>
            <Divider />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Items ({receipt.items.length})
            </Text>
            {receipt.items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </View>
        )}

        {/* Tags */}
        {receipt.tags && receipt.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Divider />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Tags
            </Text>
            <View style={styles.tagChips}>
              {receipt.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Edit FAB */}
      <Button
        mode="contained"
        icon="pencil"
        onPress={() => router.push(`/review/${id}`)}
        style={styles.editButton}
        buttonColor={colors.primary}
        contentStyle={styles.editButtonContent}
      >
        Edit
      </Button>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  active,
  danger,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.actionIcon, danger && { opacity: 0.7 }]}>
        {icon}
      </Text>
      <Text
        variant="labelSmall"
        style={[
          styles.actionLabel,
          active && { color: colors.primary, fontWeight: '700' },
          danger && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingBottom: 80,
  },
  header: {
    padding: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  amount: {
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  date: {
    color: colors.grey,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  actionItem: {
    alignItems: 'center',
    minWidth: 52,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionLabel: {
    color: colors.grey,
    fontSize: 10,
  },
  details: {
    paddingTop: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemsSection: {
    marginTop: 4,
  },
  tagsSection: {
    marginTop: 4,
    paddingBottom: 16,
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 6,
  },
  tagChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '500',
  },
  editButton: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    left: 20,
    borderRadius: 24,
  },
  editButtonContent: {
    paddingVertical: 6,
  },
});