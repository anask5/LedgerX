import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  FileText,
  Sparkles,
  CheckCircle2,
  Circle,
  Loader2,
  Clock,
  ArrowRight,
  AlertCircle,
} from 'lucide-react-native';
import { useReceipt } from '../../src/hooks/useReceipt';

const TIMEOUT_MS = 60_000; // 60 seconds

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
  cyan: '#06B6D4',
  amber: '#F59E0B',
  amberBg: 'rgba(245, 158, 11, 0.12)',
};

const PIPELINE_STEPS = [
  { key: 'upload', label: 'Uploading receipt to vault', sub: 'Encrypted transfer complete' },
  { key: 'vision', label: 'Analyzing image clarity', sub: 'Detecting merchant & layout' },
  { key: 'extract', label: 'Extracting line items & totals', sub: 'Parsing dates & warranty terms' },
  { key: 'ready', label: 'Preparing review summary', sub: 'Finalizing structured data' },
];

export default function ProcessingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receipt, isError } = useReceipt(id);
  const [timedOut, setTimedOut] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const laserY = useSharedValue(-30);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.45);
  const spinDeg = useSharedValue(0);

  useEffect(() => {
    laserY.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-30, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    ringScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 1400, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );

    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1400, easing: Easing.out(Easing.ease) }),
        withTiming(0.45, { duration: 0 })
      ),
      -1,
      false
    );

    spinDeg.value = withRepeat(
      withTiming(360, { duration: 1100, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!receipt || !id) return;

    if (receipt.status === 'ready' || receipt.status === 'failed') {
      router.replace(`/review/${id}`);
    }
  }, [receipt?.status, id]);

  useEffect(() => {
    if (timedOut) {
      router.replace('/(tabs)/vault');
    }
  }, [timedOut]);

  const laserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laserY.value }],
  }));

  const sonarStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinDeg.value}deg` }],
  }));

  const isDone = receipt?.status === 'ready' || receipt?.status === 'failed';
  const activeStepIndex = isDone
    ? 4
    : elapsedSec < 3
    ? 1
    : elapsedSec < 8
    ? 2
    : 3;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.24)', 'rgba(6, 182, 212, 0.07)', 'transparent']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(16, 185, 129, 0.08)']}
        style={styles.bottomGlow}
        pointerEvents="none"
      />

      <View style={styles.responsiveContainer}>
        <Animated.View
          entering={FadeInUp.duration(550).springify().damping(17)}
          style={styles.card}
        >
          <View style={styles.scannerStage}>
            <Animated.View style={[styles.sonarRing, sonarStyle]} />

            <LinearGradient
              colors={['rgba(16, 185, 129, 0.45)', 'rgba(6, 182, 212, 0.22)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scannerOuter}
            >
              <View style={styles.scannerInner}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                <FileText size={38} color={OBSIDIAN.emerald} strokeWidth={1.7} />

                <Animated.View style={[styles.laserBeam, laserStyle]}>
                  <LinearGradient
                    colors={['transparent', '#10B981', '#06B6D4', '#10B981', 'transparent']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.laserLine}
                  />
                </Animated.View>
              </View>
            </LinearGradient>
          </View>

          <Animated.View
            entering={FadeInDown.delay(100).duration(450)}
            style={styles.pillBadge}
          >
            <Sparkles size={12} color={OBSIDIAN.emerald} />
            <Text style={styles.pillText}>GEMINI VISION OCR</Text>
          </Animated.View>

          <Text style={styles.title}>Reading your receipt…</Text>
          <Text style={styles.subtitle}>
            Extracting merchant details, line items, taxes, and warranty dates automatically.
          </Text>

          {isError && (
            <View style={styles.warnBanner}>
              <AlertCircle size={14} color={OBSIDIAN.amber} />
              <Text style={styles.warnText}>
                Still syncing with server—retrying automatically…
              </Text>
            </View>
          )}

          <View style={styles.stepsCard}>
            {PIPELINE_STEPS.map((step, index) => {
              const done = index < activeStepIndex;
              const active = index === activeStepIndex;
              const isLast = index === PIPELINE_STEPS.length - 1;

              return (
                <View key={step.key} style={styles.stepWrapper}>
                  <View style={styles.stepRow}>
                    <View style={styles.stepIconCol}>
                      {done ? (
                        <Animated.View entering={ZoomIn.duration(250)}>
                          <CheckCircle2
                            size={20}
                            color={OBSIDIAN.emerald}
                            strokeWidth={2.4}
                          />
                        </Animated.View>
                      ) : active ? (
                        <Animated.View style={spinnerStyle}>
                          <Loader2
                            size={20}
                            color={OBSIDIAN.cyan}
                            strokeWidth={2.4}
                          />
                        </Animated.View>
                      ) : (
                        <Circle
                          size={20}
                          color={OBSIDIAN.textMuted}
                          strokeWidth={1.8}
                        />
                      )}
                    </View>

                    <View style={styles.stepTextCol}>
                      <Text
                        style={[
                          styles.stepLabel,
                          done && styles.stepLabelDone,
                          active && styles.stepLabelActive,
                        ]}
                      >
                        {step.label}
                      </Text>
                      {(done || active) && (
                        <Text style={styles.stepSub}>{step.sub}</Text>
                      )}
                    </View>
                  </View>

                  {!isLast && (
                    <View
                      style={[
                        styles.connectorLine,
                        done && { backgroundColor: 'rgba(16, 185, 129, 0.4)' },
                      ]}
                    />
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.footerRow}>
            <View style={styles.timerPill}>
              <Clock size={12} color={OBSIDIAN.textSecondary} />
              <Text style={styles.timerText}>Elapsed: {elapsedSec}s</Text>
            </View>

            {elapsedSec >= 12 && (
              <Pressable
                onPress={() => router.replace('/(tabs)/vault')}
                hitSlop={8}
                style={styles.vaultSkipBtn}
              >
                <Text style={styles.vaultSkipText}>Process in background</Text>
                <ArrowRight size={13} color={OBSIDIAN.emerald} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: OBSIDIAN.bg,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  topGlow: {
    position: 'absolute',
    top: -80,
    left: -60,
    right: -60,
    height: 360,
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
  },
  bottomGlow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 26,
    padding: 24,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 14,
  },
  scannerStage: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sonarRing: {
    position: 'absolute',
    width: 98,
    height: 98,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: OBSIDIAN.emerald,
  },
  scannerOuter: {
    width: 94,
    height: 94,
    borderRadius: 28,
    padding: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  scannerInner: {
    flex: 1,
    backgroundColor: '#0E1513',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: OBSIDIAN.emerald,
  },
  cornerTL: {
    top: 12,
    left: 12,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 12,
    right: 12,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderBottomRightRadius: 4,
  },
  laserBeam: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 3,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  laserLine: {
    flex: 1,
    borderRadius: 2,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: OBSIDIAN.emeraldBg,
    borderWidth: 1,
    borderColor: OBSIDIAN.emeraldBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 12,
  },
  pillText: {
    color: OBSIDIAN.emerald,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: OBSIDIAN.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13.5,
    color: OBSIDIAN.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
    maxWidth: 320,
  },
  warnBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: OBSIDIAN.amberBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 14,
  },
  warnText: {
    color: OBSIDIAN.amber,
    fontSize: 12,
    fontWeight: '600',
  },
  stepsCard: {
    width: '100%',
    backgroundColor: OBSIDIAN.surfaceElevated,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
  },
  stepWrapper: {
    width: '100%',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepIconCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTextCol: {
    flex: 1,
  },
  stepLabel: {
    color: OBSIDIAN.textMuted,
    fontSize: 13.5,
    fontWeight: '600',
  },
  stepLabelDone: {
    color: OBSIDIAN.textPrimary,
    fontWeight: '700',
  },
  stepLabelActive: {
    color: OBSIDIAN.cyan,
    fontWeight: '700',
  },
  stepSub: {
    color: OBSIDIAN.textSecondary,
    fontSize: 11.5,
    marginTop: 1.5,
  },
  connectorLine: {
    width: 2,
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 11,
    marginVertical: 3,
    borderRadius: 1,
  },
  footerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    paddingHorizontal: 2,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  timerText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 11.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  vaultSkipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vaultSkipText: {
    color: OBSIDIAN.emerald,
    fontSize: 12,
    fontWeight: '700',
  },
});