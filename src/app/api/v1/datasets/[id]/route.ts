import { NextRequest, NextResponse } from 'next/server';
import { deleteDataset, getDatasetRecord } from '@/lib/services/dataset.service';
import { AppError } from '@/lib/types';
import type { DatasetDetailResponse, DeleteResponse } from '@/lib/types';
import { systemLogger } from '@/lib/utils/logger';

/**
 * GET /api/v1/datasets/[id]
 * DELETE /api/v1/datasets/[id]
 *
 * Per-dataset detail and deletion, matching the PRD's API specification.
 * The dataset ID doubles as the directory name under storage/converted/,
 * so it is treated as an opaque, filesystem-safe identifier throughout.
 */

export const runtime = 'nodejs';

interface RouteParams {
  params: { id: string };
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<DatasetDetailResponse>> {
  const datasetId = params.id;

  try {
    const record = await getDatasetRecord(datasetId);

    if (!record) {
      return NextResponse.json(
        { success: false, error: `Dataset "${datasetId}" not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        dataset_id: record.datasetId,
        status: record.status,
        metadata_url: record.metadataUrl,
        original_file_name: record.originalFileName,
        created_at: record.createdAt,
        updated_at: record.updatedAt,
        ...(record.error ? { error: record.error } : {})
      },
      { status: 200 }
    );
  } catch (err) {
    await systemLogger.error('system', 'Failed to fetch dataset detail', {
      datasetId,
      error: (err as Error).message
    });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dataset detail' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<DeleteResponse>> {
  const datasetId = params.id;

  try {
    await deleteDataset(datasetId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: err.statusCode }
      );
    }

    await systemLogger.error('system', 'Failed to delete dataset', {
      datasetId,
      error: (err as Error).message
    });
    return NextResponse.json(
      { success: false, error: 'Failed to delete dataset' },
      { status: 500 }
    );
  }
}
