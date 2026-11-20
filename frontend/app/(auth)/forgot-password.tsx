import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../../src/lib/validation';
import { authApi } from '../../src/api/auth';
import { colors } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword(data.email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.checkIcon}>📧</Text>
        <Text variant="headlineSmall" style={styles.sentTitle}>
          Check Your Email
        </Text>
        <Text variant="bodyMedium" style={styles.sentMessage}>
          We've sent a password reset link to your email address.
        </Text>
        <Button
          mode="contained"
          onPress={() => router.back()}
          style={styles.button}
          buttonColor={colors.primary}
        >
          Back to Login
        </Button>
      </View>
    );
  }

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
          <Text style={styles.logo}>🔑</Text>
          <Text variant="headlineMedium" style={styles.title}>
            Reset Password
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Enter your email and we'll send you a reset link.
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

          <Button
            mode="contained"
            onPress={() => handleSubmit(onSubmit)()}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.button}
            buttonColor={colors.primary}
            contentStyle={styles.buttonContent}
          >
            Send Reset Link
          </Button>

          <Button
            mode="text"
            onPress={() => router.back()}
            textColor={colors.grey}
          >
            Back to Login
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
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontWeight: '700',
    color: colors.primary,
  },
  subtitle: {
    color: colors.grey,
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    gap: 8,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.white,
  },
  button: {
    marginTop: 8,
    borderRadius: 24,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  checkIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  sentTitle: {
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  sentMessage: {
    color: colors.grey,
    textAlign: 'center',
    marginBottom: 24,
  },
});
