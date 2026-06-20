import { promises as fs } from 'fs';
import path from 'path';
import { config } from '@/lib/config';

/**
 * Filesystem helpers shared by services and API routes.
 * All storage interaction (other than direct stream writes during upload)
 * goes through this module to keep path handling and error semantics
 * consistent.
 */

/** Ensures a directory exists, creating it (and parents) if necessary. */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/** Ensures all base storage directories exist. Safe to call repeatedly. */
export async function ensureStorageDirs(): Promise<void> {
  await Promise.all([
    ensureDir(config.storage.uploads),
    ensureDir(config.storage.normalized),
    ensureDir(config.storage.converted),
    ensureDir(config.storage.temp),
    ensureDir(config.storage.logs)
  ]);
}

/** Returns true if a path exists (file or directory). */
export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

/** Recursively removes a directory if it exists. No-op otherwise. */
export async function removeDirIfExists(dirPath: string): Promise<void> {
  if (await pathExists(dirPath)) {
    await fs.rm(dirPath, { recursive: true, force: true });
  }
}

/** Removes a single file if it exists. No-op otherwise. */
export async function removeFileIfExists(filePath: string): Promise<void> {
  if (await pathExists(filePath)) {
    await fs.unlink(filePath);
  }
}

/**
 * Resolves a path that is supposed to live inside `baseDir` and throws if
 * the resolved path would escape it. This guards every place we build a
 * filesystem path from a user-supplied dataset ID or filename, preventing
 * path traversal (e.g. dataset_id = "../../etc").
 */
export function safeJoin(baseDir: string, ...segments: string[]): string {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, ...segments);

  if (
    resolvedTarget !== resolvedBase &&
    !resolvedTarget.startsWith(resolvedBase + path.sep)
  ) {
    throw new Error(`Path traversal detected: "${segments.join('/')}" escapes "${baseDir}"`);
  }

  return resolvedTarget;
}

/** Reads and parses a JSON file. Returns null if the file does not exist. */
export async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  if (!(await pathExists(filePath))) {
    return null;
  }
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/** Writes a value as pretty-printed JSON, creating parent directories. */
export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

/** Lists immediate subdirectory names of a directory. Returns [] if missing. */
export async function listSubdirectories(dirPath: string): Promise<string[]> {
  if (!(await pathExists(dirPath))) {
    return [];
  }
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

/** Returns the lowercase extension of a filename, without the leading dot. */
export function getExtension(fileName: string): string {
  const ext = path.extname(fileName);
  return ext.startsWith('.') ? ext.slice(1).toLowerCase() : ext.toLowerCase();
}
