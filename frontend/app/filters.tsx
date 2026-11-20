import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Search,
  X,
  ArrowUpDown,
  Layers,
  Calendar,
  IndianRupee,
  Tag,
  Star,
  RotateCcw,
  Check,
  SlidersHorizontal,
} from 'lucide-react-native';
import { tagsApi } from '../src/api/tags';

const CATEGORIES = [
  'Electronics',
  'Groceries',
  'Clothing',
  'Food',
  'Medical',
  'Fuel',
  'Travel',
  'Other',
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest_amount', label: 'Highest ₹' },
  { value: 'expiring_soonest', label: 'Expiring' },
];

const OBSIDIAN = {
  bg: '#09090B',
  surface: '#121216',
  surfaceElevated: '#18181E',
  inputBg: '#16161C',
  border: 'rgba(255, 255, 255, 0.08)',
  borderFocus: '#10B981',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  emerald: '#10B981',
  emeraldBg: 'rgba(16, 185, 129, 0.12)',
  emeraldBorder: 'rgba(16, 185, 129, 0.28)',
  cyan: '#06B6D4',
  cyanBg: 'rgba(6, 182, 212, 0.12)',
  cyanBorder: 'rgba(6, 182, 212, 0.28)',
  indigo: '#818CF8',
  indigoBg: 'rgba(99, 102, 241, 0.12)',
  indigoBorder: 'rgba(99, 102, 241, 0.28)',
  amber: '#F59E0B',
  amberBg: 'rgba(245, 158, 11, 0.12)',
  amberBorder: 'rgba(245, 158, 11, 0.3)',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ObsidianFilterInput({
  value,
  onChangeText,
  placeholder,
  label,
  icon,
  keyboardType = 'default',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  label?: string;
  icon?: React.ReactNode;
  keyboardType?: 'default' | 'numeric';
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.inputWrapper}>
      {label && <Text style={styles.miniLabel}>{label}</Text>}
      <View
        style={[
          styles.inputBox,
          focused && {
            borderColor: OBSIDIAN.borderFocus,
            backgroundColor: '#1B1B22',
          },
        ]}
      >
        {icon && <View style={styles.inputIcon}>{icon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={OBSIDIAN.textMuted}
          keyboardType={keyboardType}
          selectionColor={OBSIDIAN.emerald}
          style={[
            styles.inputText,
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
          ]}
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={8}
            style={styles.clearBtn}
          >
            <X size={12} color={OBSIDIAN.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function FiltersScreen() {
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

  const [query, setQuery] = useState(params.q || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    params.category ? params.category.split(',').filter(Boolean) : []
  );
  const [dateFrom, setDateFrom] = useState(params.date_from || '');
  const [dateTo, setDateTo] = useState(params.date_to || '');
  const [amountMin, setAmountMin] = useState(params.min_amount || '');
  const [amountMax, setAmountMax] = useState(params.max_amount || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    params.tags ? params.tags.split(',').filter(Boolean) : []
  );
  const [sort, setSort] = useState(params.sort || 'newest');
  const [favoritesOnly, setFavoritesOnly] = useState(params.is_favorite === 'true');

  const applyScale = useSharedValue(1);

  const { data: tags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  });

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleApply = () => {
    router.navigate({
      pathname: '/(tabs)/vault',
      params: {
        q: query.trim() || '',
        category: selectedCategories[0] || '',
        date_from: dateFrom.trim() || '',
        date_to: dateTo.trim() || '',
        min_amount: amountMin.trim() || '',
        max_amount: amountMax.trim() || '',
        tags: selectedTags.join(',') || '',
        sort: sort || 'newest',
        is_favorite: favoritesOnly ? 'true' : '',
      },
    });
  };

  const handleReset = () => {
    setQuery('');
    setSelectedCategories([]);
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setSelectedTags([]);
    setSort('newest');
    setFavoritesOnly(false);
  };

  const activeCount =
    (query.trim() ? 1 : 0) +
    selectedCategories.length +
    (dateFrom.trim() ? 1 : 0) +
    (dateTo.trim() ? 1 : 0) +
    (amountMin.trim() ? 1 : 0) +
    (amountMax.trim() ? 1 : 0) +
    selectedTags.length +
    (sort !== 'newest' ? 1 : 0) +
    (favoritesOnly ? 1 : 0);

  const applyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: applyScale.value }],
  }));

  return (
    <View style={styles.root}>
      {/* Ambient Obsidian Glow */}
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.2)', 'rgba(6, 182, 212, 0.06)', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.responsiveContainer}>
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(500).springify().damping(17)}
            style={styles.header}
          >
            <View>
              <View style={styles.badgeRow}>
                <SlidersHorizontal size={12} color={OBSIDIAN.emerald} />
                <Text style={styles.badgeText}>VAULT QUERY BUILDER</Text>
              </View>
              <Text style={styles.title}>Search & Filters</Text>
            </View>

            {activeCount > 0 && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{activeCount} active</Text>
              </View>
            )}
          </Animated.View>

          {/* Keyword Search Card */}
          <Animated.View
            entering={FadeInDown.delay(60).duration(500).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionLabel}>KEYWORD SEARCH</Text>
            <View style={styles.groupCard}>
              <ObsidianFilterInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search by store, item, or note..."
                icon={<Search size={16} color={OBSIDIAN.emerald} />}
              />
            </View>
          </Animated.View>

          {/* Sort By Card */}
          <Animated.View
            entering={FadeInDown.delay(110).duration(500).springify()}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <ArrowUpDown size={13} color={OBSIDIAN.cyan} />
              <Text style={styles.sectionLabelNoMargin}>SORT ORDER</Text>
            </View>
            <View style={styles.groupCard}>
              <View style={styles.chipWrap}>
                {SORT_OPTIONS.map((opt) => {
                  const selected = sort === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setSort(opt.value)}
                      style={[
                        styles.pill,
                        selected && {
                          backgroundColor: OBSIDIAN.cyanBg,
                          borderColor: OBSIDIAN.cyanBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          selected && { color: OBSIDIAN.cyan, fontWeight: '800' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Categories Card */}
          <Animated.View
            entering={FadeInUp.delay(160).duration(500).springify()}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <Layers size={13} color={OBSIDIAN.emerald} />
              <Text style={styles.sectionLabelNoMargin}>CATEGORIES</Text>
            </View>
            <View style={styles.groupCard}>
              <View style={styles.chipWrap}>
                {CATEGORIES.map((cat) => {
                  const selected = selectedCategories.includes(cat);
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => toggleCategory(cat)}
                      style={[
                        styles.pill,
                        selected && {
                          backgroundColor: OBSIDIAN.emeraldBg,
                          borderColor: OBSIDIAN.emeraldBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          selected && { color: OBSIDIAN.emerald, fontWeight: '800' },
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Date Range Card */}
          <Animated.View
            entering={FadeInUp.delay(210).duration(500).springify()}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <Calendar size={13} color={OBSIDIAN.textSecondary} />
              <Text style={styles.sectionLabelNoMargin}>DATE RANGE</Text>
            </View>
            <View style={styles.groupCard}>
              <View style={styles.rangeRow}>
                <View style={styles.rangeCol}>
                  <ObsidianFilterInput
                    label="From"
                    placeholder="DD/MM/YYYY"
                    value={dateFrom}
                    onChangeText={setDateFrom}
                  />
                </View>
                <Text style={styles.rangeDash}>—</Text>
                <View style={styles.rangeCol}>
                  <ObsidianFilterInput
                    label="To"
                    placeholder="DD/MM/YYYY"
                    value={dateTo}
                    onChangeText={setDateTo}
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Amount Range Card */}
          <Animated.View
            entering={FadeInUp.delay(250).duration(500).springify()}
            style={styles.section}
          >
            <View style={styles.sectionTitleRow}>
              <IndianRupee size={13} color={OBSIDIAN.emerald} />
              <Text style={styles.sectionLabelNoMargin}>AMOUNT RANGE (₹)</Text>
            </View>
            <View style={styles.groupCard}>
              <View style={styles.rangeRow}>
                <View style={styles.rangeCol}>
                  <ObsidianFilterInput
                    label="Min ₹"
                    placeholder="0"
                    value={amountMin}
                    onChangeText={setAmountMin}
                    keyboardType="numeric"
                  />
                </View>
                <Text style={styles.rangeDash}>—</Text>
                <View style={styles.rangeCol}>
                  <ObsidianFilterInput
                    label="Max ₹"
                    placeholder="50,000"
                    value={amountMax}
                    onChangeText={setAmountMax}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Tags Card */}
          {tags && tags.length > 0 && (
            <Animated.View
              entering={FadeInUp.delay(290).duration(500).springify()}
              style={styles.section}
            >
              <View style={styles.sectionTitleRow}>
                <Tag size={13} color={OBSIDIAN.indigo} />
                <Text style={styles.sectionLabelNoMargin}>TAGS</Text>
              </View>
              <View style={styles.groupCard}>
                <View style={styles.chipWrap}>
                  {tags.map((tag) => {
                    const selected = selectedTags.includes(tag.name);
                    return (
                      <Pressable
                        key={tag.id}
                        onPress={() => toggleTag(tag.name)}
                        style={[
                          styles.pill,
                          selected && {
                            backgroundColor: OBSIDIAN.indigoBg,
                            borderColor: OBSIDIAN.indigoBorder,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            selected && { color: OBSIDIAN.indigo, fontWeight: '800' },
                          ]}
                        >
                          #{tag.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Favorites Only Toggle Card */}
          <Animated.View
            entering={FadeInUp.delay(320).duration(500).springify()}
            style={styles.section}
          >
            <Pressable
              onPress={() => setFavoritesOnly((prev) => !prev)}
              style={[
                styles.favoriteCard,
                favoritesOnly && {
                  backgroundColor: OBSIDIAN.amberBg,
                  borderColor: OBSIDIAN.amberBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.favIconBox,
                  favoritesOnly && { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
                ]}
              >
                <Star
                  size={18}
                  color={favoritesOnly ? OBSIDIAN.amber : OBSIDIAN.textSecondary}
                  fill={favoritesOnly ? OBSIDIAN.amber : 'transparent'}
                />
              </View>
              <View style={styles.favBody}>
                <Text style={styles.favTitle}>Favorites Only</Text>
                <Text style={styles.favSub}>
                  Show only starred receipts in your vault
                </Text>
              </View>
              <View
                style={[
                  styles.checkCircle,
                  favoritesOnly && {
                    backgroundColor: OBSIDIAN.amber,
                    borderColor: OBSIDIAN.amber,
                  },
                ]}
              >
                {favoritesOnly && <Check size={13} color="#09090B" strokeWidth={3} />}
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Footer Actions */}
      <View style={styles.footerBar}>
        <View style={styles.footerInner}>
          <Pressable onPress={handleReset} style={styles.resetBtn}>
            <RotateCcw size={15} color={OBSIDIAN.textSecondary} />
            <Text style={styles.resetBtnText}>Reset</Text>
          </Pressable>

          <AnimatedPressable
            onPressIn={() => {
              applyScale.value = withSpring(0.97, { damping: 16, stiffness: 320 });
            }}
            onPressOut={() => {
              applyScale.value = withSpring(1, { damping: 16, stiffness: 320 });
            }}
            onPress={handleApply}
            style={[styles.applyTouchable, applyAnimatedStyle]}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.applyGradient}
            >
              <Check size={18} color="#042F1E" strokeWidth={2.7} />
              <Text style={styles.applyText}>
                Apply Filters{activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </LinearGradient>
          </AnimatedPressable>
        </View>
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
  scrollContent: {
    paddingTop: 18,
    paddingBottom: 112,
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
  activeBadge: {
    backgroundColor: OBSIDIAN.emeraldBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.emeraldBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activeBadgeText: {
    color: OBSIDIAN.emerald,
    fontSize: 12,
    fontWeight: '800',
  },
  /* Sections */
  section: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionLabel: {
    color: OBSIDIAN.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionLabelNoMargin: {
    color: OBSIDIAN.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  groupCard: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  /* Inputs */
  inputWrapper: {
    width: '100%',
  },
  miniLabel: {
    color: OBSIDIAN.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 5,
    marginLeft: 2,
  },
  inputBox: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.inputBg,
    borderRadius: 13,
    borderWidth: 1.2,
    borderColor: OBSIDIAN.border,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 9,
  },
  inputText: {
    flex: 1,
    color: OBSIDIAN.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Chips */
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 13,
    paddingVertical: 7.5,
    borderRadius: 999,
    backgroundColor: OBSIDIAN.inputBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  pillText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  /* Range Inputs */
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rangeCol: {
    flex: 1,
  },
  rangeDash: {
    color: OBSIDIAN.textMuted,
    fontSize: 16,
    marginTop: 18,
  },
  /* Favorites Toggle Card */
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    gap: 12,
  },
  favIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBody: {
    flex: 1,
  },
  favTitle: {
    color: OBSIDIAN.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  favSub: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Sticky Footer */
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(9, 9, 11, 0.94)',
    borderTopWidth: 1,
    borderTopColor: OBSIDIAN.border,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  footerInner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetBtn: {
    height: 50,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: OBSIDIAN.surface,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resetBtnText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  applyTouchable: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  applyGradient: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  applyText: {
    color: '#042F1E',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});