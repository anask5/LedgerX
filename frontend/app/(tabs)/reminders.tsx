import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { router } from 'expo-router';
import { useReminders } from '../../src/hooks/useReminders';
import { useQueryClient } from '@tanstack/react-query';
import { remindersApi } from '../../src/api/reminders';
import { StatusBadge } from '../../src/components/StatusBadge';
import { LoadingSkeleton } from '../../src/components/LoadingSkeleton';
import { ErrorView } from '../../src/components/ErrorView';
import { EmptyState } from '../../src/components/EmptyState';
import { formatDate, deadlineLabel } from '../../src/lib/formatDate';
import { colors } from '../../src/theme';
import type { Reminder } from '../../src/api/types';

type TabValue = 'upcoming' | 'expiring_soon' | 'expired';

export default function RemindersScreen() {
  const [tab, setTab] = useState<TabValue>('upcoming');
  const { data: reminders, isLoading, isError, refetch } = useReminders(tab);
  const queryClient = useQueryClient();

  const handleSnooze = async (id: string) => {
    try {
      await remindersApi.snooze(id, 3); // Snooze for 3 days
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    } catch {
      // Handle error
    }
  };

  const statusMap: Record<TabValue, 'active' | 'expiringSoon' | 'expired'> = {
    upcoming: 'active',
    expiring_soon: 'expiringSoon',
    expired: 'expired',
  };

  const renderReminder = ({ item }: { item: Reminder }) => (
    <TouchableOpacity
      style={styles.reminderCard}
      onPress={() => router.push(`/receipt/${item.receipt_id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.reminderInfo}>
        <Text variant="bodyLarge" style={styles.itemName}>
          {item.item_name}
        </Text>
        <Text variant="bodySmall" style={styles.storeName}>
          {item.store_name}
        </Text>
        <Text variant="bodySmall" style={styles.deadline}>
          {item.type === 'return_deadline'
            ? 'Return by'
            : item.type === 'brand_warranty_expiry'
              ? 'Brand warranty until'
              : 'Extended warranty until'}{' '}
          {formatDate(item.deadline)}
        </Text>
      </View>
      <View style={styles.reminderRight}>
        <StatusBadge
          status={statusMap[tab]}
          label={deadlineLabel(item.deadline)}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={(val) => setTab(val as TabValue)}
        buttons={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'expiring_soon', label: 'Expiring' },
          { value: 'expired', label: 'Expired' },
        ]}
        style={styles.tabs}
      />

      {isLoading ? (
        <LoadingSkeleton count={5} style="row" />
      ) : isError ? (
        <ErrorView onRetry={() => refetch()} />
      ) : !reminders || reminders.length === 0 ? (
        <EmptyState
          icon={tab === 'upcoming' ? '📅' : tab === 'expiring_soon' ? '⏰' : '📋'}
          title={`No ${tab.replace('_', ' ')} reminders`}
          message="Your warranty and return reminders will appear here"
        />
      ) : (
        <FlatList
          data={reminders}
          keyExtractor={(item) => item.id}
          renderItem={renderReminder}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabs: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderRadius: 12,
    elevation: 1,
  },
  reminderInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: '500',
    color: colors.text,
  },
  storeName: {
    color: colors.grey,
    marginTop: 2,
  },
  deadline: {
    color: colors.grey,
    marginTop: 2,
  },
  reminderRight: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
});
