import React, { useState, useEffect, useRef } from 'react';
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
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import {
  Receipt,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react-native';
import { loginSchema, type LoginFormData } from '../../src/lib/validation';
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
  autoComplete?: 'email' | 'password';
  returnKeyType?: 'next' | 'done';
  blurOnSubmit?: boolean;
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  rightLabelAction?: React.ReactNode;
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
  returnKeyType = 'done',
  blurOnSubmit = true,
  onSubmitEditing,
  inputRef,
  rightLabelAction,
}: ObsidianInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const borderColor = error
    ? OBSIDIAN.borderError
    : isFocused
    ? OBSIDIAN.borderFocus
    : OBSIDIAN.border;

  return (
    <View style={styles.fieldWrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {rightLabelAction}
      </View>

      <Pressable
        onPress={() => inputRef?.current?.focus()}
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
          ref={inputRef}
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
          returnKeyType={returnKeyType}
          blurOnSubmit={blurOnSubmit}
          onSubmitEditing={onSubmitEditing}
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
      </Pressable>

      {error && (
        <View style={styles.errorRow}>
          <AlertCircle size={13} color={OBSIDIAN.dangerText} />
          <Text style={styles.fieldErrorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

export default function LoginScreen() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailInputRef = useRef<TextInput | null>(null);
  const passwordInputRef = useRef<TextInput | null>(null);

  const buttonScale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const logoFloat = useSharedValue(0);

  useEffect(() => {
    logoFloat.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
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

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await login(data.email, data.password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please try again.');
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoFloat.value }],
  }));

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
        colors={['rgba(16, 185, 129, 0.24)', 'rgba(6, 182, 212, 0.06)', 'transparent']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', 'rgba(6, 182, 212, 0.07)']}
        style={styles.bottomGlow}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              <Animated.View style={logoAnimatedStyle}>
                <LinearGradient
                  colors={['rgba(16, 185, 129, 0.35)', 'rgba(6, 182, 212, 0.15)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoBadge}
                >
                  <View style={styles.logoInner}>
                    <Receipt size={30} color={OBSIDIAN.emerald} strokeWidth={2.2} />
                  </View>
                </LinearGradient>
              </Animated.View>

              <View style={styles.pillBadge}>
                <ShieldCheck size={12} color={OBSIDIAN.emerald} />
                <Text style={styles.pillText}>ENCRYPTED & SYNCED</Text>
              </View>

              <Text style={styles.title}>ReceiptWise</Text>
              <Text style={styles.subtitle}>
                Your receipts, warranties & spending—organized in one vault
              </Text>
            </Animated.View>

            {/* Elevated Obsidian Login Card */}
            <Animated.View
              entering={FadeInUp.delay(120).duration(600).springify().damping(18)}
              style={[styles.card, formShakeStyle]}
            >
              {error && (
                <View style={styles.errorBanner}>
                  <AlertCircle size={16} color={OBSIDIAN.dangerText} />
                  <Text style={styles.errorBannerText}>{error}</Text>
                </View>
              )}

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ObsidianInput
                    inputRef={emailInputRef}
                    label="Email Address"
                    placeholder="you@example.com"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                    error={errors.email?.message}
                    icon={<Mail size={18} color={OBSIDIAN.textSecondary} />}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <ObsidianInput
                    inputRef={passwordInputRef}
                    label="Password"
                    placeholder="Enter your password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    secureTextEntry
                    autoComplete="password"
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => handleSubmit(onSubmit, triggerShake)()}
                    error={errors.password?.message}
                    icon={<Lock size={18} color={OBSIDIAN.textSecondary} />}
                    rightLabelAction={
                      <Link href="/(auth)/forgot-password" asChild>
                        <Pressable hitSlop={8}>
                          <Text style={styles.forgotLink}>Forgot password?</Text>
                        </Pressable>
                      </Link>
                    }
                  />
                )}
              />

              {/* Primary Emerald Gradient Submit Button */}
              <View style={styles.buttonWrapper}>
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
                      <ActivityIndicator color="#042F1E" />
                    ) : (
                      <>
                        <Text style={styles.ctaText}>Log In</Text>
                        <ArrowRight size={18} color="#042F1E" strokeWidth={2.5} />
                      </>
                    )}
                  </LinearGradient>
                </AnimatedPressable>
              </View>
            </Animated.View>

            {/* Sign Up Footer */}
            <Animated.View
              entering={FadeInUp.delay(380).duration(500)}
              style={styles.signupRow}
            >
              <Text style={styles.signupText}>Don't have an account? </Text>
              <Link href="/(auth)/signup" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.signupLink}>Sign up</Text>
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
    height: 380,
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
    marginBottom: 28,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    padding: 1.5,
    marginBottom: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  logoInner: {
    flex: 1,
    backgroundColor: '#111615',
    borderRadius: 22.5,
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
    fontSize: 30,
    fontWeight: '800',
    color: OBSIDIAN.textPrimary,
    letterSpacing: -0.7,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: OBSIDIAN.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 310,
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
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  fieldLabel: {
    color: OBSIDIAN.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  forgotLink: {
    color: OBSIDIAN.emerald,
    fontSize: 12,
    fontWeight: '600',
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
    marginTop: 6,
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
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signupText: {
    color: OBSIDIAN.textSecondary,
    fontSize: 14,
  },
  signupLink: {
    color: OBSIDIAN.emerald,
    fontSize: 14,
    fontWeight: '700',
  },
});