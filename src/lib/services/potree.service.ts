import path from 'path';
import { config } from '@/lib/config';
import { runProcess } from '@/lib/services/process-runner';
import { ensureDir, pathExists, removeDirIfExists } from '@/lib/utils/fs';
import { AppError, type ProcessResult } from '@/lib/types';
import type { DatasetLogger } from '@/lib/utils/logger';

/**
 * PotreeConverter service.
 *
 * Wraps the PotreeConverter CLI to transform a LAS/LAZ file into a Potree
 * octree dataset (metadata.json, octree.bin, hierarchy.bin) consumable by
 * Potree Viewer in the browser. This is the only place in the codebase
 * that knows PotreeConverter's CLI flags.
 *
 * PotreeConverter 2.x CLI shape:
 *   PotreeConverter <input.las/laz> -o <outputDir>
 */

export interface PotreeConversionInput {
  /** Absolute path to the input LAS/LAZ file. */
  inputFilePath: string;
  /** Dataset ID; determines the output directory name. */
  datasetId: string;
  logger: DatasetLogger;
}

export interface PotreeConversionResult {
  /** Absolute path to the dataset's output directory. */
  outputDir: string;
  /** Absolute path to the generated metadata.json. */
  metadataPath: string;
  processResult: ProcessResult;
}

const EXPECTED_OUTPUT_FILES = ['metadata.json'] as const;

export async function convertToPotree(
  input: PotreeConversionInput
): Promise<PotreeConversionResult> {
  const { inputFilePath, datasetId, logger } = input;

  const outputDir = path.join(config.storage.converted, datasetId);

  // PotreeConverter expects to create its own output directory; remove any
  // stale partial output from a previous failed attempt before retrying.
  await removeDirIfExists(outputDir);
  await ensureDir(config.storage.converted);

  const args = [inputFilePath, '-o', outputDir];

  await logger.info('potree', 'Starting PotreeConverter', {
    command: config.potreeConverterBin,
    args,
    inputFilePath,
    outputDir
  });

  const processResult = await runProcess({
    command: config.potreeConverterBin,
    args,
    timeoutMs: config.processTimeoutMs,
    onStdout: (chunk) => {
      logger.debug('potree', 'stdout', { chunk });
    },
    onStderr: (chunk) => {
      logger.debug('potree', 'stderr', { chunk });
    }
  });

  await logger.info('potree', 'PotreeConverter process finished', {
    success: processResult.success,
    exitCode: processResult.exitCode,
    durationMs: processResult.durationMs
  });

  if (!processResult.success) {
    await logger.error('potree', 'PotreeConverter conversion failed', {
      stderr: processResult.stderr.slice(-4000),
      exitCode: processResult.exitCode
    });
    throw new AppError(
      'Potree conversion failed. See dataset log for details.',
      500,
      'POTREE_CONVERSION_FAILED'
    );
  }

  const metadataPath = path.join(outputDir, 'metadata.json');

  for (const expectedFile of EXPECTED_OUTPUT_FILES) {
    const filePath = path.join(outputDir, expectedFile);
    if (!(await pathExists(filePath))) {
      await logger.error('potree', `Expected output file missing: ${expectedFile}`, {
        outputDir
      });
      throw new AppError(
        'metadata.json not found after Potree conversion.',
        500,
        'METADATA_NOT_FOUND'
      );
    }
  }

  return { outputDir, metadataPath, processResult };
}

/** Health check used by setup diagnostics. */
export async function checkPotreeConverterAvailable(): Promise<{
  available: boolean;
  error?: string;
}> {
  const result = await runProcess({
    command: config.potreeConverterBin,
    args: ['--help'],
    timeoutMs: 10_000
  });

  // Some PotreeConverter builds exit non-zero on --help; treat "it started
  // and produced output" as available.
  const available = result.exitCode !== null;

  if (!available) {
    return {
      available: false,
      error: result.stderr || 'PotreeConverter executable not found or not runnable.'
    };
  }

  return { available: true };
}
