import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme';

interface LoadingSkeletonProps {
  count?: number;
  style?: 'card' | 'row';
}

export function LoadingSkeleton({ count = 3, style = 'card' }: LoadingSkeletonProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={style === 'card' ? styles.card : styles.row}>
          <View style={styles.thumbnailPlaceholder} />
          <View style={styles.textArea}>
            <View style={[styles.line, styles.lineLong]} />
            <View style={[styles.line, styles.lineShort]} />
            <View style={[styles.line, styles.lineMedium]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  thumbnailPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  textArea: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    gap: 8,
  },
  line: {
    height: 12,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  lineLong: {
    width: '80%',
  },
  lineMedium: {
    width: '50%',
  },
  lineShort: {
    width: '30%',
  },
});
