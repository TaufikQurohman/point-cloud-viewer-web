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
          'relative flex flex-col items-center justify-center px-6 py-16 text-center cursor-pointer transition-colors border-2',
          disabled
            ? 'opacity-50 cursor-not-allowed border-grid-300 bg-paper-200'
            : isDragOver
              ? 'border-survey-500 bg-survey-50'
              : 'border-ink-400 bg-paper-50 hover:border-ink-700'
        ].join(' ')}
        style={{ borderStyle: isDragOver ? 'solid' : 'dashed' }}
      >
        {/* Corner ticks, like crop marks on a printed survey sheet. */}
        <CornerTicks />

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
            'mb-4 flex h-12 w-12 items-center justify-center border-2 transition-colors',
            isDragOver ? 'border-survey-500 text-survey-600' : 'border-ink-500 text-ink-500'
          ].join(' ')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V4.5m0 0L7.5 9m4.5-4.5L16.5 9M4.5 16.5v2.25A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25V16.5" />
          </svg>
        </div>

        {selectedFile ? (
          <>
            <p className="font-mono text-sm text-ink-700">{selectedFile.name}</p>
            <p className="text-xs text-ink-400 mt-1.5 font-mono">{formatBytes(selectedFile.size)}</p>
          </>
        ) : (
          <>
            <p className="font-medium text-ink-600">Drop a point cloud file here</p>
            <p className="text-sm text-ink-400 mt-1">or click to browse</p>
          </>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-1.5">
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <span key={ext} className="text-[10px] font-mono font-medium px-2 py-0.5 border border-grid-400 text-ink-400">
              .{ext}
            </span>
          ))}
        </div>
      </div>

      {selectedFile && !isValidExtension && (
        <p className="mt-2 text-sm text-rust-500">
          &ldquo;.{getExtension(selectedFile.name)}&rdquo; is not a supported format.
        </p>
      )}
    </div>
  );
}

function CornerTicks(): JSX.Element {
  const tick = 'absolute h-3 w-3 border-ink-500';
  return (
    <>
      <span className={`${tick} top-2 left-2 border-l-2 border-t-2`} />
      <span className={`${tick} top-2 right-2 border-r-2 border-t-2`} />
      <span className={`${tick} bottom-2 left-2 border-l-2 border-b-2`} />
      <span className={`${tick} bottom-2 right-2 border-r-2 border-b-2`} />
    </>
  );
}
