import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
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
  Receipt,
  Clock,
  Plus,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Store,
  Calendar,
  AlertCircle,
  RotateCcw,
  ScanLine,
  ArrowUpRight,
} from 'lucide-react-native';
import { receiptsApi } from '../../src/api/receipts';
import { remindersApi } from '../../src/api/reminders';
import { formatDate, deadlineLabel } from '../../src/lib/formatDate';

const OBSIDIAN = {
  bg: '#09090B',
  surface: '#121216',
  surfaceElevated: '#18181E',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  emerald: '#10B981',
  emeraldDark: '#059669',
  cyan: '#06B6D4',
  amber: '#F59E0B',
  amberBg: 'rgba(245, 158, 11, 0.12)',
  amberBorder: 'rgba(245, 158, 11, 0.28)',
  dangerText: '#FB7185',
  dangerBg: 'rgba(244, 63, 94, 0.12)',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ObsidianSkeleton() {
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
    <View style={styles.root}>
      <View style={styles.responsiveContainer}>
        <View style={styles.skeletonHeader}>
          <Animated.View style={[styles.skeletonPill, pulseStyle]} />
          <Animated.View style={[styles.skeletonTitle, pulseStyle]} />
        </View>
        <Animated.View style={[styles.skeletonHero, pulseStyle]} />
        <Animated.View style={[styles.skeletonRow, pulseStyle]} />
        <Animated.View style={[styles.skeletonRow, pulseStyle]} />
        <Animated.View style={[styles.skeletonRow, pulseStyle]} />
      </View>
    </View>
  );
}

function TactileCard({
  onPress,
  style,
  children,
}: {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.975, { damping: 16, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 320 });
      }}
      onPress={onPress}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function HomeScreen() {
  const fabScale = useSharedValue(1);

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
  const isRefreshing =
    (recentReceipts.isRefetching || expiringReminders.isRefetching) && !isLoading;

  const receiptsList = recentReceipts.data?.data ?? [];
  const totalCount = recentReceipts.data?.pagination?.total ?? receiptsList.length;
  const expiringList = expiringReminders.data ?? [];

  const hasReceipts = receiptsList.length > 0;
  const hasExpiring = expiringList.length > 0;

  const recentTotalSpend = receiptsList.reduce((acc, r: any) => {
    const val = Number(r.total_amount ?? r.total ?? 0);
    return acc + (Number.isFinite(val) ? val : 0);
  }, 0);

  const primaryCurrency = (receiptsList[0] as any)?.currency || '₹';

  const onRefresh = () => {
    recentReceipts.refetch();
    expiringReminders.refetch();
  };

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  if (isLoading) return <ObsidianSkeleton />;

  if (isError) {
    return (
      <View style={[styles.root, styles.center]}>
        <View style={styles.errorCard}>
          <View style={styles.errorIconBox}>
            <AlertCircle size={28} color={OBSIDIAN.dangerText} />
          </View>
          <Text style={styles.errorTitle}>Couldn't load your vault</Text>
          <Text style={styles.errorSub}>
            Check your connection and pull the latest receipts from the server.
          </Text>
          <Pressable onPress={onRefresh} style={styles.retryBtn}>
            <RotateCcw size={16} color="#042F1E" strokeWidth={2.5} />
            <Text style={styles.retryBtnText}>Retry Sync</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Ambient Obsidian Glow */}
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.22)', 'rgba(6, 182, 212, 0.06)', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={OBSIDIAN.emerald}
            colors={[OBSIDIAN.emerald]}
            progressBackgroundColor={OBSIDIAN.surface}
          />
        }
      >
        <View style={styles.responsiveContainer}>
          {/* Top Bar Header */}
          <Animated.View
            entering={FadeInDown.duration(500).springify().damping(17)}
            style={styles.header}
          >
            <View>
              <View style={styles.vaultStatusRow}>
                <View style={styles.liveDot} />
                <Text style={styles.vaultStatusText}>VAULT ACTIVE</Text>
              </View>
              <Text style={styles.greeting}>LedgerX</Text>
            </View>

            <Pressable
              onPress={() => router.push('/(tabs)/add')}
              style={styles.quickScanIconBtn}
            >
              <ScanLine size={20} color={OBSIDIAN.emerald} />
            </Pressable>
          </Animated.View>

          {/* Hero Obsidian Overview Card */}
          <Animated.View
            entering={FadeInDown.delay(90).duration(550).springify().damping(17)}
            style={styles.heroWrapper}
          >
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.32)', 'rgba(6, 182, 212, 0.14)', 'rgba(255,255,255,0.06)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBorder}
            >
              <LinearGradient
                colors={['#121A18', '#111216']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroCard}
              >
                <View style={styles.heroTopRow}>
                  <View style={styles.heroBadge}>
                    <ShieldCheck size={13} color={OBSIDIAN.emerald} />
                    <Text style={styles.heroBadgeText}>RECENT TRACKED SPEND</Text>
                  </View>
                  <Pressable
                    onPress={() => router.push('/(tabs)/receipts')}
                    style={styles.viewAllChip}
                  >
                    <Text style={styles.viewAllText}>All Receipts</Text>
                    <ArrowUpRight size={13} color={OBSIDIAN.textSecondary} />
                  </Pressable>
                </View>

                <Text style={styles.heroAmount}>
                  {primaryCurrency}
                  {recentTotalSpend.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>

                <View style={styles.heroStatsDivider} />

                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatLabel}>SAVED RECEIPTS</Text>
                    <Text style={styles.heroStatValue}>{totalCount}</Text>
                  </View>
                  <View style={styles.heroStatSep} />
                  <View style={styles.heroStatItem}>
                    <Text style={styles.heroStatLabel}>EXPIRING ALERTS</Text>
                    <Text
                      style={[
                        styles.heroStatValue,
                        hasExpiring && { color: OBSIDIAN.amber },
                      ]}
                    >
                      {expiringList.length}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </LinearGradient>
          </Animated.View>

          {/* Expiring Soon Section */}
          {hasExpiring && (
            <Animated.View
              entering={FadeInDown.delay(170).duration(550).springify()}
              style={styles.section}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleGroup}>
                  <Clock size={16} color={OBSIDIAN.amber} />
                  <Text style={styles.sectionTitle}>Expiring Soon</Text>
                </View>
                <View style={styles.countPillAmber}>
                  <Text style={styles.countPillAmberText}>{expiringList.length}</Text>
                </View>
              </View>

              <View style={styles.listStack}>
                {expiringList.slice(0, 3).map((reminder, idx) => {
                  const typeLabel =
                    reminder.type === 'brand_warranty_expiry'
                      ? 'Brand Warranty'
                      : reminder.type === 'extended_warranty_expiry'
                      ? 'Extended'
                      : 'Return Window';

                  return (
                    <Animated.View
                      key={reminder.id}
                      entering={FadeInDown.delay(210 + idx * 60).duration(450).springify()}
                    >
                      <TactileCard
                        style={styles.expiringCard}
                        onPress={() => router.push(`/receipt/${reminder.receipt_id}`)}
                      >
                        <View style={styles.amberAccentBar} />
                        <View style={styles.expiringIconBox}>
                          <Clock size={18} color={OBSIDIAN.amber} />
                        </View>

                        <View style={styles.expiringInfo}>
                          <Text style={styles.expiringName} numberOfLines={1}>
                            {reminder.item_name}
                          </Text>
                          <Text style={styles.expiringMeta} numberOfLines={1}>
                            {reminder.store_name} · {typeLabel} · {formatDate(reminder.deadline)}
                          </Text>
                        </View>

                        <View style={styles.deadlineBadge}>
                          <Text style={styles.deadlineBadgeText}>
                            {deadlineLabel(reminder.deadline)}
                          </Text>
                        </View>
                      </TactileCard>
                    </Animated.View>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Recent Receipts Section */}
          <Animated.View
            entering={FadeInDown.delay(240).duration(550).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleGroup}>
                <Receipt size={16} color={OBSIDIAN.emerald} />
                <Text style={styles.sectionTitle}>Recent Receipts</Text>
              </View>
              {hasReceipts && (
                <Pressable onPress={() => router.push('/(tabs)/receipts')} hitSlop={8}>
                  <Text style={styles.seeAllLink}>See all</Text>
                </Pressable>
              )}
            </View>

            {hasReceipts ? (
              <View style={styles.listStack}>
                {receiptsList.map((receipt: any, idx: number) => {
                  const amount = Number(receipt.total_amount ?? receipt.total ?? 0);
                  const currency = receipt.currency || '₹';
                  const itemCount = receipt.items?.length ?? receipt.item_count ?? 0;
                  const purchaseDate = receipt.purchase_date || receipt.date || receipt.created_at;

                  return (
                    <Animated.View
                      key={receipt.id}
                      entering={FadeInUp.delay(280 + idx * 65).duration(450).springify()}
                    >
                      <TactileCard
                        style={styles.receiptCard}
                        onPress={() => router.push(`/receipt/${receipt.id}`)}
                      >
                        <View style={styles.receiptIconBox}>
                          <Store size={19} color={OBSIDIAN.emerald} />
                        </View>

                        <View style={styles.receiptMain}>
                          <Text style={styles.receiptMerchant} numberOfLines={1}>
                            {receipt.store_name || receipt.merchant || 'Unknown Store'}
                          </Text>
                          <View style={styles.receiptSubRow}>
                            {purchaseDate && (
                              <View style={styles.metaChip}>
                                <Calendar size={11} color={OBSIDIAN.textMuted} />
                                <Text style={styles.receiptDate}>
                                  {formatDate(purchaseDate)}
                                </Text>
                              </View>
                            )}
                            {itemCount > 0 && (
                              <Text style={styles.receiptItemsCount}>
                                · {itemCount} {itemCount === 1 ? 'item' : 'items'}
                              </Text>
                            )}
                          </View>
                        </View>

                        <View style={styles.receiptRight}>
                          <Text style={styles.receiptAmount}>
                            {currency}
                            {amount.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </Text>
                          {receipt.category && (
                            <View style={styles.categoryPill}>
                              <Text style={styles.categoryPillText} numberOfLines={1}>
                                {receipt.category}
                              </Text>
                            </View>
                          )}
                        </View>

                        <ChevronRight
                          size={16}
                          color={OBSIDIAN.textMuted}
                          style={styles.rowChevron}
                        />
                      </TactileCard>
                    </Animated.View>
                  );
                })}
              </View>
            ) : (
              /* Obsidian Empty State */
              <Animated.View
                entering={FadeInUp.delay(260).duration(500).springify()}
                style={styles.emptyCard}
              >
                <LinearGradient
                  colors={['rgba(16, 185, 129, 0.25)', 'rgba(6, 182, 212, 0.1)']}
                  style={styles.emptyIconRing}
                >
                  <View style={styles.emptyIconInner}>
                    <Sparkles size={26} color={OBSIDIAN.emerald} />
                  </View>
                </LinearGradient>
                <Text style={styles.emptyTitle}>Your vault is empty</Text>
                <Text style={styles.emptyMessage}>
                  Snap your first receipt or upload a PDF invoice to auto-track spending & warranties
                </Text>
                <Pressable
                  onPress={() => router.push('/(tabs)/add')}
                  style={styles.emptyCta}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyCtaGradient}
                  >
                    <Plus size={17} color="#042F1E" strokeWidth={2.6} />
                    <Text style={styles.emptyCtaText}>Scan First Receipt</Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* Floating Emerald Gradient FAB */}
      <AnimatedPressable
        onPressIn={() => {
          fabScale.value = withSpring(0.94, { damping: 15, stiffness: 320 });
        }}
        onPressOut={() => {
          fabScale.value = withSpring(1, { damping: 15, stiffness: 320 });
        }}
        onPress={() => router.push('/(tabs)/add')}
        style={[styles.fabWrapper, fabAnimatedStyle]}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Plus size={20} color="#042F1E" strokeWidth={2.8} />
          <Text style={styles.fabLabel}>Add Receipt</Text>
        </LinearGradient>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: OBSIDIAN.bg,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  topGlow: {
    position: 'absolute',
    top: -60,
    left: -50,
    right: -50,
    height: 340,
    borderBottomLeftRadius: 180,
    borderBottomRightRadius: 180,
  },
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 104,
    paddingHorizontal: 18,
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  vaultStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: OBSIDIAN.emerald,
  },
  vaultStatusText: {
    color: OBSIDIAN.emerald,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: OBSIDIAN.textPrimary,
    letterSpacing: -0.7,
  },
  quickScanIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Hero Card */
  heroWrapper: {
    marginBottom: 24,
  },
  heroBorder: {
    borderRadius: 24,
    padding: 1.2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 10,
  },
  heroCard: {
    borderRadius: 22.8,
    padding: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroBadgeText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  viewAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  viewAllText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: OBSIDIAN.textPrimary,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  heroStatsDivider: {
    height: 1,
    backgroundColor: OBSIDIAN.border,
    marginVertical: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatItem: {
    flex: 1,
  },
  heroStatSep: {
    width: 1,
    height: 28,
    backgroundColor: OBSIDIAN.border,
    marginHorizontal: 16,
  },
  heroStatLabel: {
    color: OBSIDIAN.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  heroStatValue: {
    color: OBSIDIAN.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  /* Sections */
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: OBSIDIAN.textPrimary,
    letterSpacing: -0.2,
  },
  countPillAmber: {
    backgroundColor: OBSIDIAN.amberBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.amberBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  countPillAmberText: {
    color: OBSIDIAN.amber,
    fontSize: 11,
    fontWeight: '800',
  },
  seeAllLink: {
    color: OBSIDIAN.emerald,
    fontSize: 13,
    fontWeight: '700',
  },
  listStack: {
    gap: 10,
  },
  /* Expiring Cards */
  expiringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: OBSIDIAN.amberBorder,
    overflow: 'hidden',
  },
  amberAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
    backgroundColor: OBSIDIAN.amber,
  },
  expiringIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: OBSIDIAN.amberBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expiringInfo: {
    flex: 1,
    paddingRight: 8,
  },
  expiringName: {
    color: OBSIDIAN.textPrimary,
    fontSize: 14.5,
    fontWeight: '700',
  },
  expiringMeta: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  deadlineBadge: {
    backgroundColor: OBSIDIAN.amberBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.amberBorder,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deadlineBadgeText: {
    color: OBSIDIAN.amber,
    fontSize: 11,
    fontWeight: '700',
  },
  /* Recent Receipt Cards */
  receiptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  receiptIconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  receiptMain: {
    flex: 1,
    paddingRight: 8,
  },
  receiptMerchant: {
    color: OBSIDIAN.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  receiptSubRow: {
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
  receiptDate: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
  },
  receiptItemsCount: {
    color: OBSIDIAN.textMuted,
    fontSize: 12,
  },
  receiptRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  receiptAmount: {
    color: OBSIDIAN.textPrimary,
    fontSize: 15.5,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  categoryPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 10.5,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  rowChevron: {
    marginLeft: 6,
  },
  /* Empty State */
  emptyCard: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 22,
    padding: 28,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
  },
  emptyIconRing: {
    width: 64,
    height: 64,
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
  emptyTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyMessage: {
    color: OBSIDIAN.textSecondary,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 20,
  },
  emptyCta: {
    borderRadius: 13,
    overflow: 'hidden',
  },
  emptyCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyCtaText: {
    color: '#042F1E',
    fontSize: 14,
    fontWeight: '800',
  },
  /* FAB */
  fabWrapper: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  fabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    height: 54,
  },
  fabLabel: {
    color: '#042F1E',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  /* Skeleton & Error */
  skeletonHeader: {
    paddingHorizontal: 18,
    paddingTop: 24,
    marginBottom: 18,
    gap: 8,
  },
  skeletonPill: {
    width: 90,
    height: 12,
    borderRadius: 6,
    backgroundColor: OBSIDIAN.surfaceElevated,
  },
  skeletonTitle: {
    width: 180,
    height: 28,
    borderRadius: 8,
    backgroundColor: OBSIDIAN.surfaceElevated,
  },
  skeletonHero: {
    marginHorizontal: 18,
    height: 156,
    borderRadius: 24,
    backgroundColor: OBSIDIAN.surface,
    marginBottom: 22,
  },
  skeletonRow: {
    marginHorizontal: 18,
    height: 68,
    borderRadius: 18,
    backgroundColor: OBSIDIAN.surface,
    marginBottom: 10,
  },
  errorCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
  },
  errorIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: OBSIDIAN.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  errorSub: {
    color: OBSIDIAN.textSecondary,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: OBSIDIAN.emerald,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#042F1E',
    fontSize: 14,
    fontWeight: '800',
  },
});