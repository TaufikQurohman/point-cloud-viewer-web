import path from 'path';
import { config } from '@/lib/config';
import { runProcess } from '@/lib/services/process-runner';
import { ensureDir, pathExists } from '@/lib/utils/fs';
import { AppError, type ProcessResult } from '@/lib/types';
import type { DatasetLogger } from '@/lib/utils/logger';

/**
 * PDAL conversion service.
 *
 * Wraps the PDAL CLI ("pdal translate") to normalize any supported
 * non-LAS/LAZ format (E57, PLY, PTS, XYZ) into a LAZ file that
 * PotreeConverter can consume. This is the only place in the codebase
 * that knows how to invoke PDAL, so swapping PDAL versions or adding
 * format-specific flags only requires changes here.
 */

export interface PdalConversionInput {
  /** Absolute path to the source file (in storage/uploads). */
  inputFilePath: string;
  /** Dataset ID, used to name the output file and locate the output dir. */
  datasetId: string;
  logger: DatasetLogger;
}

export interface PdalConversionResult {
  /** Absolute path to the produced .laz file. */
  outputFilePath: string;
  processResult: ProcessResult;
}

/**
 * Runs `pdal translate <input> <output.laz>` to normalize the input file
 * into LAZ format inside storage/normalized/.
 */
export async function convertToLaz(
  input: PdalConversionInput
): Promise<PdalConversionResult> {
  const { inputFilePath, datasetId, logger } = input;

  await ensureDir(config.storage.normalized);
  const outputFilePath = path.join(config.storage.normalized, `${datasetId}.laz`);

  const args = ['translate', inputFilePath, outputFilePath];

  await logger.info('pdal', 'Starting PDAL conversion', {
    command: config.pdalBin,
    args,
    inputFilePath,
    outputFilePath
  });

  const processResult = await runProcess({
    command: config.pdalBin,
    args,
    timeoutMs: config.processTimeoutMs,
    onStdout: (chunk) => {
      logger.debug('pdal', 'stdout', { chunk });
    },
    onStderr: (chunk) => {
      logger.debug('pdal', 'stderr', { chunk });
    }
  });

  await logger.info('pdal', 'PDAL process finished', {
    success: processResult.success,
    exitCode: processResult.exitCode,
    durationMs: processResult.durationMs
  });

  if (!processResult.success) {
    await logger.error('pdal', 'PDAL conversion failed', {
      stderr: processResult.stderr.slice(-4000),
      exitCode: processResult.exitCode
    });
    throw new AppError(
      'PDAL conversion failed. See dataset log for details.',
      500,
      'PDAL_CONVERSION_FAILED'
    );
  }

  if (!(await pathExists(outputFilePath))) {
    await logger.error('pdal', 'PDAL reported success but output file is missing', {
      outputFilePath
    });
    throw new AppError(
      'PDAL conversion completed but produced no output file.',
      500,
      'PDAL_OUTPUT_MISSING'
    );
  }

  return { outputFilePath, processResult };
}

/**
 * Checks whether the configured PDAL binary is reachable and reports its
 * version. Used by an optional health-check and useful for setup
 * diagnostics on Windows where PATH issues are common.
 */
export async function checkPdalAvailable(): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> {
  const result = await runProcess({
    command: config.pdalBin,
    args: ['--version'],
    timeoutMs: 10_000
  });

  if (!result.success) {
    return {
      available: false,
      error: result.stderr || 'PDAL executable not found or not runnable.'
    };
  }

  return { available: true, version: result.stdout.trim() };
}
