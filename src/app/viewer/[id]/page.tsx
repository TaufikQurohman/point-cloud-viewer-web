'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { StatusBadge } from '@/components/StatusBadge';
import type { DatasetDetailResponse } from '@/lib/types';

// PotreeViewer touches `window` and the DOM directly (script injection,
// WebGL canvas), so it must never run during server-side rendering.
const PotreeViewer = dynamic(
  () => import('@/components/PotreeViewer').then((mod) => mod.PotreeViewer),
  { ssr: false }
);

export default function ViewerPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const datasetId = params.id;

  const [detail, setDetail] = useState<DatasetDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      try {
        const response = await fetch(`/api/v1/datasets/${datasetId}`, { cache: 'no-store' });
        const data: DatasetDetailResponse = await response.json();
        if (cancelled) return;

        if (!response.ok || !data.success) {
          setError(data.error ?? 'Dataset not found');
          return;
        }
        setDetail(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dataset');
        }
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-ink-900/80 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/datasets"
            className="flex items-center gap-1 text-sm text-ink-400 hover:text-ink-100 shrink-0 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Datasets
          </Link>
          <span className="text-white/10">/</span>
          <h1 className="font-mono text-sm font-medium text-ink-50 truncate">{datasetId}</h1>
        </div>
        {detail?.status && <StatusBadge status={detail.status} />}
      </div>

      <div className="relative flex-1 bg-[#0a0d14]">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-8">
            <div>
              <p className="text-ink-100 font-semibold mb-1">Unable to open viewer</p>
              <p className="text-ink-500 text-sm font-mono">{error}</p>
            </div>
          </div>
        )}

        {!error && detail && detail.status === 'ready' && detail.metadata_url && (
          <PotreeViewer metadataUrl={detail.metadata_url} datasetName={datasetId} />
        )}

        {!error && detail && detail.status !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-8">
            <div>
              <p className="text-ink-100 font-semibold mb-1">Dataset is not ready yet</p>
              <p className="text-ink-500 text-sm font-mono mb-4">
                status: {detail.status}
                {detail.error ? ` — ${detail.error}` : ''}
              </p>
              <Link
                href="/datasets"
                className="inline-flex items-center justify-center rounded-md bg-ink-50 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-white transition-colors"
              >
                Back to datasets
              </Link>
            </div>
          </div>
        )}

        {!error && !detail && (
          <div className="absolute inset-0 flex items-center justify-center text-ink-500 text-sm font-mono">
            loading dataset…
          </div>
        )}
      </div>
    </div>
  );
}
