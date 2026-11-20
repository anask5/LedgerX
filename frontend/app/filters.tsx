import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Chip, SegmentedButtons, Divider } from 'react-native-paper';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { tagsApi } from '../src/api/tags';
import { colors } from '../src/theme';

const CATEGORIES = ['Electronics', 'Groceries', 'Clothing', 'Food', 'Medical', 'Fuel', 'Travel', 'Other'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'highest_amount', label: 'Highest ₹' },
  { value: 'expiring_soonest', label: 'Expiring' },
];

export default function FiltersScreen() {
  const [query, setQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sort, setSort] = useState('newest');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

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
    // Build filter params and go back to vault with them
    // In a full app, these would be passed via route params or global state
    router.back();
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Search Query */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Search
      </Text>
      <TextInput
        placeholder="Search by store, item, or note..."
        value={query}
        onChangeText={setQuery}
        mode="outlined"
        dense
        style={styles.input}
        left={<TextInput.Icon icon="magnify" />}
      />

      <Divider style={styles.divider} />

      {/* Sort */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Sort By
      </Text>
      <View style={styles.chipRow}>
        {SORT_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            selected={sort === opt.value}
            onPress={() => setSort(opt.value)}
            style={styles.chip}
          >
            {opt.label}
          </Chip>
        ))}
      </View>

      <Divider style={styles.divider} />

      {/* Category */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Category
      </Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            selected={selectedCategories.includes(cat)}
            onPress={() => toggleCategory(cat)}
            style={styles.chip}
          >
            {cat}
          </Chip>
        ))}
      </View>

      <Divider style={styles.divider} />

      {/* Date Range */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Date Range
      </Text>
      <View style={styles.rangeRow}>
        <TextInput
          placeholder="DD/MM/YYYY"
          value={dateFrom}
          onChangeText={setDateFrom}
          mode="outlined"
          dense
          style={[styles.input, styles.rangeInput]}
          label="From"
        />
        <Text style={styles.rangeDash}>—</Text>
        <TextInput
          placeholder="DD/MM/YYYY"
          value={dateTo}
          onChangeText={setDateTo}
          mode="outlined"
          dense
          style={[styles.input, styles.rangeInput]}
          label="To"
        />
      </View>

      <Divider style={styles.divider} />

      {/* Amount Range */}
      <Text variant="titleMedium" style={styles.sectionTitle}>
        Amount Range (₹)
      </Text>
      <View style={styles.rangeRow}>
        <TextInput
          placeholder="Min"
          value={amountMin}
          onChangeText={setAmountMin}
          mode="outlined"
          dense
          keyboardType="numeric"
          style={[styles.input, styles.rangeInput]}
          label="Min ₹"
        />
        <Text style={styles.rangeDash}>—</Text>
        <TextInput
          placeholder="Max"
          value={amountMax}
          onChangeText={setAmountMax}
          mode="outlined"
          dense
          keyboardType="numeric"
          style={[styles.input, styles.rangeInput]}
          label="Max ₹"
        />
      </View>

      <Divider style={styles.divider} />

      {/* Tags */}
      {tags && tags.length > 0 && (
        <>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Tags
          </Text>
          <View style={styles.chipRow}>
            {tags.map((tag) => (
              <Chip
                key={tag.id}
                selected={selectedTags.includes(tag.name)}
                onPress={() => toggleTag(tag.name)}
                style={styles.chip}
              >
                #{tag.name}
              </Chip>
            ))}
          </View>
          <Divider style={styles.divider} />
        </>
      )}

      {/* Favorites */}
      <Chip
        selected={favoritesOnly}
        onPress={() => setFavoritesOnly(!favoritesOnly)}
        style={styles.chip}
        icon="star"
      >
        Favorites Only
      </Chip>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button mode="text" onPress={handleReset} textColor={colors.grey}>
          Reset All
        </Button>
        <Button
          mode="contained"
          onPress={handleApply}
          buttonColor={colors.primary}
          style={styles.applyButton}
          contentStyle={styles.applyContent}
        >
          Apply Filters
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 10,
  },
  input: {
    backgroundColor: colors.white,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: colors.surfaceVariant,
  },
  divider: {
    marginVertical: 16,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeInput: {
    flex: 1,
  },
  rangeDash: {
    color: colors.grey,
    fontSize: 18,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  applyButton: {
    borderRadius: 24,
    flex: 1,
    marginLeft: 12,
  },
  applyContent: {
    paddingVertical: 6,
  },
});
