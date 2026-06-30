'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDropZone } from '@/components/FileDropZone';
import type { DatasetStatus, UploadResponse } from '@/lib/types';

type PageState = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed';

interface PipelineResult {
  datasetId: string;
  status: DatasetStatus;
}

export default function UploadPage(): JSX.Element {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pageState, setPageState] = useState<PageState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);

  const isBusy = pageState === 'uploading' || pageState === 'processing';

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setResult(null);
    setPageState('idle');
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    setResult(null);
    setPageState('uploading');

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setPageState('processing');

      const response = await fetch('/api/v1/upload', { method: 'POST', body: formData });
      const data: UploadResponse = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.error ?? 'Upload failed for an unknown reason.');
        setPageState('failed');
        return;
      }

      setResult({ datasetId: data.dataset_id ?? '', status: data.status ?? 'ready' });
      setPageState('completed');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Network error while uploading file.');
      setPageState('failed');
    }
  }, [selectedFile]);

  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setPageState('idle');
    setErrorMessage(null);
    setResult(null);
  }, []);

  return (
    <div className="w-[min(1180px,calc(100%-48px))] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 py-8">
      <article className="rounded-xl2 border border-black/[0.09] bg-white shadow-soft p-[30px]">
        <p className="text-[0.78rem] font-extrabold uppercase tracking-[0.13em] text-neutral-600 mb-2.5">
          Upload data
        </p>
        <h2 className="text-[2.2rem] leading-[1.05] tracking-[-0.045em] text-neutral-800 mb-3">
          Choose a point cloud file.
        </h2>
        <p className="text-neutral-600 mb-2">
          <code>.las</code> / <code>.laz</code> go straight to PotreeConverter.{' '}
          <code>.e57</code> / <code>.ply</code> / <code>.pts</code> / <code>.xyz</code> are
          normalized by PDAL first.
        </p>

        <div className="mt-6">
          <FileDropZone onFileSelected={handleFileSelected} disabled={isBusy} selectedFile={selectedFile} />
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isBusy}
            className="inline-flex items-center justify-center rounded-full bg-accent-400 px-[18px] py-3 font-bold text-white shadow-[0_10px_28px_rgba(0,113,227,0.24)] hover:bg-accent-500 disabled:bg-neutral-300 disabled:text-neutral-600 disabled:shadow-none disabled:cursor-not-allowed transition-colors"
          >
            {isBusy ? 'Processing…' : 'Upload & Convert'}
          </button>

          {(selectedFile || pageState !== 'idle') && !isBusy && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center rounded-full bg-neutral-300 px-[18px] py-3 font-bold text-neutral-800 hover:bg-neutral-400 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </article>

      <article className="rounded-xl2 border border-black/[0.09] bg-white shadow-soft p-[30px]">
        <p className="text-[0.78rem] font-extrabold uppercase tracking-[0.13em] text-neutral-600 mb-2.5">
          Pipeline status
        </p>
        <h2 className="text-[2.2rem] leading-[1.05] tracking-[-0.045em] text-neutral-800 mb-5">
          What happens next.
        </h2>

        {pageState === 'idle' && (
          <p className="text-neutral-600">
            Choose a file on the left, then click Upload &amp; Convert. Status for each
            pipeline stage will appear here.
          </p>
        )}

        {pageState !== 'idle' && (
          <div className="space-y-4">
            <ChecklistRow
              label="File received and stored"
              detail="storage/uploads/"
              active={pageState === 'uploading'}
              done={pageState === 'processing' || pageState === 'completed'}
              failed={false}
            />
            <ChecklistRow
              label="Validated and converted"
              detail="PDAL (if needed) → PotreeConverter → storage/converted/"
              active={pageState === 'processing'}
              done={pageState === 'completed'}
              failed={pageState === 'failed'}
            />
          </div>
        )}

        {pageState === 'completed' && result && (
          <div className="mt-6 rounded-md2 bg-emerald-50 border border-emerald-200 p-5">
            <p className="text-neutral-700 mb-3">
              Dataset <code className="bg-transparent text-emerald-700 font-bold">{result.datasetId}</code> is
              ready.
            </p>
            <button
              type="button"
              onClick={() => router.push(`/viewer/${result.datasetId}`)}
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-800 px-[18px] py-2.5 font-bold text-white hover:bg-black transition-colors"
            >
              Open in viewer
            </button>
          </div>
        )}

        {pageState === 'failed' && errorMessage && (
          <div className="mt-6 rounded-md2 bg-red-50 border border-red-200 p-5">
            <p className="text-red-700 font-mono text-sm leading-relaxed">{errorMessage}</p>
          </div>
        )}
      </article>
    </div>
  );
}

function ChecklistRow({
  label,
  detail,
  active,
  done,
  failed
}: {
  label: string;
  detail: string;
  active: boolean;
  done: boolean;
  failed: boolean;
}): JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <span
        className={[
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          failed
            ? 'bg-red-100 text-red-600'
            : done
              ? 'bg-emerald-100 text-emerald-700'
              : active
                ? 'bg-accent-100 text-accent-500'
                : 'bg-neutral-200 text-neutral-600'
        ].join(' ')}
      >
        {done ? '✓' : failed ? '!' : active ? '…' : ''}
      </span>
      <div>
        <p className={done || active || failed ? 'text-neutral-800' : 'text-neutral-600'}>{label}</p>
        <p className="text-sm text-neutral-600 font-mono mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
