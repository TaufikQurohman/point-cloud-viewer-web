'use client';

import { useCallback, useRef, useState } from 'react';

export const ACCEPTED_EXTENSIONS = ['las', 'laz', 'e57', 'ply', 'pts', 'xyz'] as const;

interface FileDropZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
  selectedFile: File | null;
}

function getExtension(fileName: string): string {
  const parts = fileName.split('.');
  return parts.length > 1 ? (parts.pop() ?? '').toLowerCase() : '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FileDropZone({
  onFileSelected,
  disabled = false,
  selectedFile
}: FileDropZoneProps): JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragOver(false);
      if (disabled) return;
      handleFiles(event.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const isValidExtension = selectedFile
    ? (ACCEPTED_EXTENSIONS as readonly string[]).includes(getExtension(selectedFile.name))
    : true;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={[
          'relative flex flex-col items-center justify-center rounded-xl border px-6 py-16 text-center cursor-pointer transition-all',
          disabled
            ? 'opacity-50 cursor-not-allowed border-white/[0.08] bg-white/[0.01]'
            : isDragOver
              ? 'border-signal-400/60 bg-signal-400/[0.06]'
              : 'border-white/[0.1] bg-white/[0.015] hover:border-signal-400/30 hover:bg-white/[0.03]'
        ].join(' ')}
        style={{
          borderStyle: 'dashed'
        }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div
          className={[
            'mb-4 flex h-12 w-12 items-center justify-center rounded-lg border transition-colors',
            isDragOver
              ? 'border-signal-400/40 bg-signal-400/10 text-signal-300'
              : 'border-white/10 bg-white/[0.03] text-ink-300'
          ].join(' ')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V4.5m0 0L7.5 9m4.5-4.5L16.5 9M4.5 16.5v2.25A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25V16.5" />
          </svg>
        </div>

        {selectedFile ? (
          <>
            <p className="font-mono text-sm text-ink-50">{selectedFile.name}</p>
            <p className="text-xs text-ink-400 mt-1.5 font-mono">
              {formatBytes(selectedFile.size)}
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-ink-100">Drop a point cloud file here</p>
            <p className="text-sm text-ink-400 mt-1">or click to browse</p>
          </>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <span
              key={ext}
              className="text-[10px] font-mono font-medium px-2 py-0.5 rounded border border-white/10 text-ink-400"
            >
              .{ext}
            </span>
          ))}
        </div>
      </div>

      {selectedFile && !isValidExtension && (
        <p className="mt-2 text-sm text-red-400">
          &ldquo;.{getExtension(selectedFile.name)}&rdquo; is not a supported format.
        </p>
      )}
    </div>
  );
}
