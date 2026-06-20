/**
 * Core domain types shared across the API routes, services, and frontend.
 * Keeping these centralized prevents drift between backend processing
 * logic and the shapes the frontend expects.
 */

/** Lifecycle status of a dataset as it moves through the pipeline. */
export type DatasetStatus =
  | 'uploaded'
  | 'validating'
  | 'converting' // PDAL normalization step
  | 'processing' // PotreeConverter step
  | 'ready'
  | 'failed';

/** File formats accepted directly by PotreeConverter without PDAL. */
export const DIRECT_FORMATS = ['las', 'laz'] as const;
export type DirectFormat = (typeof DIRECT_FORMATS)[number];

/** File formats that must first be normalized to LAZ via PDAL. */
export const PDAL_FORMATS = ['e57', 'ply', 'pts', 'xyz'] as const;
export type PdalFormat = (typeof PDAL_FORMATS)[number];

/** All formats currently accepted by the upload endpoint. */
export const SUPPORTED_FORMATS = [...DIRECT_FORMATS, ...PDAL_FORMATS] as const;
export type SupportedFormat = (typeof SUPPORTED_FORMATS)[number];

/** Persisted record describing a single dataset on disk. */
export interface DatasetRecord {
  /** Filesystem-safe, unique identifier and directory name. */
  datasetId: string;
  /** Original filename as uploaded by the user. */
  originalFileName: string;
  /** Detected/declared input format (lowercase extension, no dot). */
  inputFormat: SupportedFormat;
  /** Current pipeline status. */
  status: DatasetStatus;
  /** ISO-8601 timestamp of upload. */
  createdAt: string;
  /** ISO-8601 timestamp of last status update. */
  updatedAt: string;
  /** Size of the original uploaded file, in bytes. */
  fileSizeBytes: number;
  /** Populated once the dataset reaches "ready". */
  metadataUrl?: string;
  /** Populated if status is "failed". */
  error?: string;
  /** Relative path (under storage/logs) to this dataset's log file. */
  logFile: string;
}

/** Response body for POST /api/v1/upload */
export interface UploadResponse {
  success: boolean;
  dataset_id?: string;
  status?: DatasetStatus;
  metadata_url?: string;
  error?: string;
}

/** Response body for GET /api/v1/datasets */
export interface DatasetListItem {
  dataset_id: string;
  status: DatasetStatus;
  original_file_name: string;
  created_at: string;
  updated_at: string;
}

/** Response body for GET /api/v1/datasets/[id] */
export interface DatasetDetailResponse {
  success: boolean;
  dataset_id?: string;
  status?: DatasetStatus;
  metadata_url?: string;
  original_file_name?: string;
  created_at?: string;
  updated_at?: string;
  error?: string;
}

/** Response body for DELETE /api/v1/datasets/[id] */
export interface DeleteResponse {
  success: boolean;
  error?: string;
}

/** Result of running a child process (PDAL or PotreeConverter). */
export interface ProcessResult {
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
}

/** Structured log entry written to storage/logs/{datasetId}.log */
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  stage: 'upload' | 'validation' | 'pdal' | 'potree' | 'cleanup' | 'system';
  message: string;
  meta?: Record<string, unknown>;
}

/** Custom error type carrying an HTTP status and machine-readable code. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
