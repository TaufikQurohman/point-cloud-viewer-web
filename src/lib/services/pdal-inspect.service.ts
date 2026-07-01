import { config } from '@/lib/config';
import { runProcess } from '@/lib/services/process-runner';
import type { PointCloudCapabilities } from '@/lib/types';
import type { DatasetLogger } from '@/lib/utils/logger';

/**
 * PDAL metadata inspection service.
 *
 * Runs `pdal info --metadata <file>` to detect which data dimensions
 * (RGB, Intensity, Classification) are present in the point cloud.
 * This is a NEW service — it does not modify pdal.service.ts.
 *
 * The result is used to automatically select the best initial color
 * mode in the Potree viewer, rather than requiring users to set it
 * manually after discovering that their data has no RGB, for example.
 */

/** Raw shape of a single dimension entry from `pdal info --metadata`. */
interface PdalDimensionEntry {
  name?: string;
  minimum?: number;
  maximum?: number;
  count?: number;
}

/** Partial shape of the JSON emitted by `pdal info --metadata`. */
interface PdalInfoOutput {
  metadata?: {
    // Depending on the PDAL version / reader, point count lives here
    count?: number;
    point_count?: number;
    num_points?: number;
    // Dimensions array — present in many PDAL readers
    dimensions?: PdalDimensionEntry[] | string[];
    // Some readers emit a flat "schema" key with an array of dicts
    schema?: { dimensions?: PdalDimensionEntry[] };
  };
  // PDAL ≥ 2.x wraps everything under a "metadata" key; older builds
  // may also have a top-level "stats" block we don't need here.
  stats?: unknown;
}

export interface InspectResult {
  capabilities: PointCloudCapabilities;
  /** Total number of points, or undefined if PDAL did not report it. */
  pointCount: number | undefined;
}

/**
 * Runs `pdal info --metadata <filePath>` and parses the JSON output to
 * determine which color dimensions are available in the point cloud.
 *
 * If the inspection command fails (e.g. unsupported format for the
 * metadata reader), this function returns a safe all-false capabilities
 * object instead of throwing, so the pipeline still completes.
 */
export async function inspectPointCloudMetadata(
  filePath: string,
  logger: DatasetLogger
): Promise<InspectResult> {
  const fallback: InspectResult = {
    capabilities: { hasRGB: false, hasIntensity: false, hasClassification: false },
    pointCount: undefined
  };

  await logger.info('pdal', 'Starting PDAL metadata inspection', { filePath });

  let result;
  try {
    result = await runProcess({
      command: config.pdalBin,
      args: ['info', '--metadata', filePath],
      timeoutMs: 60_000 // inspection is typically fast; 1 min safety net
    });
  } catch (runErr) {
    await logger.warn('pdal', 'pdal info process threw; skipping capabilities detection', {
      error: (runErr as Error).message
    });
    return fallback;
  }

  if (!result.success || !result.stdout.trim()) {
    await logger.warn('pdal', 'pdal info returned non-zero or empty output; using fallback capabilities', {
      exitCode: result.exitCode,
      stderr: result.stderr.slice(-2000)
    });
    return fallback;
  }

  let parsed: PdalInfoOutput;
  try {
    parsed = JSON.parse(result.stdout) as PdalInfoOutput;
  } catch (parseErr) {
    await logger.warn('pdal', 'Failed to parse pdal info JSON output; using fallback capabilities', {
      error: (parseErr as Error).message,
      stdout: result.stdout.slice(0, 500)
    });
    return fallback;
  }

  const meta = parsed.metadata;
  if (!meta) {
    await logger.warn('pdal', 'pdal info output has no "metadata" key; using fallback capabilities');
    return fallback;
  }

  // ── Point count ──────────────────────────────────────────────────────────
  // Different PDAL versions/readers report this under slightly different keys.
  const pointCount =
    typeof meta.count === 'number'
      ? meta.count
      : typeof meta.point_count === 'number'
      ? meta.point_count
      : typeof meta.num_points === 'number'
      ? meta.num_points
      : undefined;

  // ── Dimensions ───────────────────────────────────────────────────────────
  // PDAL can emit dimensions as either an array of objects or an array of
  // plain strings depending on the reader. We normalize both.
  const rawDims: (PdalDimensionEntry | string)[] =
    meta.dimensions ?? meta.schema?.dimensions ?? [];

  const dimEntries: PdalDimensionEntry[] = rawDims.map((d) =>
    typeof d === 'string' ? { name: d } : d
  );

  function hasDim(name: string): PdalDimensionEntry | undefined {
    return dimEntries.find(
      (d) => d.name?.toLowerCase() === name.toLowerCase()
    );
  }

  // ── RGB detection ─────────────────────────────────────────────────────────
  const rEntry = hasDim('Red');
  const gEntry = hasDim('Green');
  const bEntry = hasDim('Blue');
  const hasRGB = !!(rEntry && gEntry && bEntry);

  // ── Intensity detection ───────────────────────────────────────────────────
  // We consider Intensity "useful" only if its range is non-trivial (max > 0).
  // A file where all intensity values are 0 gives a flat grey result in the
  // viewer, which is worse than just falling back to elevation.
  const intensityEntry = hasDim('Intensity');
  const hasIntensity = !!(
    intensityEntry &&
    typeof intensityEntry.maximum === 'number' &&
    intensityEntry.maximum > 0
  );

  // ── Classification detection ──────────────────────────────────────────────
  // A Classification dimension with only one distinct value (e.g. everything
  // is class 1 "Unclassified") adds no visual value. We treat it as absent.
  const classEntry = hasDim('Classification');
  const classMin = classEntry?.minimum ?? 0;
  const classMax = classEntry?.maximum ?? 0;
  const hasClassification = !!(classEntry && classMax > classMin);

  const capabilities: PointCloudCapabilities = {
    hasRGB,
    hasIntensity,
    hasClassification
  };

  await logger.info('pdal', 'Metadata inspection complete', {
    pointCount,
    capabilities,
    dimensionsFound: dimEntries.map((d) => d.name).filter(Boolean)
  });

  return { capabilities, pointCount };
}
