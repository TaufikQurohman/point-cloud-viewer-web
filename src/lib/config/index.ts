import path from 'path';

/**
 * Centralized application configuration.
 * All environment variable reads happen here so the rest of the codebase
 * never touches `process.env` directly. This makes defaults explicit and
 * keeps configuration testable.
 */

function readString(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function readNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const projectRoot = process.cwd();

const storageRootRaw = readString('STORAGE_ROOT', './storage');
const storageRoot = path.isAbsolute(storageRootRaw)
  ? storageRootRaw
  : path.join(projectRoot, storageRootRaw);

export const config = {
  /** Absolute path to the storage root directory. */
  storageRoot,
  storage: {
    uploads: path.join(storageRoot, 'uploads'),
    normalized: path.join(storageRoot, 'normalized'),
    converted: path.join(storageRoot, 'converted'),
    temp: path.join(storageRoot, 'temp'),
    logs: path.join(storageRoot, 'logs')
  },
  /** Path/command used to invoke PDAL. Defaults to "pdal" (must be on PATH). */
  pdalBin: readString('PDAL_BIN', 'pdal'),
  /** Path/command used to invoke PotreeConverter. */
  potreeConverterBin: readString('POTREE_CONVERTER_BIN', 'PotreeConverter'),
  /** Maximum accepted upload size, in bytes. Default 2 GB. */
  maxUploadSizeBytes: readNumber('MAX_UPLOAD_SIZE_BYTES', 2 * 1024 * 1024 * 1024),
  /** Maximum lifetime of a single child process, in milliseconds. */
  processTimeoutMs: readNumber('PROCESS_TIMEOUT_MS', 30 * 60 * 1000),
  /** Minimum log level that gets written to disk and console. */
  logLevel: readString('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error'
} as const;

export type AppConfig = typeof config;
