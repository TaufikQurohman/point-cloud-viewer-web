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
    const confirmed = window.confirm(`Delete dataset "${datasetId}"? This permanently removes its files.`);
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
    <div className="w-[min(1180px,calc(100%-48px))] mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[0.78rem] font-extrabold uppercase tracking-[0.13em] text-neutral-600 mb-2.5">
            Dataset Library
          </p>
          <h1 className="text-[2.2rem] leading-[1.05] tracking-[-0.045em] text-neutral-800">
            Your converted datasets.
          </h1>
        </div>
        <Link
          href="/upload"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-400 px-[18px] py-3 font-bold text-white shadow-[0_10px_28px_rgba(0,113,227,0.24)] hover:bg-accent-500 transition-colors"
        >
          + New upload
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-md2 bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-mono">
          {error}
        </div>
      )}

      {datasets === null && !error && <div className="text-neutral-600">Loading datasets…</div>}

      {datasets !== null && datasets.length === 0 && (
        <div className="rounded-xl2 border border-black/[0.09] bg-white shadow-soft px-6 py-16 text-center">
          <h3 className="text-[1.4rem] text-neutral-800 mb-1">No datasets yet</h3>
          <p className="text-neutral-600 mb-5">Upload a point cloud file to get started.</p>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center rounded-full bg-accent-400 px-[18px] py-3 font-bold text-white hover:bg-accent-500 transition-colors"
          >
            Upload a dataset
          </Link>
        </div>
      )}

      {datasets !== null && datasets.length > 0 && (
        <div className="overflow-hidden rounded-xl2 border border-black/[0.09] bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/[0.09] bg-neutral-50 text-left text-[0.78rem] font-extrabold text-neutral-600 uppercase tracking-wide">
                <th className="px-6 py-4">Dataset</th>
                <th className="px-6 py-4">Uploaded</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((dataset) => (
                <tr key={dataset.dataset_id} className="border-b border-black/[0.06] last:border-b-0 hover:bg-neutral-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-neutral-800">{dataset.dataset_id}</div>
                    <div className="text-neutral-600 text-xs mt-0.5 truncate max-w-[220px]">
                      {dataset.original_file_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-neutral-600 whitespace-nowrap">{formatDate(dataset.created_at)}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={dataset.status} />
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <Link
                      href={`/viewer/${dataset.dataset_id}`}
                      className={[
                        'inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-bold mr-2 transition-colors',
                        dataset.status === 'ready'
                          ? 'bg-neutral-800 text-white hover:bg-black'
                          : 'bg-neutral-200 text-neutral-500 cursor-not-allowed pointer-events-none'
                      ].join(' ')}
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(dataset.dataset_id)}
                      disabled={deletingId === dataset.dataset_id}
                      className="inline-flex items-center justify-center rounded-full border border-black/[0.09] px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
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
