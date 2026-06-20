import { NextResponse } from 'next/server';
import { listDatasets } from '@/lib/services/dataset.service';
import { systemLogger } from '@/lib/utils/logger';
import type { DatasetListItem } from '@/lib/types';

/**
 * GET /api/v1/datasets
 *
 * Lists all datasets known to the system by scanning storage/converted/.
 * Per the PRD, this returns a simple array (no pagination required for
 * the MVP), enriched slightly beyond the PRD's minimal example so the
 * frontend's Dataset List Page can show upload date and filename.
 */

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse<DatasetListItem[] | { error: string }>> {
  try {
    const records = await listDatasets();

    const items: DatasetListItem[] = records.map((record) => ({
      dataset_id: record.datasetId,
      status: record.status,
      original_file_name: record.originalFileName,
      created_at: record.createdAt,
      updated_at: record.updatedAt
    }));

    return NextResponse.json(items, { status: 200 });
  } catch (err) {
    await systemLogger.error('system', 'Failed to list datasets', {
      error: (err as Error).message
    });
    return NextResponse.json({ error: 'Failed to list datasets' }, { status: 500 });
  }
}
