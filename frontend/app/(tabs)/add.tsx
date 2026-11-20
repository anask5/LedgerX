import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useUpload } from '../../src/hooks/useUpload';
import { LoadingSkeleton } from '../../src/components/LoadingSkeleton';
import { colors } from '../../src/theme';

export default function AddScreen() {
  const { pickFromCamera, pickFromGallery, pickPDF, isUploading, state, error, reset } = useUpload();

  if (isUploading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.uploadIcon}>📤</Text>
        <Text variant="titleLarge" style={styles.uploadTitle}>
          {state === 'optimizing' ? 'Optimizing image...' : 'Uploading receipt...'}
        </Text>
        <Text variant="bodyMedium" style={styles.uploadSubtitle}>
          Please wait a moment
        </Text>
        <LoadingSkeleton count={1} />
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text variant="titleLarge" style={styles.errorTitle}>
          Upload Failed
        </Text>
        <Text variant="bodyMedium" style={styles.errorMessage}>
          {error || 'Something went wrong'}
        </Text>
        <Button mode="contained" onPress={reset} buttonColor={colors.primary} style={styles.retryButton}>
          Try Again
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📸</Text>
        <Text variant="headlineSmall" style={styles.title}>
          Add Receipt
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Capture or upload a receipt to get started
        </Text>
      </View>

      <View style={styles.buttons}>
        <Surface style={styles.optionCard} elevation={2}>
          <Button
            mode="contained"
            icon="camera"
            onPress={pickFromCamera}
            style={styles.optionButton}
            contentStyle={styles.optionButtonContent}
            buttonColor={colors.primary}
            labelStyle={styles.buttonLabel}
          >
            Camera
          </Button>
          <Text variant="bodySmall" style={styles.optionDesc}>
            Take a photo of your receipt
          </Text>
        </Surface>

        <Surface style={styles.optionCard} elevation={2}>
          <Button
            mode="contained"
            icon="image"
            onPress={pickFromGallery}
            style={styles.optionButton}
            contentStyle={styles.optionButtonContent}
            buttonColor="#4F46E5"
            labelStyle={styles.buttonLabel}
          >
            Gallery
          </Button>
          <Text variant="bodySmall" style={styles.optionDesc}>
            Choose from your photo library
          </Text>
        </Surface>

        <Surface style={styles.optionCard} elevation={2}>
          <Button
            mode="contained"
            icon="file-pdf-box"
            onPress={pickPDF}
            style={styles.optionButton}
            contentStyle={styles.optionButtonContent}
            buttonColor="#7C3AED"
            labelStyle={styles.buttonLabel}
          >
            PDF
          </Button>
          <Text variant="bodySmall" style={styles.optionDesc}>
            Upload a PDF receipt
          </Text>
        </Surface>
      </View>

      <View style={styles.tips}>
        <Text variant="titleSmall" style={styles.tipsTitle}>
          📋 Tips for best results
        </Text>
        <Text variant="bodySmall" style={styles.tip}>
          • Lay the receipt flat on a surface
        </Text>
        <Text variant="bodySmall" style={styles.tip}>
          • Ensure good lighting
        </Text>
        <Text variant="bodySmall" style={styles.tip}>
          • Include the full receipt in the frame
        </Text>
        <Text variant="bodySmall" style={styles.tip}>
          • Max file size: 10 MB
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    color: colors.grey,
    marginTop: 4,
  },
  buttons: {
    gap: 14,
    marginBottom: 32,
  },
  optionCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  optionButton: {
    borderRadius: 12,
    width: '100%',
  },
  optionButtonContent: {
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDesc: {
    color: colors.grey,
    marginTop: 8,
  },
  tips: {
    padding: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  tipsTitle: {
    fontWeight: '600',
    color: colors.success,
    marginBottom: 8,
  },
  tip: {
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  uploadIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  uploadTitle: {
    fontWeight: '600',
    color: colors.text,
  },
  uploadSubtitle: {
    color: colors.grey,
    marginTop: 4,
    marginBottom: 24,
  },
  errorIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  errorTitle: {
    fontWeight: '600',
    color: colors.danger,
  },
  errorMessage: {
    color: colors.grey,
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: 24,
    paddingHorizontal: 24,
  },
});
