'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import type { DatasetListItem } from '@/lib/types';

export default function DatasetsPage(): JSX.Element {
  const [datasets, setDatasets] = useState<DatasetListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadDatasets = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/v1/datasets', { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load datasets');
      const data: DatasetListItem[] = await response.json();
      setDatasets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load datasets');
    }
  }, []);

  useEffect(() => {
    void loadDatasets();
  }, [loadDatasets]);

  const handleDelete = useCallback(async (datasetId: string) => {
    const confirmed = window.confirm(
      `Delete dataset "${datasetId}"? This permanently removes its files.`
    );
    if (!confirmed) return;

    setDeletingId(datasetId);
    try {
      const response = await fetch(`/api/v1/datasets/${datasetId}`, { method: 'DELETE' });
      const data: { success: boolean; error?: string } = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Failed to delete dataset');
      setDatasets((prev) => prev?.filter((d) => d.dataset_id !== datasetId) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete dataset');
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50 tracking-tight mb-2">Datasets</h1>
          <p className="text-ink-400 text-sm">
            Scanned from{' '}
            <span className="font-mono text-ink-300">storage/converted/</span>
          </p>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center gap-1.5 rounded-md bg-signal-400 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-signal-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Upload
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300 font-mono">
          {error}
        </div>
      )}

      {datasets === null && !error && (
        <div className="text-sm text-ink-500 font-mono">loading datasets…</div>
      )}

      {datasets !== null && datasets.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.015] px-6 py-16 text-center">
          <p className="text-ink-100 font-medium mb-1">No datasets yet</p>
          <p className="text-sm text-ink-400 mb-6">
            Upload a point cloud file to start the pipeline.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-md bg-signal-400 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-signal-300 transition-colors"
          >
            Upload a dataset
          </Link>
        </div>
      )}

      {datasets !== null && datasets.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/[0.08]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-left text-[11px] font-mono font-medium text-ink-500 uppercase tracking-widest">
                <th className="px-5 py-3">Dataset</th>
                <th className="px-5 py-3">Uploaded</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((dataset) => (
                <tr
                  key={dataset.dataset_id}
                  className="border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="font-mono font-medium text-ink-50">{dataset.dataset_id}</div>
                    <div className="text-ink-500 text-xs mt-0.5 truncate max-w-[220px]">
                      {dataset.original_file_name}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-ink-400 font-mono text-[12px] whitespace-nowrap">
                    {formatDate(dataset.created_at)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={dataset.status} />
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <Link
                      href={`/viewer/${dataset.dataset_id}`}
                      className={[
                        'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium mr-2 transition-colors',
                        dataset.status === 'ready'
                          ? 'bg-ink-50 text-ink-950 hover:bg-white'
                          : 'bg-white/[0.04] text-ink-600 cursor-not-allowed pointer-events-none'
                      ].join(' ')}
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(dataset.dataset_id)}
                      disabled={deletingId === dataset.dataset_id}
                      className="inline-flex items-center justify-center rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-400/10 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === dataset.dataset_id ? 'Deleting…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return iso;
  }
}
