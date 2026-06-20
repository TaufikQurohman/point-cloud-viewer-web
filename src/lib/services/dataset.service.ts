import path from 'path';
import { promises as fs } from 'fs';
import { config } from '@/lib/config';
import {
  ensureDir,
  ensureStorageDirs,
  pathExists,
  readJsonIfExists,
  removeDirIfExists,
  removeFileIfExists,
  writeJson,
  listSubdirectories
} from '@/lib/utils/fs';
import { generateUniqueDatasetId } from '@/lib/utils/slug';
import { DatasetLogger } from '@/lib/utils/logger';
import { isDirectFormat, requiresPdalConversion, validateUploadedFile } from '@/lib/utils/validation';
import { convertToLaz } from '@/lib/services/pdal.service';
import { convertToPotree } from '@/lib/services/potree.service';
import { AppError, type DatasetRecord, type SupportedFormat } from '@/lib/types';

/**
 * Dataset service.
 *
 * This is the orchestration layer that ties together validation, PDAL,
 * and PotreeConverter, and persists the result of each dataset as a JSON
 * "record" file on disk (storage/converted/{datasetId}/record.json).
 *
 * Because the project deliberately has no database, this record file
 * acts as the dataset's source of truth for status/listing/detail
 * endpoints. It is small, human-readable, and lives right next to the
 * Potree output it describes.
 */

const RECORD_FILE_NAME = 'record.json';

function recordPath(datasetId: string): string {
  return path.join(config.storage.converted, datasetId, RECORD_FILE_NAME);
}

async function datasetIdExists(candidateId: string): Promise<boolean> {
  return pathExists(path.join(config.storage.converted, candidateId));
}

async function saveRecord(record: DatasetRecord): Promise<void> {
  await writeJson(recordPath(record.datasetId), record);
}

/** Loads a dataset's record from disk. Returns null if it does not exist. */
export async function getDatasetRecord(datasetId: string): Promise<DatasetRecord | null> {
  return readJsonIfExists<DatasetRecord>(recordPath(datasetId));
}

/** Lists all known datasets by scanning storage/converted/. */
export async function listDatasets(): Promise<DatasetRecord[]> {
  const dirNames = await listSubdirectories(config.storage.converted);

  const records = await Promise.all(
    dirNames.map(async (dirName) => getDatasetRecord(dirName))
  );

  return records
    .filter((record): record is DatasetRecord => record !== null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Permanently deletes a dataset's converted output, normalized file, and uploaded source. */
export async function deleteDataset(datasetId: string): Promise<void> {
  const record = await getDatasetRecord(datasetId);
  if (!record) {
    throw new AppError(`Dataset "${datasetId}" not found`, 404, 'DATASET_NOT_FOUND');
  }

  await Promise.all([
    removeDirIfExists(path.join(config.storage.converted, datasetId)),
    removeFileIfExists(path.join(config.storage.normalized, `${datasetId}.laz`)),
    removeUploadsForDataset(datasetId)
  ]);
}

async function removeUploadsForDataset(datasetId: string): Promise<void> {
  if (!(await pathExists(config.storage.uploads))) return;
  const entries = await fs.readdir(config.storage.uploads);
  const matches = entries.filter((name) => name.startsWith(`${datasetId}.`));
  await Promise.all(
    matches.map((name) => removeFileIfExists(path.join(config.storage.uploads, name)))
  );
}

export interface ProcessUploadInput {
  /** Absolute path to the file already written to storage/uploads. */
  uploadedFilePath: string;
  originalFileName: string;
  fileSizeBytes: number;
}

export interface ProcessUploadResult {
  datasetId: string;
  status: DatasetRecord['status'];
  metadataUrl?: string;
}

/**
 * Full pipeline entry point, called by the upload API route after the raw
 * file has been streamed to disk. Runs validation, conversion (if needed),
 * and Potree processing synchronously, returning only once the dataset is
 * either "ready" or "failed".
 *
 * Keeping this synchronous (rather than fire-and-forget background jobs)
 * matches the MVP scope: no database/queue, no auth, simple demonstrable
 * behavior. The upload API response reflects the final pipeline outcome.
 */
export async function processUpload(input: ProcessUploadInput): Promise<ProcessUploadResult> {
  await ensureStorageDirs();

  const { uploadedFilePath, originalFileName, fileSizeBytes } = input;

  // 1. Validate format and size up front.
  const inputFormat: SupportedFormat = validateUploadedFile(originalFileName, fileSizeBytes);

  // 2. Generate a unique, filesystem-safe dataset ID from the filename.
  const datasetId = await generateUniqueDatasetId(originalFileName, datasetIdExists);

  const logger = new DatasetLogger(datasetId);
  await logger.info('upload', 'Upload received', {
    originalFileName,
    fileSizeBytes,
    inputFormat,
    datasetId
  });

  // Initialize the record as early as possible so a crash mid-pipeline
  // still leaves a "failed" (not silently missing) dataset.
  const now = new Date().toISOString();
  let record: DatasetRecord = {
    datasetId,
    originalFileName,
    inputFormat,
    status: 'validating',
    createdAt: now,
    updatedAt: now,
    fileSizeBytes,
    logFile: logger.relativeLogPath
  };

  // Ensure the converted/{datasetId} dir exists so we can persist the
  // record even before PotreeConverter creates it.
  await ensureDir(path.join(config.storage.converted, datasetId));
  await saveRecord(record);

  try {
    let laszFilePath: string;

    if (isDirectFormat(inputFormat)) {
      // Case A: LAS/LAZ go straight to PotreeConverter.
      await logger.info('validation', 'Direct format detected, skipping PDAL', {
        inputFormat
      });
      laszFilePath = uploadedFilePath;
    } else if (requiresPdalConversion(inputFormat)) {
      // Case B: normalize via PDAL first.
      record = { ...record, status: 'converting', updatedAt: new Date().toISOString() };
      await saveRecord(record);

      const pdalResult = await convertToLaz({
        inputFilePath: uploadedFilePath,
        datasetId,
        logger
      });
      laszFilePath = pdalResult.outputFilePath;
    } else {
      // Should be unreachable given validateUploadedFile, but kept for
      // exhaustiveness and defense in depth.
      throw new AppError(`Unsupported file format: ${inputFormat}`, 400, 'UNSUPPORTED_FORMAT');
    }

    // 3. Run PotreeConverter.
    record = { ...record, status: 'processing', updatedAt: new Date().toISOString() };
    await saveRecord(record);

    const potreeResult = await convertToPotree({
      inputFilePath: laszFilePath,
      datasetId,
      logger
    });

    const metadataUrl = `/api/v1/storage/converted/${datasetId}/metadata.json`;

    record = {
      ...record,
      status: 'ready',
      updatedAt: new Date().toISOString(),
      metadataUrl
    };
    await saveRecord(record);

    await logger.info('system', 'Dataset pipeline completed successfully', {
      datasetId,
      metadataUrl
    });

    void potreeResult; // metadataPath already implied by metadataUrl

    return { datasetId, status: 'ready', metadataUrl };
  } catch (err) {
    const message = err instanceof AppError ? err.message : 'Unexpected processing error';

    record = {
      ...record,
      status: 'failed',
      updatedAt: new Date().toISOString(),
      error: message
    };
    await saveRecord(record);

    await logger.error('system', 'Dataset pipeline failed', {
      error: message,
      stack: err instanceof Error ? err.stack : undefined
    });

    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(message, 500, 'PIPELINE_FAILED');
  }
}
