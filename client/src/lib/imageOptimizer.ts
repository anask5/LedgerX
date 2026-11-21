import * as ImageManipulator from 'expo-image-manipulator';

const MAX_WIDTH = 2000;
const JPEG_QUALITY = 0.8;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Optimize an image for upload:
 * - Downscale longest side to at most 2000px while preserving aspect ratio
 * - Compress to JPEG quality 0.8
 * - Fall back to the original URI if manipulation fails on a device URI
 */
export async function optimizeImage(
  uri: string,
  width?: number,
  height?: number
): Promise<{ uri: string; width: number; height: number }> {
  try {
    const actions: ImageManipulator.Action[] = [];

    if (width && height) {
      if (width >= height && width > MAX_WIDTH) {
        actions.push({ resize: { width: MAX_WIDTH } });
      } else if (height > width && height > MAX_WIDTH) {
        actions.push({ resize: { height: MAX_WIDTH } });
      }
    } else {
      actions.push({ resize: { width: MAX_WIDTH } });
    }

    const result = await ImageManipulator.manipulateAsync(uri, actions, {
      compress: JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    return {
      uri: result.uri || uri,
      width: result.width || width || 0,
      height: result.height || height || 0,
    };
  } catch {
    return {
      uri,
      width: width || 0,
      height: height || 0,
    };
  }
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