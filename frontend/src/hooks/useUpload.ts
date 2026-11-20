import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { receiptsApi } from '../api/receipts';
import { optimizeImage, isFileTooLarge, isLowResolution, IMAGE_CONSTRAINTS } from '../lib/imageOptimizer';

type UploadState = 'idle' | 'picking' | 'optimizing' | 'uploading' | 'done' | 'error';

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

  const uploadImage = useCallback(async (uri: string, source: 'camera' | 'gallery') => {
    try {
      setState('optimizing');
      const optimized = await optimizeImage(uri);

      setState('uploading');
      const form = new FormData();
      form.append('file', {
        uri: optimized.uri,
        name: 'receipt.jpg',
        type: 'image/jpeg',
      } as any);
      form.append('source', source);

      const result = await receiptsApi.upload(form);

      if (result.data.duplicate && result.data.existing_id) {
        handleDuplicate(result.data.existing_id);
        setState('done');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setState('done');
      router.replace(`/processing/${result.data.id}`);
    } catch (err: any) {
      setState('error');
      setError(err.message || 'Upload failed');
    }
  }, [handleDuplicate, queryClient]);

  const pickFromCamera = useCallback(async () => {
    setState('picking');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera permission is required to scan receipts.');
      setState('idle');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (result.canceled) {
      setState('idle');
      return;
    }

    const asset = result.assets[0];
    if (asset.fileSize && isFileTooLarge(asset.fileSize)) {
      Alert.alert('File too big', `Maximum file size is ${IMAGE_CONSTRAINTS.MAX_FILE_SIZE_MB} MB.`);
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
    setState('picking');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });

    if (result.canceled) {
      setState('idle');
      return;
    }

    const asset = result.assets[0];
    if (asset.fileSize && isFileTooLarge(asset.fileSize)) {
      Alert.alert('File too big', `Maximum file size is ${IMAGE_CONSTRAINTS.MAX_FILE_SIZE_MB} MB.`);
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
    setState('picking');
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      setState('idle');
      return;
    }

    const file = result.assets[0];
    if (file.size && isFileTooLarge(file.size)) {
      Alert.alert('File too big', `Maximum file size is ${IMAGE_CONSTRAINTS.MAX_FILE_SIZE_MB} MB.`);
      setState('idle');
      return;
    }

    setState('uploading');
    try {
      const form = new FormData();
      form.append('file', {
        uri: file.uri,
        name: file.name || 'receipt.pdf',
        type: 'application/pdf',
      } as any);
      form.append('source', 'pdf');

      const uploadResult = await receiptsApi.upload(form);

      if (uploadResult.data.duplicate && uploadResult.data.existing_id) {
        handleDuplicate(uploadResult.data.existing_id);
        setState('done');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setState('done');
      router.replace(`/processing/${uploadResult.data.id}`);
    } catch (err: any) {
      setState('error');
      setError(err.message || 'Upload failed');
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
