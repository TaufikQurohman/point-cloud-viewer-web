import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { config } from '@/lib/config';
import { pathExists, safeJoin } from '@/lib/utils/fs';

/**
 * GET /api/v1/storage/converted/[...path]
 *
 * Serves files from storage/converted/ over HTTP so the browser-side
 * Potree Viewer can fetch metadata.json, octree.bin, hierarchy.bin, and
 * any chunked octree node files PotreeConverter produces.
 *
 * This project deliberately keeps point cloud data outside Next's
 * `public/` directory (to keep generated, potentially huge datasets
 * separate from the application bundle and source tree), so a small
 * route handler stands in for static file serving. `safeJoin` guards
 * against path traversal via the dynamic [...path] segment.
 */

export const runtime = 'nodejs';

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.bin': 'application/octet-stream',
  '.las': 'application/octet-stream',
  '.laz': 'application/octet-stream'
};

function resolveContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
): Promise<NextResponse> {
  try {
    const segments = params.path ?? [];

    if (segments.length === 0) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 });
    }

    let resolvedPath: string;
    try {
      resolvedPath = safeJoin(config.storage.converted, ...segments);
    } catch {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!(await pathExists(resolvedPath))) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = await fs.stat(resolvedPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    const fileBuffer = await fs.readFile(resolvedPath);
    const contentType = resolveContentType(resolvedPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'no-cache'
      }
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to read file: ${(err as Error).message}` },
      { status: 500 }
    );
  }
}
