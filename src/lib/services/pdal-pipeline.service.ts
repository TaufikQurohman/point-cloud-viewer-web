import path from 'path';
import { config } from '@/lib/config';
import { runProcess } from '@/lib/services/process-runner';
import { ensureDir, pathExists } from '@/lib/utils/fs';
import { AppError, type ProcessResult } from '@/lib/types';
import type { DatasetLogger } from '@/lib/utils/logger';

/**
 * PDAL pipeline service — outlier removal.
 *
 * This is a NEW service. It does NOT modify pdal.service.ts.
 *
 * Runs `pdal pipeline --stdin` with a JSON pipeline that includes a
 * Statistical Outlier Removal (SOR) stage before writing the output.
 * This ensures noisy points are stripped BEFORE the data enters
 * PotreeConverter, so the octree structure itself is clean.
 *
 * Pipeline stages:
 *   1. readers.las  — reads any LAS / LAZ / E57 (etc.) supported by PDAL
 *   2. filters.outlier (SOR) — removes statistical outliers
 *   3. writers.las  — writes compressed LAZ output
 *
 * SOR parameters (tuneable via constants below):
 *   mean_k      = number of nearest neighbours to consider (12 is conservative)
 *   multiplier  = standard deviation threshold (2.2 keeps more points than the
 *                 aggressive default of 3.0 but removes clear outliers)
 */

/** Statistical Outlier Removal tuning knobs. */
const SOR_MEAN_K = 12;
const SOR_MULTIPLIER = 2.2;

export interface PdalPipelineInput {
  /** Absolute path to the source file (any format PDAL supports). */
  inputFilePath: string;
  /** Dataset ID — used to name the output file. */
  datasetId: string;
  logger: DatasetLogger;
}

export interface PdalPipelineResult {
  /** Absolute path to the produced .laz file. */
  outputFilePath: string;
  processResult: ProcessResult;
}

/**
 * Runs a PDAL pipeline (via stdin JSON) that:
 *   1. Reads `inputFilePath`
 *   2. Applies Statistical Outlier Removal
 *   3. Writes a compressed LAZ file to storage/normalized/
 *
 * The output LAZ file is what gets passed to PotreeConverter.
 */
export async function convertToLazWithOutlierRemoval(
  input: PdalPipelineInput
): Promise<PdalPipelineResult> {
  const { inputFilePath, datasetId, logger } = input;

  await ensureDir(config.storage.normalized);
  const outputFilePath = path.join(config.storage.normalized, `${datasetId}.laz`);

  // Build the PDAL pipeline JSON.
  // readers.las is the generic reader that handles LAS, LAZ, and can fall
  // back for other formats — PDAL picks the right driver automatically based
  // on the file extension / magic bytes.
  const pipeline = [
    {
      type: 'readers.las',
      filename: inputFilePath
    },
    {
      type: 'filters.outlier',
      method: 'statistical',
      mean_k: SOR_MEAN_K,
      multiplier: SOR_MULTIPLIER
    },
    {
      type: 'writers.las',
      filename: outputFilePath,
      compression: true // write as LAZ
    }
  ];

  const pipelineJson = JSON.stringify({ pipeline });

  await logger.info('pdal', 'Starting PDAL pipeline (outlier removal)', {
    command: config.pdalBin,
    subcommand: 'pipeline --stdin',
    inputFilePath,
    outputFilePath,
    sorMeanK: SOR_MEAN_K,
    sorMultiplier: SOR_MULTIPLIER
  });

  const processResult = await runProcess({
    command: config.pdalBin,
    args: ['pipeline', '--stdin'],
    stdin: pipelineJson,
    timeoutMs: config.processTimeoutMs,
    onStdout: (chunk) => {
      logger.debug('pdal', 'pipeline stdout', { chunk });
    },
    onStderr: (chunk) => {
      logger.debug('pdal', 'pipeline stderr', { chunk });
    }
  });

  await logger.info('pdal', 'PDAL pipeline finished', {
    success: processResult.success,
    exitCode: processResult.exitCode,
    durationMs: processResult.durationMs
  });

  if (!processResult.success) {
    await logger.error('pdal', 'PDAL pipeline (outlier removal) failed', {
      stderr: processResult.stderr.slice(-4000),
      exitCode: processResult.exitCode
    });
    throw new AppError(
      'PDAL pipeline (outlier removal) failed. See dataset log for details.',
      500,
      'PDAL_PIPELINE_FAILED'
    );
  }

  if (!(await pathExists(outputFilePath))) {
    await logger.error('pdal', 'PDAL pipeline reported success but output file is missing', {
      outputFilePath
    });
    throw new AppError(
      'PDAL pipeline completed but produced no output file.',
      500,
      'PDAL_OUTPUT_MISSING'
    );
  }

  return { outputFilePath, processResult };
}
