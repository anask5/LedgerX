import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  LayoutChangeEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useReminders } from '../../src/hooks/useReminders';
import { useQueryClient } from '@tanstack/react-query';
import { remindersApi } from '../../src/api/reminders';
import { formatDate, deadlineLabel } from '../../src/lib/formatDate';
import type { Reminder } from '../../src/api/types';
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
  Bell,
  Calendar,
  Clock,
  AlertCircle,
  ShieldCheck,
  Sparkles,
  RotateCcw,
  AlarmClockPlus,
  ChevronRight,
  Store,
  CheckCircle2,
} from 'lucide-react-native';

type TabValue = 'upcoming' | 'expiring_soon' | 'expired';

const OBSIDIAN = {
  bg: '#09090B',
  surface: '#121216',
  surfaceElevated: '#18181E',
  border: 'rgba(255, 255, 255, 0.08)',
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
  roseBorder: 'rgba(244, 63, 94, 0.28)',
};

const TABS: { value: TabValue; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'expiring_soon', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
];

const TAB_THEME: Record<
  TabValue,
  {
    accent: string;
    bg: string;
    border: string;
    glow: [string, string, string];
  }
> = {
  upcoming: {
    accent: OBSIDIAN.emerald,
    bg: OBSIDIAN.emeraldBg,
    border: OBSIDIAN.emeraldBorder,
    glow: ['rgba(16, 185, 129, 0.2)', 'rgba(6, 182, 212, 0.05)', 'transparent'],
  },
  expiring_soon: {
    accent: OBSIDIAN.amber,
    bg: OBSIDIAN.amberBg,
    border: OBSIDIAN.amberBorder,
    glow: ['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)', 'transparent'],
  },
  expired: {
    accent: OBSIDIAN.rose,
    bg: OBSIDIAN.roseBg,
    border: OBSIDIAN.roseBorder,
    glow: ['rgba(244, 63, 94, 0.18)', 'rgba(244, 63, 94, 0.04)', 'transparent'],
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ObsidianSkeletonList() {
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
    <View style={styles.skeletonStack}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Animated.View key={i} style={[styles.skeletonRow, pulseStyle]} />
      ))}
    </View>
  );
}

interface ReminderCardProps {
  item: Reminder;
  tab: TabValue;
  index: number;
  isSnoozing: boolean;
  onSnooze: (id: string) => void;
}

function ObsidianReminderCard({
  item,
  tab,
  index,
  isSnoozing,
  onSnooze,
}: ReminderCardProps) {
  const scale = useSharedValue(1);
  const theme = TAB_THEME[tab];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isReturn = item.type === 'return_deadline';
  const isBrand = item.type === 'brand_warranty_expiry';

  const typeLabel = isReturn
    ? 'Return by'
    : isBrand
    ? 'Brand warranty until'
    : 'Extended warranty until';

  const TypeIcon = isReturn ? RotateCcw : isBrand ? ShieldCheck : Sparkles;

  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index * 55, 350))
        .duration(450)
        .springify()
        .damping(18)}
    >
      <AnimatedPressable
        onPressIn={() => {
          scale.value = withSpring(0.975, { damping: 16, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 320 });
        }}
        onPress={() => router.push(`/receipt/${item.receipt_id}`)}
        style={[
          styles.reminderCard,
          { borderColor: tab === 'expiring_soon' ? theme.border : OBSIDIAN.border },
          animatedStyle,
        ]}
      >
        {/* Left Status Accent Strip */}
        <View style={[styles.leftBar, { backgroundColor: theme.accent }]} />

        {/* Icon Badge */}
        <View
          style={[
            styles.iconBox,
            { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
        >
          <TypeIcon size={18} color={theme.accent} strokeWidth={2.1} />
        </View>

        {/* Main Details */}
        <View style={styles.reminderInfo}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.item_name}
          </Text>

          <View style={styles.storeRow}>
            <Store size={11.5} color={OBSIDIAN.textMuted} />
            <Text style={styles.storeName} numberOfLines={1}>
              {item.store_name}
            </Text>
          </View>

          <View style={styles.deadlineRow}>
            <Calendar size={11.5} color={OBSIDIAN.textSecondary} />
            <Text style={styles.deadline} numberOfLines={1}>
              {typeLabel} {formatDate(item.deadline)}
            </Text>
          </View>
        </View>

        {/* Right Status Badge + Optional Snooze */}
        <View style={styles.reminderRight}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: theme.bg, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.statusPillText, { color: theme.accent }]}>
              {deadlineLabel(item.deadline)}
            </Text>
          </View>

          {tab !== 'expired' ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onSnooze(item.id);
              }}
              disabled={isSnoozing}
              hitSlop={8}
              style={styles.snoozeBtn}
            >
              {isSnoozing ? (
                <ActivityIndicator size={12} color={OBSIDIAN.textSecondary} />
              ) : (
                <>
                  <AlarmClockPlus size={12} color={OBSIDIAN.textSecondary} />
                  <Text style={styles.snoozeText}>+3d</Text>
                </>
              )}
            </Pressable>
          ) : (
            <ChevronRight size={16} color={OBSIDIAN.textMuted} />
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function RemindersScreen() {
  const [tab, setTab] = useState<TabValue>('upcoming');
  const [snoozingId, setSnoozingId] = useState<string | null>(null);
  const [segmentWidth, setSegmentWidth] = useState(0);

  const { data: reminders, isLoading, isError, isRefetching, refetch } = useReminders(tab);
  const queryClient = useQueryClient();

  const activeIndex = TABS.findIndex((t) => t.value === tab);
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (segmentWidth > 0) {
      indicatorX.value = withSpring(activeIndex * segmentWidth, {
        damping: 18,
        stiffness: 240,
      });
    }
  }, [activeIndex, segmentWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: indicatorX.value }],
  }));

  const handleSegmentLayout = (e: LayoutChangeEvent) => {
    const innerWidth = e.nativeEvent.layout.width - 8;
    if (innerWidth > 0) {
      const singleWidth = innerWidth / TABS.length;
      setSegmentWidth(singleWidth);
      indicatorX.value = activeIndex * singleWidth;
    }
  };

  const handleSnooze = async (id: string) => {
    setSnoozingId(id);
    try {
      await remindersApi.snooze(id, 3);
      await queryClient.invalidateQueries({ queryKey: ['reminders'] });
    } catch {
      // Handle error silently or via toast
    } finally {
      setSnoozingId(null);
    }
  };

  const activeTheme = TAB_THEME[tab];

  return (
    <View style={styles.root}>
      {/* Dynamic Ambient Top Glow */}
      <LinearGradient
        colors={activeTheme.glow}
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
              <Bell size={12} color={activeTheme.accent} />
              <Text style={[styles.badgeText, { color: activeTheme.accent }]}>
                WARRANTY & RETURN RADAR
              </Text>
            </View>
            <Text style={styles.title}>Reminders</Text>
          </View>

          {!isLoading && !isError && reminders && (
            <View
              style={[
                styles.countBadge,
                { backgroundColor: activeTheme.bg, borderColor: activeTheme.border },
              ]}
            >
              <Text style={[styles.countBadgeText, { color: activeTheme.accent }]}>
                {reminders.length} {reminders.length === 1 ? 'alert' : 'alerts'}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Animated Obsidian Segmented Control */}
        <Animated.View
          entering={FadeInDown.delay(80).duration(500).springify()}
          onLayout={handleSegmentLayout}
          style={styles.segmentContainer}
        >
          {segmentWidth > 0 && (
            <Animated.View
              style={[
                styles.segmentIndicator,
                {
                  backgroundColor: activeTheme.bg,
                  borderColor: activeTheme.border,
                },
                indicatorStyle,
              ]}
            />
          )}

          {TABS.map((item) => {
            const isActive = item.value === tab;
            return (
              <Pressable
                key={item.value}
                onPress={() => setTab(item.value)}
                style={styles.segmentTab}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    isActive && {
                      color: activeTheme.accent,
                      fontWeight: '800',
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Content States */}
        {isLoading ? (
          <ObsidianSkeletonList />
        ) : isError ? (
          <View style={styles.centerCardWrapper}>
            <View style={styles.stateCard}>
              <View style={styles.errorIconBox}>
                <AlertCircle size={28} color={OBSIDIAN.rose} />
              </View>
              <Text style={styles.stateTitle}>Unable to load reminders</Text>
              <Text style={styles.stateSub}>
                Check your network connection and sync your warranty deadlines again.
              </Text>
              <Pressable onPress={() => refetch()} style={styles.retryBtn}>
                <RotateCcw size={16} color="#042F1E" strokeWidth={2.5} />
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            </View>
          </View>
        ) : !reminders || reminders.length === 0 ? (
          <Animated.View
            entering={FadeInUp.duration(450).springify()}
            style={styles.centerCardWrapper}
          >
            <View style={styles.stateCard}>
              <View
                style={[
                  styles.emptyIconRing,
                  { backgroundColor: activeTheme.bg, borderColor: activeTheme.border },
                ]}
              >
                {tab === 'upcoming' ? (
                  <Calendar size={28} color={activeTheme.accent} />
                ) : tab === 'expiring_soon' ? (
                  <Clock size={28} color={activeTheme.accent} />
                ) : (
                  <CheckCircle2 size={28} color={activeTheme.accent} />
                )}
              </View>
              <Text style={styles.stateTitle}>
                No {tab.replace('_', ' ')} reminders
              </Text>
              <Text style={styles.stateSub}>
                Warranty expirations and return deadlines extracted from your receipts will show up here automatically.
              </Text>
            </View>
          </Animated.View>
        ) : (
          <FlatList
            data={reminders}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <ObsidianReminderCard
                item={item}
                tab={tab}
                index={index}
                isSnoozing={snoozingId === item.id}
                onSnooze={handleSnooze}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching && !isLoading}
                onRefresh={() => refetch()}
                tintColor={activeTheme.accent}
                colors={[activeTheme.accent]}
                progressBackgroundColor={OBSIDIAN.surface}
              />
            }
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
    maxWidth: 640,
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
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  /* Segmented Control */
  segmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    marginBottom: 18,
    height: 46,
  },
  segmentIndicator: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  segmentTab: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentLabel: {
    color: OBSIDIAN.textSecondary,
    fontSize: 13.5,
    fontWeight: '600',
  },
  /* List & Cards */
  listContent: {
    paddingBottom: 36,
    gap: 10,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  leftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3.5,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reminderInfo: {
    flex: 1,
    paddingRight: 8,
  },
  itemName: {
    color: OBSIDIAN.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  storeName: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12.5,
    fontWeight: '500',
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  deadline: {
    color: OBSIDIAN.textMuted,
    fontSize: 12,
  },
  reminderRight: {
    alignItems: 'flex-end',
    gap: 7,
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  snoozeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  snoozeText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  /* Skeleton & Empty / Error States */
  skeletonStack: {
    gap: 10,
  },
  skeletonRow: {
    height: 78,
    borderRadius: 18,
    backgroundColor: OBSIDIAN.surface,
  },
  centerCardWrapper: {
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorIconBox: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: OBSIDIAN.roseBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.roseBorder,
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
    textTransform: 'capitalize',
  },
  stateSub: {
    color: OBSIDIAN.textSecondary,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 290,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: OBSIDIAN.emerald,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 18,
  },
  retryBtnText: {
    color: '#042F1E',
    fontSize: 14,
    fontWeight: '800',
  },
});