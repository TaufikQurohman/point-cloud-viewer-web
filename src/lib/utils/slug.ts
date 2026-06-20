import path from 'path';

/**
 * Implements the dataset naming rules from the PRD:
 *   - derived from the uploaded filename (without extension)
 *   - lowercase
 *   - spaces replaced by hyphens
 *   - special characters removed
 *
 * Example: "Building Scan 01.e57" -> "building-scan-01"
 */
export function slugifyFileName(originalFileName: string): string {
  const baseName = path.basename(
    originalFileName,
    path.extname(originalFileName)
  );

  const slug = baseName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // spaces -> hyphen
    .replace(/[^a-z0-9-]/g, '') // remove special characters
    .replace(/-+/g, '-') // collapse repeated hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens

  return slug.length > 0 ? slug : 'dataset';
}

/**
 * Produces a unique dataset ID by appending a short suffix if the base slug
 * already exists on disk. `existsCheck` should return true if the candidate
 * ID is already taken.
 */
export async function generateUniqueDatasetId(
  originalFileName: string,
  existsCheck: (candidateId: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = slugifyFileName(originalFileName);

  let candidate = baseSlug;
  let attempt = 0;

  while (await existsCheck(candidate)) {
    attempt += 1;
    candidate = `${baseSlug}-${attempt}`;
  }

  return candidate;
}
