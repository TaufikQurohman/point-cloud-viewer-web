import { promises as fs } from 'fs';
import path from 'path';
import { config } from '@/lib/config';
import { ensureDir } from '@/lib/utils/fs';
import type { LogEntry } from '@/lib/types';

/**
 * Structured logging service.
 *
 * Every dataset gets its own append-only log file under storage/logs/
 * named "{datasetId}.log", containing one JSON object per line (JSONL).
 * This keeps logs simple to tail, grep, or parse without a database,
 * in line with the project's filesystem-only constraint.
 *
 * A `system.log` file additionally captures process-wide events that are
 * not tied to a specific dataset (e.g. startup, generic API errors).
 */

const LEVEL_WEIGHT: Record<LogEntry['level'], number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function isLevelEnabled(level: LogEntry['level']): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[config.logLevel];
}

async function appendLogLine(filePath: string, entry: LogEntry): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const line = JSON.stringify(entry) + '\n';
  await fs.appendFile(filePath, line, 'utf-8');
}

function consoleMirror(entry: LogEntry): void {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.stage}]`;
  const line = `${prefix} ${entry.message}`;
  switch (entry.level) {
    case 'error':
      console.error(line, entry.meta ?? '');
      break;
    case 'warn':
      console.warn(line, entry.meta ?? '');
      break;
    default:
      console.log(line, entry.meta ?? '');
  }
}

export class DatasetLogger {
  private readonly logFilePath: string;
  public readonly relativeLogPath: string;

  constructor(datasetId: string) {
    this.relativeLogPath = `${datasetId}.log`;
    this.logFilePath = path.join(config.storage.logs, this.relativeLogPath);
  }

  private async write(
    level: LogEntry['level'],
    stage: LogEntry['stage'],
    message: string,
    meta?: Record<string, unknown>
  ): Promise<void> {
    if (!isLevelEnabled(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      stage,
      message,
      ...(meta ? { meta } : {})
    };

    consoleMirror(entry);
    try {
      await appendLogLine(this.logFilePath, entry);
    } catch (err) {
      // Logging must never crash the request pipeline.
      console.error('Failed to write dataset log file:', err);
    }
  }

  debug(stage: LogEntry['stage'], message: string, meta?: Record<string, unknown>) {
    return this.write('debug', stage, message, meta);
  }
  info(stage: LogEntry['stage'], message: string, meta?: Record<string, unknown>) {
    return this.write('info', stage, message, meta);
  }
  warn(stage: LogEntry['stage'], message: string, meta?: Record<string, unknown>) {
    return this.write('warn', stage, message, meta);
  }
  error(stage: LogEntry['stage'], message: string, meta?: Record<string, unknown>) {
    return this.write('error', stage, message, meta);
  }
}

/** System-wide logger for events not tied to a specific dataset. */
export const systemLogger = new DatasetLogger('system');
