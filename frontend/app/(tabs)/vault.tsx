import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Search,
  X,
  LayoutGrid,
  List as ListIcon,
  SlidersHorizontal,
  Star,
  Calendar,
  ChevronRight,
  Sparkles,
  Plus,
  AlertCircle,
  RotateCcw,
  FolderArchive,
  Laptop,
  ShoppingCart,
  Shirt,
  Utensils,
  HeartPulse,
  Fuel,
  Tag,
} from 'lucide-react-native';
import { useReceipts } from '../../src/hooks/useReceipts';
import { formatDate } from '../../src/lib/formatDate';
import type { ReceiptFilters } from '../../src/api/types';

const CATEGORIES = [
  'Electronics',
  'Groceries',
  'Clothing',
  'Food',
  'Medical',
  'Fuel',
  'Other',
];

const OBSIDIAN = {
  bg: '#09090B',
  surface: '#121216',
  surfaceElevated: '#18181E',
  border: 'rgba(255, 255, 255, 0.08)',
  borderFocus: '#10B981',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  emerald: '#10B981',
  emeraldBg: 'rgba(16, 185, 129, 0.12)',
  emeraldBorder: 'rgba(16, 185, 129, 0.28)',
  amber: '#F59E0B',
  amberBg: 'rgba(245, 158, 11, 0.12)',
  amberBorder: 'rgba(245, 158, 11, 0.28)',
  rose: '#FB7185',
  roseBg: 'rgba(244, 63, 94, 0.12)',
};

const CATEGORY_META: Record<string, { color: string; bg: string; Icon: any }> = {
  electronics: { color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.12)', Icon: Laptop },
  groceries: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', Icon: ShoppingCart },
  clothing: { color: '#C084FC', bg: 'rgba(192, 132, 252, 0.12)', Icon: Shirt },
  food: { color: '#FB923C', bg: 'rgba(251, 146, 60, 0.12)', Icon: Utensils },
  medical: { color: '#FB7185', bg: 'rgba(251, 113, 133, 0.12)', Icon: HeartPulse },
  fuel: { color: '#FACC15', bg: 'rgba(250, 204, 21, 0.12)', Icon: Fuel },
  other: { color: '#A1A1AA', bg: 'rgba(161, 161, 170, 0.12)', Icon: Tag },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ObsidianSkeletonGrid({ isGrid }: { isGrid: boolean }) {
  const shimmer = useSharedValue(0.35);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value,
  }));

  return (
    <View style={[styles.skeletonContainer, isGrid && styles.skeletonGrid]}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Animated.View
          key={i}
          style={[
            isGrid ? styles.skeletonGridCard : styles.skeletonListCard,
            pulseStyle,
          ]}
        />
      ))}
    </View>
  );
}

function VaultReceiptCard({
  item,
  index,
  isGridView,
}: {
  item: any;
  index: number;
  isGridView: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const rawCategory = (item.category || 'other').toLowerCase();
  const catMeta = CATEGORY_META[rawCategory] || CATEGORY_META.other;
  const CategoryIcon = catMeta.Icon;

  const storeName = item.store_name || item.merchant || 'Unknown Store';
  const amount = Number(item.total_amount ?? item.total ?? 0);
  const currency = item.currency || '₹';
  const purchaseDate = item.purchase_date || item.date || item.created_at;
  const itemCount = item.items?.length ?? item.item_count ?? 0;

  if (isGridView) {
    return (
      <Animated.View
        entering={FadeInUp.delay(Math.min(index * 45, 300))
          .duration(400)
          .springify()}
        style={styles.gridItemWrapper}
      >
        <AnimatedPressable
          onPressIn={() => {
            scale.value = withSpring(0.97, { damping: 16, stiffness: 320 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 16, stiffness: 320 });
          }}
          onPress={() => router.push(`/receipt/${item.id}`)}
          style={[styles.gridCard, animatedStyle]}
        >
          <View style={styles.gridTopRow}>
            <View style={[styles.catIconBox, { backgroundColor: catMeta.bg }]}>
              <CategoryIcon size={18} color={catMeta.color} />
            </View>
            {item.is_favorite && (
              <View style={styles.favBadge}>
                <Star size={12} color={OBSIDIAN.amber} fill={OBSIDIAN.amber} />
              </View>
            )}
          </View>

          <Text style={styles.gridMerchant} numberOfLines={1}>
            {storeName}
          </Text>

          <Text style={styles.gridAmount} numberOfLines={1}>
            {currency}
            {amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>

          <View style={styles.gridFooter}>
            <Text style={styles.gridDate} numberOfLines={1}>
              {purchaseDate ? formatDate(purchaseDate) : 'No date'}
            </Text>
            {item.category && (
              <Text style={[styles.gridCatLabel, { color: catMeta.color }]} numberOfLines={1}>
                {item.category}
              </Text>
            )}
          </View>
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index * 45, 320))
        .duration(420)
        .springify()
        .damping(18)}
    >
      <AnimatedPressable
        onPressIn={() => {
          scale.value = withSpring(0.978, { damping: 16, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 320 });
        }}
        onPress={() => router.push(`/receipt/${item.id}`)}
        style={[styles.listCard, animatedStyle]}
      >
        <View style={[styles.catIconBox, { backgroundColor: catMeta.bg }]}>
          <CategoryIcon size={19} color={catMeta.color} />
        </View>

        <View style={styles.listMain}>
          <View style={styles.listTitleRow}>
            <Text style={styles.listMerchant} numberOfLines={1}>
              {storeName}
            </Text>
            {item.is_favorite && (
              <Star size={13} color={OBSIDIAN.amber} fill={OBSIDIAN.amber} />
            )}
          </View>

          <View style={styles.listMetaRow}>
            {purchaseDate && (
              <View style={styles.metaChip}>
                <Calendar size={11} color={OBSIDIAN.textMuted} />
                <Text style={styles.listDate}>{formatDate(purchaseDate)}</Text>
              </View>
            )}
            {itemCount > 0 && (
              <Text style={styles.listItemsText}>
                · {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.listRight}>
          <Text style={styles.listAmount}>
            {currency}
            {amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
          {item.category && (
            <View style={[styles.categoryPill, { backgroundColor: catMeta.bg }]}>
              <Text
                style={[styles.categoryPillText, { color: catMeta.color }]}
                numberOfLines={1}
              >
                {item.category}
              </Text>
            </View>
          )}
        </View>

        <ChevronRight size={16} color={OBSIDIAN.textMuted} style={styles.chevron} />
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function VaultScreen() {
  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    date_from?: string;
    date_to?: string;
    min_amount?: string;
    max_amount?: string;
    tags?: string;
    sort?: string;
    is_favorite?: string;
  }>();

  const [searchInput, setSearchInput] = useState(params.q || '');
  const [debouncedSearch, setDebouncedSearch] = useState(params.q || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | undefined>(
    params.category || undefined
  );
  const [favoritesOnly, setFavoritesOnly] = useState(params.is_favorite === 'true');
  const [isGridView, setIsGridView] = useState(false);

  // Sync local states whenever returning from /filters
  useEffect(() => {
    if (params.q !== undefined) {
      setSearchInput(params.q);
      setDebouncedSearch(params.q);
    }
    if (params.category !== undefined) {
      setActiveCategory(params.category || undefined);
    }
    if (params.is_favorite !== undefined) {
      setFavoritesOnly(params.is_favorite === 'true');
    }
  }, [params.q, params.category, params.is_favorite]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const filters: ReceiptFilters = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      category: activeCategory,
      is_favorite: favoritesOnly || undefined,
      date_from: params.date_from || undefined,
      date_to: params.date_to || undefined,
      min_amount: params.min_amount ? Number(params.min_amount) : undefined,
      max_amount: params.max_amount ? Number(params.max_amount) : undefined,
      tags: params.tags ? params.tags.split(',').filter(Boolean) : undefined,
      sort: (params.sort as any) || 'newest',
    }),
    [
      debouncedSearch,
      activeCategory,
      favoritesOnly,
      params.date_from,
      params.date_to,
      params.min_amount,
      params.max_amount,
      params.tags,
      params.sort,
    ]
  );

  const {
    receipts,
    total,
    isLoading,
    isError,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useReceipts(filters);

  const hasAdvancedFilters = Boolean(
    params.date_from ||
      params.date_to ||
      params.min_amount ||
      params.max_amount ||
      params.tags ||
      (params.sort && params.sort !== 'newest')
  );

  const hasActiveFilters = Boolean(
    debouncedSearch || activeCategory || favoritesOnly || hasAdvancedFilters
  );

  const clearAllFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setActiveCategory(undefined);
    setFavoritesOnly(false);
    router.setParams({
      q: '',
      category: '',
      date_from: '',
      date_to: '',
      min_amount: '',
      max_amount: '',
      tags: '',
      sort: 'newest',
      is_favorite: '',
    });
  };

  const openFiltersModal = () => {
    router.push({
      pathname: '/filters',
      params: {
        q: debouncedSearch || '',
        category: activeCategory || '',
        date_from: params.date_from || '',
        date_to: params.date_to || '',
        min_amount: params.min_amount || '',
        max_amount: params.max_amount || '',
        tags: params.tags || '',
        sort: params.sort || 'newest',
        is_favorite: favoritesOnly ? 'true' : '',
      },
    });
  };

  return (
    <View style={styles.root}>
      {/* Ambient Obsidian Glow */}
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.2)', 'rgba(6, 182, 212, 0.05)', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <View style={styles.responsiveContainer}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(500).springify().damping(17)}
          style={styles.header}
        >
          <View>
            <View style={styles.badgeRow}>
              <FolderArchive size={12} color={OBSIDIAN.emerald} />
              <Text style={styles.badgeText}>ENCRYPTED ARCHIVE</Text>
            </View>
            <Text style={styles.title}>Receipt Vault</Text>
          </View>

          {!isLoading && !isError && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>
                {total ?? receipts.length}{' '}
                {(total ?? receipts.length) === 1 ? 'receipt' : 'receipts'}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Search & Action Controls */}
        <Animated.View
          entering={FadeInDown.delay(70).duration(500).springify()}
          style={styles.searchRow}
        >
          <View
            style={[
              styles.searchBox,
              isSearchFocused && styles.searchBoxFocused,
            ]}
          >
            <Search
              size={17}
              color={isSearchFocused ? OBSIDIAN.emerald : OBSIDIAN.textMuted}
            />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search merchant, item, or amount..."
              placeholderTextColor={OBSIDIAN.textMuted}
              selectionColor={OBSIDIAN.emerald}
              style={[
                styles.searchInput,
                Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
              ]}
            />
            {searchInput.length > 0 && (
              <Pressable
                onPress={() => {
                  setSearchInput('');
                  setDebouncedSearch('');
                }}
                hitSlop={8}
                style={styles.clearSearchBtn}
              >
                <X size={14} color={OBSIDIAN.textSecondary} />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={() => setIsGridView((prev) => !prev)}
            style={[styles.iconActionBtn, isGridView && styles.iconActionBtnActive]}
          >
            {isGridView ? (
              <ListIcon size={18} color={OBSIDIAN.emerald} />
            ) : (
              <LayoutGrid size={18} color={OBSIDIAN.textSecondary} />
            )}
          </Pressable>

          <Pressable
            onPress={openFiltersModal}
            style={[
              styles.iconActionBtn,
              hasAdvancedFilters && styles.iconActionBtnActive,
            ]}
          >
            <SlidersHorizontal
              size={18}
              color={hasAdvancedFilters ? OBSIDIAN.emerald : OBSIDIAN.textSecondary}
            />
            {hasAdvancedFilters && <View style={styles.filterActiveDot} />}
          </Pressable>
        </Animated.View>

        {/* Horizontal Filter Pills */}
        <Animated.View entering={FadeInDown.delay(130).duration(500).springify()}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipScroll}
          >
            <Pressable
              onPress={() => setFavoritesOnly((prev) => !prev)}
              style={[
                styles.filterPill,
                favoritesOnly && {
                  backgroundColor: OBSIDIAN.amberBg,
                  borderColor: OBSIDIAN.amberBorder,
                },
              ]}
            >
              <Star
                size={13}
                color={favoritesOnly ? OBSIDIAN.amber : OBSIDIAN.textSecondary}
                fill={favoritesOnly ? OBSIDIAN.amber : 'transparent'}
              />
              <Text
                style={[
                  styles.filterPillText,
                  favoritesOnly && { color: OBSIDIAN.amber, fontWeight: '700' },
                ]}
              >
                Favorites
              </Text>
            </Pressable>

            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setActiveCategory(isSelected ? undefined : cat)}
                  style={[
                    styles.filterPill,
                    isSelected && {
                      backgroundColor: OBSIDIAN.emeraldBg,
                      borderColor: OBSIDIAN.emeraldBorder,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      isSelected && { color: OBSIDIAN.emerald, fontWeight: '700' },
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Main Content Area */}
        {isLoading ? (
          <ObsidianSkeletonGrid isGrid={isGridView} />
        ) : isError ? (
          <View style={styles.centerWrapper}>
            <View style={styles.stateCard}>
              <View style={styles.errorIconBox}>
                <AlertCircle size={28} color={OBSIDIAN.rose} />
              </View>
              <Text style={styles.stateTitle}>Failed to load vault</Text>
              <Text style={styles.stateSub}>
                Check your connection and try syncing your receipts again.
              </Text>
              <Pressable onPress={() => refetch()} style={styles.primaryBtn}>
                <RotateCcw size={16} color="#042F1E" strokeWidth={2.5} />
                <Text style={styles.primaryBtnText}>Retry</Text>
              </Pressable>
            </View>
          </View>
        ) : receipts.length === 0 ? (
          <Animated.View
            entering={FadeInUp.duration(450).springify()}
            style={styles.centerWrapper}
          >
            <View style={styles.stateCard}>
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.25)', 'rgba(6, 182, 212, 0.1)']}
                style={styles.emptyIconRing}
              >
                <View style={styles.emptyIconInner}>
                  {hasActiveFilters ? (
                    <Search size={26} color={OBSIDIAN.emerald} />
                  ) : (
                    <Sparkles size={26} color={OBSIDIAN.emerald} />
                  )}
                </View>
              </LinearGradient>

              <Text style={styles.stateTitle}>
                {hasActiveFilters ? 'No matching receipts' : 'Your vault is empty'}
              </Text>
              <Text style={styles.stateSub}>
                {hasActiveFilters
                  ? 'Try adjusting your search keywords or clearing active category filters.'
                  : 'Snap your first receipt or upload a PDF invoice to start building your archive.'}
              </Text>

              {hasActiveFilters ? (
                <Pressable onPress={clearAllFilters} style={styles.secondaryBtn}>
                  <X size={15} color={OBSIDIAN.textPrimary} />
                  <Text style={styles.secondaryBtnText}>Clear Filters</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => router.push('/(tabs)/add')}
                  style={styles.primaryBtn}
                >
                  <Plus size={17} color="#042F1E" strokeWidth={2.6} />
                  <Text style={styles.primaryBtnText}>Add Receipt</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        ) : (
          <FlatList
            key={isGridView ? 'grid-2' : 'list-1'}
            data={receipts}
            numColumns={isGridView ? 2 : 1}
            keyExtractor={(item) => item.id}
            columnWrapperStyle={isGridView ? styles.gridRow : undefined}
            renderItem={({ item, index }) => (
              <VaultReceiptCard
                item={item}
                index={index}
                isGridView={isGridView}
              />
            )}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={OBSIDIAN.emerald} />
                  <Text style={styles.footerLoaderText}>Loading more receipts…</Text>
                </View>
              ) : null
            }
            refreshControl={
              <RefreshControl
                refreshing={isRefetching && !isLoading}
                onRefresh={() => refetch()}
                tintColor={OBSIDIAN.emerald}
                colors={[OBSIDIAN.emerald]}
                progressBackgroundColor={OBSIDIAN.surface}
              />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: OBSIDIAN.bg,
  },
  topGlow: {
    position: 'absolute',
    top: -60,
    left: -50,
    right: -50,
    height: 320,
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
  },
  responsiveContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  badgeText: {
    color: OBSIDIAN.emerald,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: OBSIDIAN.textPrimary,
    letterSpacing: -0.7,
  },
  totalBadge: {
    backgroundColor: OBSIDIAN.emeraldBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.emeraldBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  totalBadgeText: {
    color: OBSIDIAN.emerald,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  /* Search & Controls */
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: OBSIDIAN.border,
    paddingHorizontal: 13,
    gap: 9,
  },
  searchBoxFocused: {
    borderColor: OBSIDIAN.borderFocus,
    backgroundColor: '#16161C',
  },
  searchInput: {
    flex: 1,
    color: OBSIDIAN.textPrimary,
    fontSize: 14,
    height: '100%',
  },
  clearSearchBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: OBSIDIAN.surface,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActionBtnActive: {
    backgroundColor: OBSIDIAN.emeraldBg,
    borderColor: OBSIDIAN.emeraldBorder,
  },
  filterActiveDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: OBSIDIAN.emerald,
  },
  /* Filter Pills */
  chipScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: OBSIDIAN.surface,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  filterPillText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  /* List View Cards */
  listContent: {
    paddingBottom: 36,
    gap: 10,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  catIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listMain: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listMerchant: {
    color: OBSIDIAN.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listDate: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
  },
  listItemsText: {
    color: OBSIDIAN.textMuted,
    fontSize: 12,
  },
  listRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  listAmount: {
    color: OBSIDIAN.textPrimary,
    fontSize: 15.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  categoryPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  chevron: {
    marginLeft: 6,
  },
  /* Grid View Cards */
  gridRow: {
    gap: 10,
  },
  gridItemWrapper: {
    flex: 1,
    maxWidth: '50%',
  },
  gridCard: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  gridTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  favBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: OBSIDIAN.amberBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.amberBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridMerchant: {
    color: OBSIDIAN.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  gridAmount: {
    color: OBSIDIAN.emerald,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginBottom: 10,
  },
  gridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: OBSIDIAN.border,
    gap: 6,
  },
  gridDate: {
    color: OBSIDIAN.textMuted,
    fontSize: 11,
    flexShrink: 1,
  },
  gridCatLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  /* Footer Loader & States */
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  footerLoaderText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  skeletonContainer: {
    gap: 10,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skeletonListCard: {
    height: 70,
    borderRadius: 18,
    backgroundColor: OBSIDIAN.surface,
  },
  skeletonGridCard: {
    width: '48%',
    height: 154,
    borderRadius: 18,
    backgroundColor: OBSIDIAN.surface,
  },
  centerWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  stateCard: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 22,
    padding: 28,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
  },
  emptyIconRing: {
    width: 62,
    height: 62,
    borderRadius: 20,
    padding: 1.5,
    marginBottom: 14,
  },
  emptyIconInner: {
    flex: 1,
    backgroundColor: '#111615',
    borderRadius: 18.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconBox: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: OBSIDIAN.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  stateTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  stateSub: {
    color: OBSIDIAN.textSecondary,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: OBSIDIAN.emerald,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#042F1E',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  secondaryBtnText: {
    color: OBSIDIAN.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});