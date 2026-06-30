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
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
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
          'flex flex-col items-center justify-center min-h-[260px] rounded-lg2 border-[1.5px] border-dashed px-8 py-8 text-center cursor-pointer transition-all',
          disabled
            ? 'opacity-50 cursor-not-allowed border-black/[0.16] bg-neutral-100'
            : isDragOver
              ? 'border-accent-400 bg-accent-50 -translate-y-px'
              : 'border-black/[0.16] bg-neutral-50 hover:border-accent-400 hover:bg-[#f4f9ff]'
        ].join(' ')}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="mb-3.5 grid h-[58px] w-[58px] place-items-center rounded-md2 bg-neutral-800 text-2xl text-white">
          ⌁
        </div>

        {selectedFile ? (
          <>
            <h3 className="text-[1.4rem] leading-tight tracking-[-0.02em] text-neutral-800 mb-1">
              {selectedFile.name}
            </h3>
            <p className="text-neutral-600 mb-3.5">{formatBytes(selectedFile.size)}</p>
          </>
        ) : (
          <>
            <h3 className="text-[1.4rem] leading-tight tracking-[-0.02em] text-neutral-800 mb-1">
              Drop file here
            </h3>
            <p className="text-neutral-600 mb-3.5">or click to choose a file from your computer</p>
          </>
        )}

        <div className="flex flex-wrap justify-center gap-1">
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <span
              key={ext}
              className="inline-flex m-1 rounded-full bg-neutral-200 px-2.5 py-1.5 text-[0.82rem] font-bold text-neutral-700"
            >
              .{ext}
            </span>
          ))}
        </div>
      </div>

      {selectedFile && !isValidExtension && (
        <p className="mt-2 text-sm text-red-600">
          &ldquo;.{getExtension(selectedFile.name)}&rdquo; is not a supported format.
        </p>
      )}
    </div>
  );
}
