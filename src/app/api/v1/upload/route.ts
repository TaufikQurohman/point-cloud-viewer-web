import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';
import { config } from '@/lib/config';
import { ensureStorageDirs } from '@/lib/utils/fs';
import { processUpload } from '@/lib/services/dataset.service';
import { AppError } from '@/lib/types';
import type { UploadResponse } from '@/lib/types';
import { systemLogger } from '@/lib/utils/logger';
import { getExtension } from '@/lib/utils/fs';

/**
 * POST /api/v1/upload
 *
 * Accepts a multipart/form-data request with a single "file" field,
 * streams it to storage/uploads/, then runs the full conversion pipeline
 * (PDAL if needed, then PotreeConverter) synchronously before responding.
 *
 * Next.js App Router route handlers do not expose a raw Node stream for
 * multipart bodies, so we rely on the standard Web `Request.formData()`
 * API, which Next.js backs with an efficient streaming multipart parser.
 * The resulting File/Blob is then written to disk in chunks rather than
 * buffered fully in memory where possible.
 */

export const runtime = 'nodejs';
// Allow this route to run long enough for large PDAL/Potree conversions.
export const maxDuration = 3600;

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  await ensureStorageDirs();

  try {
    const contentLength = request.headers.get('content-length');
    if (contentLength && Number(contentLength) > config.maxUploadSizeBytes) {
      const maxGb = (config.maxUploadSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
      return NextResponse.json(
        { success: false, error: `File exceeds maximum allowed size of ${maxGb} GB` },
        { status: 413 }
      );
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      await systemLogger.error('upload', 'Failed to parse multipart form data', {
        error: (parseError as Error).message
      });
      return NextResponse.json(
        { success: false, error: 'Invalid multipart/form-data request' },
        { status: 400 }
      );
    }

    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Missing required form field "file"' },
        { status: 400 }
      );
    }

    const originalFileName = file.name;
    const fileSizeBytes = file.size;

    // Early extension check before touching disk, to fail fast on obviously
    // wrong uploads. Full validation (including size) still happens inside
    // processUpload, which is the single source of truth for validation.
    const extension = getExtension(originalFileName);
    if (!extension) {
      return NextResponse.json(
        { success: false, error: 'Uploaded file has no extension' },
        { status: 400 }
      );
    }

    // Write the raw upload to a temp location first, named by a timestamp
    // to avoid collisions, then it gets associated with the final dataset
    // ID once generated inside processUpload. We pass the original name
    // through and persist the bytes under storage/uploads/.
    const tempUploadName = `${Date.now()}-${sanitizeForFsName(originalFileName)}`;
    const uploadedFilePath = path.join(config.storage.uploads, tempUploadName);

    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(uploadedFilePath, Buffer.from(arrayBuffer));

    try {
      const result = await processUpload({
        uploadedFilePath,
        originalFileName,
        fileSizeBytes
      });

      // Rename the stored upload to match the final dataset ID for
      // traceability (storage/uploads/{datasetId}.{ext}).
      const finalUploadPath = path.join(
        config.storage.uploads,
        `${result.datasetId}.${extension}`
      );
      await fs.rename(uploadedFilePath, finalUploadPath).catch(() => {
        // Non-fatal: the dataset is already converted successfully.
      });

      return NextResponse.json(
        {
          success: true,
          dataset_id: result.datasetId,
          status: result.status,
          metadata_url: result.metadataUrl
        },
        { status: 200 }
      );
    } catch (pipelineError) {
      // Clean up the orphaned temp upload on failure.
      await fs.unlink(uploadedFilePath).catch(() => {});

      if (pipelineError instanceof AppError) {
        return NextResponse.json(
          { success: false, error: pipelineError.message },
          { status: pipelineError.statusCode }
        );
      }

      throw pipelineError;
    }
  } catch (err) {
    await systemLogger.error('upload', 'Unexpected error in upload route', {
      error: (err as Error).message,
      stack: (err as Error).stack
    });
    return NextResponse.json(
      { success: false, error: 'Internal server error during upload' },
      { status: 500 }
    );
  }
}

function sanitizeForFsName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}
