import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  Camera,
  Image as ImageIcon,
  FileText,
  ScanLine,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Shield,
} from 'lucide-react-native';
import { useUpload } from '../../src/hooks/useUpload';

const OBSIDIAN = {
  bg: '#09090B',
  surface: '#121216',
  cardHover: '#18181E',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  emerald: '#10B981',
  emeraldDark: '#059669',
  indigo: '#6366F1',
  violet: '#A855F7',
  dangerBg: 'rgba(244, 63, 94, 0.12)',
  dangerText: '#FB7185',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface UploadOptionCardProps {
  title: string;
  description: string;
  badgeText: string;
  accentColor: string;
  gradientColors: [string, string];
  icon: React.ReactNode;
  onPress: () => void;
  delay: number;
}

function UploadOptionCard({
  title,
  description,
  badgeText,
  accentColor,
  gradientColors,
  icon,
  onPress,
  delay,
}: UploadOptionCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(550).springify().damping(17)}
    >
      <AnimatedPressable
        onPressIn={() => {
          scale.value = withSpring(0.975, { damping: 16, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 320 });
        }}
        onPress={onPress}
        style={[styles.optionCard, animatedStyle]}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.optionIconRing}
        >
          <View style={styles.optionIconInner}>{icon}</View>
        </LinearGradient>

        <View style={styles.optionBody}>
          <View style={styles.optionTitleRow}>
            <Text style={styles.optionTitle}>{title}</Text>
            <View
              style={[
                styles.miniTag,
                {
                  backgroundColor: `${accentColor}1A`,
                  borderColor: `${accentColor}40`,
                },
              ]}
            >
              <Text style={[styles.miniTagText, { color: accentColor }]}>
                {badgeText}
              </Text>
            </View>
          </View>
          <Text style={styles.optionDesc}>{description}</Text>
        </View>

        <View style={styles.chevronCircle}>
          <ChevronRight size={18} color={OBSIDIAN.textSecondary} />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

function ScanningLoader({ state }: { state: string }) {
  const scanLineY = useSharedValue(-22);
  const ringPulse = useSharedValue(1);

  useEffect(() => {
    scanLineY.value = withRepeat(
      withSequence(
        withTiming(22, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
        withTiming(-22, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    ringPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringPulse.value }],
  }));

  const isOptimizing = state === 'optimizing';

  return (
    <View style={[styles.root, styles.center]}>
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.22)', 'rgba(6, 182, 212, 0.06)', 'transparent']}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <Animated.View
        entering={FadeInUp.duration(500).springify()}
        style={styles.statusCard}
      >
        <Animated.View style={[styles.scannerBadgeWrapper, pulseStyle]}>
          <LinearGradient
            colors={['rgba(16, 185, 129, 0.4)', 'rgba(6, 182, 212, 0.2)']}
            style={styles.scannerOuterRing}
          >
            <View style={styles.scannerInnerBox}>
              <FileText size={32} color={OBSIDIAN.emerald} strokeWidth={1.8} />
              <Animated.View style={[styles.laserBeam, lineStyle]} />
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.pillBadge}>
          <Sparkles size={12} color={OBSIDIAN.emerald} />
          <Text style={styles.pillText}>AI VISION PIPELINE</Text>
        </View>

        <Text style={styles.statusTitle}>
          {isOptimizing ? 'Optimizing receipt image...' : 'Extracting receipt details...'}
        </Text>
        <Text style={styles.statusSubtitle}>
          {isOptimizing
            ? 'Enhancing clarity and compressing for fast upload'
            : 'Reading merchant, line items, totals & warranty dates'}
        </Text>

        <View style={styles.progressPill}>
          <ActivityIndicator size="small" color={OBSIDIAN.emerald} />
          <Text style={styles.progressText}>
            {isOptimizing ? 'Step 1 of 2 • Preparing file' : 'Step 2 of 2 • Processing OCR'}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function AddScreen() {
  const { pickFromCamera, pickFromGallery, pickPDF, isUploading, state, error, reset } = useUpload();
  const retryScale = useSharedValue(1);

  const retryAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: retryScale.value }],
  }));

  if (isUploading) {
    return <ScanningLoader state={state} />;
  }

  if (state === 'error') {
    return (
      <View style={[styles.root, styles.center]}>
        <LinearGradient
          colors={['rgba(244, 63, 94, 0.18)', 'transparent']}
          style={styles.topGlow}
          pointerEvents="none"
        />

        <Animated.View
          entering={FadeInUp.duration(450).springify().damping(17)}
          style={styles.statusCard}
        >
          <Animated.View entering={ZoomIn.delay(100).springify()} style={styles.errorIconRing}>
            <AlertTriangle size={32} color={OBSIDIAN.dangerText} strokeWidth={2.2} />
          </Animated.View>

          <Text style={styles.errorTitle}>Upload Failed</Text>
          <Text style={styles.errorMessage}>
            {error || 'We could not process that receipt. Please check your connection and try again.'}
          </Text>

          <AnimatedPressable
            onPressIn={() => {
              retryScale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
            }}
            onPressOut={() => {
              retryScale.value = withSpring(1, { damping: 15, stiffness: 300 });
            }}
            onPress={reset}
            style={[styles.retryTouchable, retryAnimatedStyle]}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.retryGradient}
            >
              <RotateCcw size={17} color="#042F1E" strokeWidth={2.5} />
              <Text style={styles.retryText}>Try Again</Text>
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>
      </View>
    );
  }

  const scanTips = [
    'Lay the receipt flat on a contrasting surface',
    'Ensure bright, even lighting without harsh shadows',
    'Keep all four corners and totals inside the frame',
    'Supports JPG, PNG & PDF files up to 10 MB',
  ];

  return (
    <View style={styles.root}>
      {/* Ambient Obsidian Top Lighting */}
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.2)', 'rgba(99, 102, 241, 0.06)', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.responsiveContainer}>
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(550).springify().damping(17)}
            style={styles.header}
          >
            <LinearGradient
              colors={['rgba(16, 185, 129, 0.3)', 'rgba(6, 182, 212, 0.14)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerBadge}
            >
              <View style={styles.headerBadgeInner}>
                <ScanLine size={28} color={OBSIDIAN.emerald} strokeWidth={2.2} />
              </View>
            </LinearGradient>

            <View style={styles.pillBadge}>
              <Sparkles size={12} color={OBSIDIAN.emerald} />
              <Text style={styles.pillText}>INSTANT AI SCANNER</Text>
            </View>

            <Text style={styles.title}>Add Receipt</Text>
            <Text style={styles.subtitle}>
              Snap a photo or import a file to auto-extract items & warranty dates
            </Text>
          </Animated.View>

          {/* Interactive Source Cards */}
          <View style={styles.cardsStack}>
            <UploadOptionCard
              title="Scan with Camera"
              description="Snap a live photo of any paper receipt"
              badgeText="FASTEST"
              accentColor={OBSIDIAN.emerald}
              gradientColors={['rgba(16, 185, 129, 0.35)', 'rgba(5, 150, 105, 0.12)']}
              icon={<Camera size={24} color={OBSIDIAN.emerald} strokeWidth={2.1} />}
              onPress={pickFromCamera}
              delay={120}
            />

            <UploadOptionCard
              title="Photo Gallery"
              description="Import an existing receipt screenshot or photo"
              badgeText="JPG / PNG"
              accentColor={OBSIDIAN.indigo}
              gradientColors={['rgba(99, 102, 241, 0.35)', 'rgba(79, 70, 229, 0.12)']}
              icon={<ImageIcon size={24} color="#818CF8" strokeWidth={2.1} />}
              onPress={pickFromGallery}
              delay={200}
            />

            <UploadOptionCard
              title="PDF Invoice"
              description="Upload digital bills, e-receipts & warranties"
              badgeText="DOCUMENT"
              accentColor={OBSIDIAN.violet}
              gradientColors={['rgba(168, 85, 247, 0.35)', 'rgba(124, 58, 237, 0.12)']}
              icon={<FileText size={24} color="#C084FC" strokeWidth={2.1} />}
              onPress={pickPDF}
              delay={280}
            />
          </View>

          {/* Elevated Tips Card */}
          <Animated.View
            entering={FadeInUp.delay(360).duration(550).springify().damping(18)}
            style={styles.tipsCard}
          >
            <View style={styles.tipsHeader}>
              <View style={styles.tipsIconDot}>
                <Shield size={14} color={OBSIDIAN.emerald} />
              </View>
              <Text style={styles.tipsTitle}>Best Scan Practices</Text>
            </View>

            <View style={styles.tipsList}>
              {scanTips.map((tip, idx) => (
                <View key={idx} style={styles.tipRow}>
                  <CheckCircle2 size={14} color={OBSIDIAN.emerald} style={styles.tipCheck} />
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  headerBadge: {
    width: 66,
    height: 66,
    borderRadius: 22,
    padding: 1.5,
    marginBottom: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  headerBadgeInner: {
    flex: 1,
    backgroundColor: '#111615',
    borderRadius: 20.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  pillText: {
    color: OBSIDIAN.emerald,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: OBSIDIAN.textPrimary,
    letterSpacing: -0.6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: OBSIDIAN.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  cardsStack: {
    gap: 14,
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  optionIconRing: {
    width: 54,
    height: 54,
    borderRadius: 16,
    padding: 1.5,
    marginRight: 14,
  },
  optionIconInner: {
    flex: 1,
    backgroundColor: '#141419',
    borderRadius: 14.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionBody: {
    flex: 1,
    paddingRight: 8,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: OBSIDIAN.textPrimary,
    letterSpacing: -0.2,
  },
  miniTag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  optionDesc: {
    fontSize: 13,
    color: OBSIDIAN.textSecondary,
    lineHeight: 18,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.18)',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tipsIconDot: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: OBSIDIAN.textPrimary,
    letterSpacing: -0.1,
  },
  tipsList: {
    gap: 8,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  tipCheck: {
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: OBSIDIAN.textSecondary,
    lineHeight: 18,
  },
  /* Uploading & Error States */
  statusCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 12,
  },
  scannerBadgeWrapper: {
    marginBottom: 18,
  },
  scannerOuterRing: {
    width: 84,
    height: 84,
    borderRadius: 26,
    padding: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  scannerInnerBox: {
    flex: 1,
    backgroundColor: '#101614',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  laserBeam: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2.5,
    backgroundColor: '#10B981',
    borderRadius: 2,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  statusTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: OBSIDIAN.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  statusSubtitle: {
    fontSize: 13.5,
    color: OBSIDIAN.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  progressText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  errorIconRing: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: OBSIDIAN.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: OBSIDIAN.textPrimary,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: OBSIDIAN.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryTouchable: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  retryGradient: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryText: {
    color: '#042F1E',
    fontSize: 15,
    fontWeight: '800',
  },
});