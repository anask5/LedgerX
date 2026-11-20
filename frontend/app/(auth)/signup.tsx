import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Receipt,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react-native';
import { signupSchema, type SignupFormData } from '../../src/lib/validation';
import { useAuth } from '../../src/hooks/useAuth';

const OBSIDIAN = {
  bg: '#09090B',
  surface: '#121216',
  inputBg: '#18181D',
  border: 'rgba(255, 255, 255, 0.08)',
  borderFocus: '#10B981',
  borderError: '#F43F5E',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  emerald: '#10B981',
  emeraldDark: '#059669',
  cyan: '#06B6D4',
  dangerBg: 'rgba(244, 63, 94, 0.12)',
  dangerText: '#FB7185',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ObsidianInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  error?: string;
  icon: React.ReactNode;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
  autoComplete?: 'email' | 'name' | 'password-new';
  delay?: number;
}

function ObsidianInput({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  error,
  icon,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  delay = 0,
}: ObsidianInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const borderColor = error
    ? OBSIDIAN.borderError
    : isFocused
    ? OBSIDIAN.borderFocus
    : OBSIDIAN.border;

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500).springify().damping(18)}
      style={styles.fieldWrapper}
    >
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          {
            borderColor,
            backgroundColor: isFocused ? '#1C1C22' : OBSIDIAN.inputBg,
          },
          isFocused && !error && styles.inputFocusedShadow,
        ]}
      >
        <View style={styles.iconLeft}>{icon}</View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur();
          }}
          placeholder={placeholder}
          placeholderTextColor={OBSIDIAN.textMuted}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          selectionColor={OBSIDIAN.emerald}
          style={[
            styles.textInput,
            Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
          ]}
        />
        {secureTextEntry && (
          <Pressable
            onPress={() => setIsPasswordVisible((prev) => !prev)}
            hitSlop={10}
            style={styles.iconRight}
          >
            {isPasswordVisible ? (
              <EyeOff size={18} color={OBSIDIAN.textSecondary} />
            ) : (
              <Eye size={18} color={OBSIDIAN.textMuted} />
            )}
          </Pressable>
        )}
      </View>
      {error && (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.errorRow}>
          <AlertCircle size={13} color={OBSIDIAN.dangerText} />
          <Text style={styles.fieldErrorText}>{error}</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

export default function SignupScreen() {
  const { signup } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buttonScale = useSharedValue(1);
  const shakeX = useSharedValue(0);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 55 }),
      withTiming(8, { duration: 55 }),
      withTiming(-6, { duration: 55 }),
      withTiming(6, { duration: 55 }),
      withTiming(0, { duration: 55 })
    );
  };

  const onSubmit = async (data: SignupFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await signup(data.name, data.email, data.password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const formShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  return (
    <View style={styles.root}>
      {/* Ambient Obsidian Glow Orbs */}
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.22)', 'rgba(6, 182, 212, 0.05)', 'transparent']}
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

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.responsiveContainer}>
            {/* Brand Header */}
            <Animated.View
              entering={FadeInDown.duration(600).springify().damping(16)}
              style={styles.header}
            >
              <LinearGradient
                colors={['rgba(16, 185, 129, 0.25)', 'rgba(6, 182, 212, 0.12)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoBadge}
              >
                <View style={styles.logoInner}>
                  <Receipt size={28} color={OBSIDIAN.emerald} strokeWidth={2.2} />
                </View>
              </LinearGradient>

              <View style={styles.pillBadge}>
                <Sparkles size={12} color={OBSIDIAN.emerald} />
                <Text style={styles.pillText}>SMART RECEIPT VAULT</Text>
              </View>

              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>
                Scan, track warranties, and organize expenses in seconds
              </Text>
            </Animated.View>

            {/* Elevated Obsidian Card */}
            <Animated.View
              entering={FadeInUp.delay(120).duration(600).springify().damping(18)}
              style={[styles.card, formShakeStyle]}
            >
              {error && (
                <Animated.View entering={FadeInDown.duration(250)} style={styles.errorBanner}>
                  <AlertCircle size={16} color={OBSIDIAN.dangerText} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </Animated.View>
              )}

              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ObsidianInput
                    label="Full Name"
                    placeholder="Anas Khan"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="words"
                    autoComplete="name"
                    error={errors.name?.message}
                    icon={<User size={18} color={OBSIDIAN.textSecondary} />}
                    delay={180}
                  />
                )}
              />

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ObsidianInput
                    label="Email Address"
                    placeholder="you@example.com"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    error={errors.email?.message}
                    icon={<Mail size={18} color={OBSIDIAN.textSecondary} />}
                    delay={240}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ObsidianInput
                    label="Password"
                    placeholder="Min. 8 characters"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoComplete="password-new"
                    error={errors.password?.message}
                    icon={<Lock size={18} color={OBSIDIAN.textSecondary} />}
                    delay={300}
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ObsidianInput
                    label="Confirm Password"
                    placeholder="Re-enter password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    error={errors.confirmPassword?.message}
                    icon={<Lock size={18} color={OBSIDIAN.textSecondary} />}
                    delay={360}
                  />
                )}
              />

              {/* Animated Gradient Submit Button */}
              <Animated.View
                entering={FadeInDown.delay(420).duration(500).springify()}
                style={styles.buttonWrapper}
              >
                <AnimatedPressable
                  disabled={isSubmitting}
                  onPressIn={() => {
                    buttonScale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
                  }}
                  onPressOut={() => {
                    buttonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                  }}
                  onPress={() => handleSubmit(onSubmit, triggerShake)()}
                  style={[styles.ctaTouchable, buttonAnimatedStyle]}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.ctaGradient, isSubmitting && { opacity: 0.75 }]}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#052E16" />
                    ) : (
                      <>
                        <Text style={styles.ctaText}>Create Account</Text>
                        <ArrowRight size={18} color="#052E16" strokeWidth={2.5} />
                      </>
                    )}
                  </LinearGradient>
                </AnimatedPressable>
              </Animated.View>
            </Animated.View>

            {/* Footer Link */}
            <Animated.View
              entering={FadeInUp.delay(480).duration(500)}
              style={styles.loginRow}
            >
              <Text style={styles.loginText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.loginLink}>Log in</Text>
                </Pressable>
              </Link>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: OBSIDIAN.bg,
  },
  flex: {
    flex: 1,
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  responsiveContainer: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    padding: 1.5,
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  logoInner: {
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
    marginBottom: 12,
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
  card: {
    backgroundColor: OBSIDIAN.surface,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: OBSIDIAN.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: OBSIDIAN.dangerBg,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorBannerText: {
    color: OBSIDIAN.dangerText,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  fieldWrapper: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 2,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 14,
  },
  inputFocusedShadow: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  iconLeft: {
    marginRight: 10,
  },
  iconRight: {
    marginLeft: 8,
    padding: 4,
  },
  textInput: {
    flex: 1,
    color: OBSIDIAN.textPrimary,
    fontSize: 15,
    height: '100%',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 5,
    marginLeft: 4,
  },
  fieldErrorText: {
    color: OBSIDIAN.dangerText,
    fontSize: 12,
    fontWeight: '500',
  },
  buttonWrapper: {
    marginTop: 10,
  },
  ctaTouchable: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaGradient: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#042F1E',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: OBSIDIAN.emerald,
    fontSize: 14,
    fontWeight: '700',
  },
});