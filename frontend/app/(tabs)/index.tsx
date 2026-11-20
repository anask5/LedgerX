import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { receiptsApi } from '../../src/api/receipts';
import { remindersApi } from '../../src/api/reminders';
import { ReceiptCard } from '../../src/components/ReceiptCard';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingSkeleton } from '../../src/components/LoadingSkeleton';
import { ErrorView } from '../../src/components/ErrorView';
import { StatusBadge } from '../../src/components/StatusBadge';
import { formatDate, deadlineLabel } from '../../src/lib/formatDate';
import { colors } from '../../src/theme';
export default function HomeScreen() {
  const recentReceipts = useQuery({
    queryKey: ['receipts', { sort: 'newest', page_size: 5 }],
    queryFn: () => receiptsApi.list({ sort: 'newest', page_size: 5, page: 1 }),
  });

  const expiringReminders = useQuery({
    queryKey: ['reminders', 'expiring_soon'],
    queryFn: () => remindersApi.listExpiringSoon(),
  });

  const isLoading = recentReceipts.isLoading;
  const isError = recentReceipts.isError;
  const hasReceipts = (recentReceipts.data?.data?.length ?? 0) > 0;
  const hasExpiring = (expiringReminders.data?.length ?? 0) > 0;

  const onRefresh = () => {
    recentReceipts.refetch();
    expiringReminders.refetch();
  };

  if (isLoading) return <LoadingSkeleton count={4} />;
  if (isError) return <ErrorView onRetry={onRefresh} />;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.greeting}>
            ReceiptWise
          </Text>
          <Text variant="bodyMedium" style={styles.subGreeting}>
            Your receipts, organized & safe
          </Text>
        </View>

        {/* Expiring Soon Section */}
        {hasExpiring && (
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              ⏰ Expiring Soon
            </Text>
            {expiringReminders.data!.slice(0, 3).map((reminder) => (
              <TouchableOpacity
                key={reminder.id}
                style={styles.expiringCard}
                onPress={() => router.push(`/receipt/${reminder.receipt_id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.expiringInfo}>
                  <Text variant="bodyMedium" style={styles.expiringName}>
                    {reminder.item_name}
                  </Text>
                  <Text variant="bodySmall" style={styles.expiringStore}>
                    {reminder.store_name} · {reminder.type === 'brand_warranty_expiry' ? 'Brand' : reminder.type === 'extended_warranty_expiry' ? 'Ext' : 'Return'} · {formatDate(reminder.deadline)}
                  </Text>
                </View>
                <StatusBadge
                  status="expiringSoon"
                  label={deadlineLabel(reminder.deadline)}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Receipts */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            🧾 Recent Receipts
          </Text>
          {hasReceipts ? (
            recentReceipts.data!.data.map((receipt) => (
              <ReceiptCard key={receipt.id} receipt={receipt} compact />
            ))
          ) : (
            <EmptyState
              icon="🧾"
              title="No receipts yet"
              message="Snap your first receipt →"
              actionLabel="Add Receipt"
              onAction={() => router.push('/(tabs)/add')}
            />
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        label="Add Receipt"
        style={styles.fab}
        color={colors.white}
        customSize={56}
        onPress={() => router.push('/(tabs)/add')}
      />
    </View>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: {
    fontWeight: '700',
    color: colors.primary,
  },
  subGreeting: {
    color: colors.grey,
    marginTop: 2,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  expiringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    elevation: 1,
  },
  expiringInfo: {
    flex: 1,
  },
  expiringName: {
    fontWeight: '500',
  },
  expiringStore: {
    color: colors.grey,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    backgroundColor: colors.primary,
    borderRadius: 28,
  },
});
