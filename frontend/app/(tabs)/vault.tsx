import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Searchbar, Chip, IconButton } from 'react-native-paper';
import { router } from 'expo-router';
import { useReceipts } from '../../src/hooks/useReceipts';
import { ReceiptCard } from '../../src/components/ReceiptCard';
import { LoadingSkeleton } from '../../src/components/LoadingSkeleton';
import { ErrorView } from '../../src/components/ErrorView';
import { EmptyState } from '../../src/components/EmptyState';
import { colors } from '../../src/theme';
import type { ReceiptFilters } from '../../src/api/types';

const CATEGORIES = ['Electronics', 'Groceries', 'Clothing', 'Food', 'Medical', 'Fuel', 'Other'];

export default function VaultScreen() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | undefined>();
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [isGridView, setIsGridView] = useState(false);

  const filters: ReceiptFilters = useMemo(
    () => ({
      q: search || undefined,
      category: activeCategory,
      is_favorite: favoritesOnly || undefined,
      sort: 'newest',
    }),
    [search, activeCategory, favoritesOnly]
  );

  const {
    receipts,
    total,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useReceipts(filters);

  // Debounced search
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((text: string) => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => setSearch(text), 300);
    setSearchTimer(timer);
  }, [searchTimer]);

  const renderFooter = () => {
    if (isFetchingNextPage) return <LoadingSkeleton count={2} />;
    return null;
  };

  if (isLoading) return <LoadingSkeleton count={6} />;
  if (isError) return <ErrorView onRetry={() => refetch()} />;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <Searchbar
          placeholder="Search receipts..."
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            handleSearch(text);
          }}
          style={styles.searchbar}
          inputStyle={styles.searchInput}
        />
        <IconButton
          icon={isGridView ? 'view-list' : 'view-grid'}
          onPress={() => setIsGridView(!isGridView)}
        />
        <IconButton
          icon="filter-variant"
          onPress={() => router.push('/filters')}
        />
      </View>

      {/* Filter Chips */}
      <View style={styles.chipRow}>
        <Chip
          selected={favoritesOnly}
          onPress={() => setFavoritesOnly(!favoritesOnly)}
          style={styles.chip}
          compact
        >
          ★ Favorites
        </Chip>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            selected={activeCategory === cat}
            onPress={() =>
              setActiveCategory(activeCategory === cat ? undefined : cat)
            }
            style={styles.chip}
            compact
          >
            {cat}
          </Chip>
        ))}
      </View>

      {/* Receipt List */}
      {receipts.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No receipts found"
          message={search ? 'Try a different search' : 'Start by adding your first receipt'}
          actionLabel="Add Receipt"
          onAction={() => router.push('/(tabs)/add')}
        />
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReceiptCard receipt={item} />}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={() => {
                refetch();
              }}
            />
          }
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  searchbar: {
    flex: 1,
    backgroundColor: colors.white,
    elevation: 1,
  },
  searchInput: {
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: colors.surfaceVariant,
  },
  list: {
    paddingBottom: 20,
  },
});
