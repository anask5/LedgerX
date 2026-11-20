import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { Link, router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../../src/lib/validation';
import { useAuth } from '../../src/hooks/useAuth';
import { colors } from '../../src/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await login(data.email, data.password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🧾</Text>
          <Text variant="headlineMedium" style={styles.title}>
            ReceiptWise
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Your receipts, organized & safe
          </Text>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <TextInput
                  label="Email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  mode="outlined"
                  error={!!errors.email}
                  style={styles.input}
                />
                {errors.email && (
                  <HelperText type="error">{errors.email.message}</HelperText>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <TextInput
                  label="Password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  mode="outlined"
                  error={!!errors.password}
                  style={styles.input}
                />
                {errors.password && (
                  <HelperText type="error">{errors.password.message}</HelperText>
                )}
              </View>
            )}
          />

          <Link href="/(auth)/forgot-password" asChild>
            <Text variant="bodySmall" style={styles.forgotLink}>
              Forgot password?
            </Text>
          </Link>

          <Button
            mode="contained"
            onPress={() => handleSubmit(onSubmit)()}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.button}
            buttonColor={colors.primary}
            contentStyle={styles.buttonContent}
          >
            Log In
          </Button>

          <View style={styles.signupRow}>
            <Text variant="bodyMedium" style={styles.signupText}>
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/signup" asChild>
              <Text variant="bodyMedium" style={styles.signupLink}>
                Sign up
              </Text>
            </Link>
          </View>

          <Button
            mode="text"
            onPress={() => router.replace('/(tabs)')}
            textColor={colors.grey}
            style={styles.skipButton}
          >
            Continue as Guest →
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    color: colors.grey,
    marginTop: 4,
  },
  form: {
    gap: 4,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.white,
  },
  forgotLink: {
    color: colors.primary,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
    borderRadius: 24,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    color: colors.grey,
  },
  signupLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 8,
  },
});
