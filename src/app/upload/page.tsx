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
      <div className="flex items-baseline justify-between border-b border-grid-400 pb-3 mb-8">
        <h1 className="font-display text-2xl font-semibold text-ink-700">Upload Dataset</h1>
        <span className="font-mono text-[10px] uppercase tracking-widest text-ink-400">Form PCV&#8209;UP</span>
      </div>

      <p className="text-ink-500 text-sm leading-relaxed mb-8">
        <span className="font-mono text-survey-600">.las / .laz</span> are sent straight
        to PotreeConverter. <span className="font-mono text-rust-500">.e57 / .ply / .pts / .xyz</span>{' '}
        are normalized by PDAL first.
      </p>

      <FileDropZone onFileSelected={handleFileSelected} disabled={isBusy} selectedFile={selectedFile} />

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleUpload}
          disabled={!selectedFile || isBusy}
          className="inline-flex items-center justify-center bg-ink-700 px-5 py-2.5 text-sm font-medium text-paper-100 hover:bg-ink-800 disabled:bg-paper-300 disabled:text-ink-400 disabled:cursor-not-allowed transition-colors"
        >
          {isBusy ? 'Processing…' : 'Upload & Convert'}
        </button>

        {(selectedFile || pageState !== 'idle') && !isBusy && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center border border-ink-400 px-4 py-2.5 text-sm font-medium text-ink-600 hover:border-ink-700 hover:text-ink-700 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {pageState !== 'idle' && (
        <div className="mt-8 border border-grid-400 bg-paper-50">
          <div className="flex items-center justify-between px-5 py-3 border-b border-grid-300">
            <span className="font-mono text-[11px] uppercase tracking-widest text-ink-400">
              Checklist
            </span>
            <StateTag state={pageState} />
          </div>

          <div className="px-5 py-4 space-y-3">
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

          {pageState === 'completed' && result && (
            <div className="px-5 py-4 border-t border-grid-300 bg-survey-50">
              <p className="text-sm text-ink-600 mb-3">
                Dataset <span className="font-mono font-medium text-survey-700">{result.datasetId}</span> is ready.
              </p>
              <button
                type="button"
                onClick={() => router.push(`/viewer/${result.datasetId}`)}
                className="inline-flex items-center gap-1.5 border border-ink-700 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-700 hover:text-paper-100 transition-colors"
              >
                Open in viewer
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0-4 4m4-4H3" />
                </svg>
              </button>
            </div>
          )}

          {pageState === 'failed' && errorMessage && (
            <div className="px-5 py-4 border-t border-grid-300 bg-rust-50">
              <p className="text-sm text-rust-600 font-mono leading-relaxed">{errorMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StateTag({ state }: { state: PageState }): JSX.Element {
  const map: Record<PageState, { label: string; color: string }> = {
    idle: { label: 'idle', color: 'text-ink-400' },
    uploading: { label: 'uploading', color: 'text-rust-500' },
    processing: { label: 'processing', color: 'text-survey-600' },
    completed: { label: 'ready', color: 'text-survey-700' },
    failed: { label: 'failed', color: 'text-rust-600' }
  };
  const item = map[state];
  return <span className={`font-mono text-[11px] font-medium uppercase tracking-wide ${item.color}`}>{item.label}</span>;
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
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border text-[10px] font-mono',
          failed
            ? 'border-rust-500 bg-rust-100 text-rust-600'
            : done
              ? 'border-survey-600 bg-survey-100 text-survey-700'
              : active
                ? 'border-rust-400 bg-rust-50 text-rust-500'
                : 'border-grid-400 bg-paper-100 text-ink-400'
        ].join(' ')}
      >
        {done ? '✓' : failed ? '!' : active ? '…' : ''}
      </span>
      <div>
        <p className={done || active || failed ? 'text-sm text-ink-700' : 'text-sm text-ink-400'}>{label}</p>
        <p className="text-[11px] font-mono text-ink-400 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
