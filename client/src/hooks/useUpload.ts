import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { receiptsApi } from '../api/receipts';
import {
  optimizeImage,
  isFileTooLarge,
  isLowResolution,
  IMAGE_CONSTRAINTS,
} from '../lib/imageOptimizer';

type UploadState = 'idle' | 'picking' | 'optimizing' | 'uploading' | 'done' | 'error';

function normalizeNativeUri(uri: string): string {
  if (Platform.OS === 'web') return uri;
  if (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('ph://')
  ) {
    return uri;
  }
  return `file://${uri}`;
}

function getErrorMessage(err: any): string {
  if (!err) return 'Upload failed';
  if (typeof err === 'string') return err;
  return err.message || err.detail || err.error || 'Upload failed';
}

function extractUploadPayload(rawResult: any) {
  const root = rawResult?.data ?? rawResult;
  const receiptObj = root?.receipt ?? root;
  const id = receiptObj?.id ?? receiptObj?._id ?? root?.receipt_id ?? root?.id;
  const duplicate = Boolean(root?.duplicate ?? receiptObj?.duplicate);
  const existingId = root?.existing_id ?? receiptObj?.existing_id;
  return { id, duplicate, existingId };
}

async function appendFileToForm(
  form: FormData,
  rawUri: string,
  name: string,
  type: string
) {
  if (Platform.OS === 'web') {
    const response = await fetch(rawUri);
    const blob = await response.blob();
    form.append('file', blob, name);
  } else {
    const uri = normalizeNativeUri(rawUri);
    form.append('file', {
      uri,
      name,
      type,
    } as any);
  }
}

export function useUpload() {
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleDuplicate = useCallback((existingId: string) => {
    Alert.alert(
      'Duplicate Receipt',
      "You've uploaded this receipt before.",
      [
        {
          text: 'View Existing',
          onPress: () => router.push(`/receipt/${existingId}`),
        },
        {
          text: 'Keep Both',
          onPress: () => {
            // The upload already created a new entry
          },
        },
      ]
    );
  }, []);

  const uploadImage = useCallback(
    async (uri: string, source: 'camera' | 'gallery') => {
      try {
        setError(null);
        setState('optimizing');
        const normalizedUri = normalizeNativeUri(uri);
        const optimized = await optimizeImage(normalizedUri);
        const fileUri = normalizeNativeUri(optimized?.uri || normalizedUri);

        setState('uploading');
        const form = new FormData();
        await appendFileToForm(form, fileUri, `receipt_${Date.now()}.jpg`, 'image/jpeg');
        form.append('source', source);

        const rawResult: any = await receiptsApi.upload(form);
        console.log('[useUpload] image upload response:', JSON.stringify(rawResult));

        const { id, duplicate, existingId } = extractUploadPayload(rawResult);
        if (!id) {
          throw new Error('Server did not return a receipt ID after upload.');
        }

        if (duplicate && existingId) {
          handleDuplicate(existingId);
          setState('done');
          return;
        }

        queryClient.invalidateQueries({ queryKey: ['receipts'] });
        setState('done');
        router.replace(`/processing/${id}`);
      } catch (err: any) {
        console.error('[useUpload] image upload failed:', err);
        setState('error');
        setError(getErrorMessage(err));
      }
    },
    [handleDuplicate, queryClient]
  );

  const pickFromCamera = useCallback(async () => {
    setError(null);
    setState('picking');

    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Camera permission is required to scan receipts.'
      );
      setState('idle');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) {
      setState('idle');
      return;
    }

    const asset = result.assets[0];
    if (asset.fileSize && isFileTooLarge(asset.fileSize)) {
      Alert.alert(
        'File too big',
        `Maximum file size is ${IMAGE_CONSTRAINTS.MAX_FILE_SIZE_MB} MB.`
      );
      setState('idle');
      return;
    }

    if (isLowResolution(asset.width, asset.height)) {
      Alert.alert(
        'Low Resolution Warning',
        'This image has a low resolution, which may make receipt text harder to extract. Continue anyway?',
        [
          { text: 'Retake', style: 'cancel', onPress: () => setState('idle') },
          { text: 'Continue', onPress: () => uploadImage(asset.uri, 'camera') },
        ]
      );
      return;
    }

    await uploadImage(asset.uri, 'camera');
  }, [uploadImage]);

  const pickFromGallery = useCallback(async () => {
    setError(null);
    setState('picking');

    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Media library permission is required to select receipt images.'
        );
        setState('idle');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) {
      setState('idle');
      return;
    }

    const asset = result.assets[0];
    if (asset.fileSize && isFileTooLarge(asset.fileSize)) {
      Alert.alert(
        'File too big',
        `Maximum file size is ${IMAGE_CONSTRAINTS.MAX_FILE_SIZE_MB} MB.`
      );
      setState('idle');
      return;
    }

    if (isLowResolution(asset.width, asset.height)) {
      Alert.alert(
        'Low Resolution Warning',
        'This image has a low resolution, which may make receipt text harder to extract. Continue anyway?',
        [
          { text: 'Choose Another', style: 'cancel', onPress: () => setState('idle') },
          { text: 'Continue', onPress: () => uploadImage(asset.uri, 'gallery') },
        ]
      );
      return;
    }

    await uploadImage(asset.uri, 'gallery');
  }, [uploadImage]);

  const pickPDF = useCallback(async () => {
    setError(null);
    setState('picking');

    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) {
      setState('idle');
      return;
    }

    const file = result.assets[0];
    if (file.size && isFileTooLarge(file.size)) {
      Alert.alert(
        'File too big',
        `Maximum file size is ${IMAGE_CONSTRAINTS.MAX_FILE_SIZE_MB} MB.`
      );
      setState('idle');
      return;
    }

    setState('uploading');
    try {
      const form = new FormData();
      await appendFileToForm(
        form,
        file.uri,
        file.name || `receipt_${Date.now()}.pdf`,
        file.mimeType || 'application/pdf'
      );
      form.append('source', 'pdf');

      const rawResult: any = await receiptsApi.upload(form);
      console.log('[useUpload] pdf upload response:', JSON.stringify(rawResult));

      const { id, duplicate, existingId } = extractUploadPayload(rawResult);
      if (!id) {
        throw new Error('Server did not return a receipt ID after PDF upload.');
      }

      if (duplicate && existingId) {
        handleDuplicate(existingId);
        setState('done');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setState('done');
      router.replace(`/processing/${id}`);
    } catch (err: any) {
      console.error('[useUpload] pdf upload failed:', err);
      setState('error');
      setError(getErrorMessage(err));
    }
  }, [handleDuplicate, queryClient]);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

  return {
    state,
    error,
    pickFromCamera,
    pickFromGallery,
    pickPDF,
    reset,
    isUploading: state === 'uploading' || state === 'optimizing',
  };
}