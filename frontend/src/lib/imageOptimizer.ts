import * as ImageManipulator from 'expo-image-manipulator';

const MAX_WIDTH = 2000;
const JPEG_QUALITY = 0.8;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Optimize an image for upload:
 * - Resize longest side to 2000px
 * - Compress to JPEG quality 0.8
 */
export async function optimizeImage(uri: string): Promise<{ uri: string; width: number; height: number }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

/**
 * Check if a file exceeds the maximum allowed size.
 */
export function isFileTooLarge(fileSize: number): boolean {
  return fileSize > MAX_FILE_SIZE;
}

/**
 * Check if an image is low resolution (which may affect OCR extraction accuracy)
 */
export function isLowResolution(width?: number, height?: number): boolean {
  if (!width || !height) return false;
  return width < 600 || height < 600;
}

export const IMAGE_CONSTRAINTS = {
  MAX_WIDTH,
  JPEG_QUALITY,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB: MAX_FILE_SIZE / (1024 * 1024),
  MIN_RESOLUTION: 600,
};
