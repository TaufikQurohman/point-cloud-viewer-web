import { AppError, DIRECT_FORMATS, PDAL_FORMATS, SUPPORTED_FORMATS } from '@/lib/types';
import type { SupportedFormat } from '@/lib/types';
import { getExtension } from '@/lib/utils/fs';
import { config } from '@/lib/config';

/**
 * Validates an uploaded file's name and size, returning its normalized
 * format. Throws AppError with a clear, user-facing message on failure.
 */
export function validateUploadedFile(fileName: string, fileSizeBytes: number): SupportedFormat {
  if (!fileName || fileName.trim().length === 0) {
    throw new AppError('Uploaded file is missing a filename', 400, 'INVALID_FILENAME');
  }

  const extension = getExtension(fileName);

  if (!isSupportedFormat(extension)) {
    throw new AppError(
      `Unsupported file format: ".${extension || 'unknown'}". Supported formats: ${SUPPORTED_FORMATS.join(', ')}`,
      400,
      'UNSUPPORTED_FORMAT'
    );
  }

  if (fileSizeBytes <= 0) {
    throw new AppError('Uploaded file is empty', 400, 'EMPTY_FILE');
  }

  if (fileSizeBytes > config.maxUploadSizeBytes) {
    const maxGb = (config.maxUploadSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
    throw new AppError(
      `File exceeds maximum allowed size of ${maxGb} GB`,
      400,
      'FILE_TOO_LARGE'
    );
  }

  return extension as SupportedFormat;
}

export function isSupportedFormat(extension: string): extension is SupportedFormat {
  return (SUPPORTED_FORMATS as readonly string[]).includes(extension);
}

export function requiresPdalConversion(format: SupportedFormat): boolean {
  return (PDAL_FORMATS as readonly string[]).includes(format);
}

export function isDirectFormat(format: SupportedFormat): boolean {
  return (DIRECT_FORMATS as readonly string[]).includes(format);
}
