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
    <div className="mx-auto max-w-2xl px-6 py-14">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-50 tracking-tight mb-2">
          Upload dataset
        </h1>
        <p className="text-ink-400 text-sm leading-relaxed">
          <span className="font-mono text-elev-400">.las / .laz</span> are sent straight
          to PotreeConverter.{' '}
          <span className="font-mono text-amber-400">.e57 / .ply / .pts / .xyz</span> are
          normalized by PDAL first.
        </p>
      </div>

      <FileDropZone
        onFileSelected={handleFileSelected}
        disabled={isBusy}
        selectedFile={selectedFile}
      />

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isBusy}
          className="inline-flex items-center justify-center rounded-md bg-signal-400 px-5 py-2.5 text-sm font-semibold text-ink-950 hover:bg-signal-300 disabled:bg-white/[0.06] disabled:text-ink-500 disabled:cursor-not-allowed transition-colors"
        >
          {isBusy ? 'Processing…' : 'Upload & convert'}
        </button>

        {(selectedFile || pageState !== 'idle') && !isBusy && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-ink-200 hover:bg-white/[0.06] transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {pageState !== 'idle' && (
        <div className="mt-8 rounded-xl border border-white/[0.08] bg-ink-900/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.015]">
            <span className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
              Pipeline
            </span>
            <PageStateIndicator state={pageState} />
          </div>

          <div className="px-5 py-4 space-y-3">
            <PipelineStep
              label="Uploading file"
              detail="multipart/form-data → storage/uploads/"
              active={pageState === 'uploading'}
              done={pageState === 'processing' || pageState === 'completed'}
              failed={false}
            />
            <PipelineStep
              label="Validating & converting"
              detail="PDAL (if needed) → PotreeConverter → storage/converted/"
              active={pageState === 'processing'}
              done={pageState === 'completed'}
              failed={pageState === 'failed'}
            />
          </div>

          {pageState === 'completed' && result && (
            <div className="px-5 py-4 border-t border-white/[0.06] bg-elev-400/[0.04]">
              <p className="text-sm text-ink-200 mb-3">
                Dataset{' '}
                <span className="font-mono font-medium text-elev-400">{result.datasetId}</span>{' '}
                is ready.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/viewer/${result.datasetId}`)}
                className="inline-flex items-center gap-1.5 rounded-md bg-ink-50 px-4 py-2 text-sm font-medium text-ink-950 hover:bg-white transition-colors"
              >
                Open in viewer
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          )}

          {pageState === 'failed' && errorMessage && (
            <div className="px-5 py-4 border-t border-white/[0.06] bg-red-400/[0.04]">
              <p className="text-sm text-red-300 font-mono leading-relaxed">{errorMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PageStateIndicator({ state }: { state: PageState }): JSX.Element {
  const map: Record<PageState, { label: string; color: string }> = {
    idle: { label: 'idle', color: 'text-ink-400' },
    uploading: { label: 'uploading', color: 'text-amber-400' },
    processing: { label: 'processing', color: 'text-signal-300' },
    completed: { label: 'ready', color: 'text-elev-400' },
    failed: { label: 'failed', color: 'text-red-400' }
  };
  const item = map[state];
  return (
    <span className={`font-mono text-[11px] font-medium uppercase tracking-wide ${item.color}`}>
      {item.label}
    </span>
  );
}

function PipelineStep({
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
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-mono',
          failed
            ? 'bg-red-400/15 text-red-300'
            : done
              ? 'bg-elev-400/15 text-elev-400'
              : active
                ? 'bg-signal-400/15 text-signal-300'
                : 'bg-white/[0.04] text-ink-500'
        ].join(' ')}
      >
        {done ? '✓' : failed ? '!' : active ? (
          <span className="h-1.5 w-1.5 rounded-full bg-signal-300 animate-pulse" />
        ) : (
          '·'
        )}
      </span>
      <div>
        <p className={done || active || failed ? 'text-sm text-ink-100' : 'text-sm text-ink-500'}>
          {label}
        </p>
        <p className="text-[11px] font-mono text-ink-500 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
