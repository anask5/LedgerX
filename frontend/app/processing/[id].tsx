import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import { useReceipt } from '../../src/hooks/useReceipt';
import { colors } from '../../src/theme';

const TIMEOUT_MS = 60_000; // 60 seconds

export default function ProcessingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receipt, isError } = useReceipt(id);
  const [timedOut, setTimedOut] = useState(false);
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  // Pulse animation
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  // Timeout after 60s
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  // Navigate when done
  useEffect(() => {
    if (!receipt) return;

    if (receipt.status === 'ready') {
      router.replace(`/review/${id}`);
    } else if (receipt.status === 'failed') {
      router.replace(`/review/${id}`);
    }
  }, [receipt?.status, id]);

  // Handle timeout → go to vault
  useEffect(() => {
    if (timedOut) {
      router.replace('/(tabs)/vault');
    }
  }, [timedOut]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, { opacity: pulseAnim }]}>
        <Text style={styles.icon}>🔍</Text>
      </Animated.View>

      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />

      <Text variant="headlineSmall" style={styles.title}>
        Reading your receipt...
      </Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Our AI is extracting the details. This usually takes a few seconds.
      </Text>

      <View style={styles.steps}>
        <StepIndicator label="Uploading" done />
        <StepIndicator label="Analyzing image" active />
        <StepIndicator label="Extracting details" />
        <StepIndicator label="Ready for review" />
      </View>
    </View>
  );
}

function StepIndicator({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <View style={styles.stepRow}>
      <View
        style={[
          styles.stepDot,
          done && styles.stepDotDone,
          active && styles.stepDotActive,
        ]}
      />
      <Text
        variant="bodyMedium"
        style={[
          styles.stepLabel,
          done && styles.stepLabelDone,
          active && styles.stepLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 72,
  },
  spinner: {
    marginBottom: 24,
  },
  title: {
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.grey,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 22,
  },
  steps: {
    alignSelf: 'stretch',
    paddingHorizontal: 40,
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  stepDotDone: {
    backgroundColor: colors.success,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#99F6E4',
  },
  stepLabel: {
    color: colors.grey,
  },
  stepLabelDone: {
    color: colors.success,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
