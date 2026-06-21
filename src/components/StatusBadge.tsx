import type { DatasetStatus } from '@/lib/types';

const STATUS_STYLES: Record<
  DatasetStatus,
  { label: string; text: string; border: string; bg: string; pulse?: boolean }
> = {
  uploaded: {
    label: 'Uploaded',
    text: 'text-ink-500',
    border: 'border-ink-400',
    bg: 'bg-paper-50'
  },
  validating: {
    label: 'Validating',
    text: 'text-rust-500',
    border: 'border-rust-400',
    bg: 'bg-rust-50',
    pulse: true
  },
  converting: {
    label: 'Converting · PDAL',
    text: 'text-rust-500',
    border: 'border-rust-400',
    bg: 'bg-rust-50',
    pulse: true
  },
  processing: {
    label: 'Processing · Potree',
    text: 'text-survey-600',
    border: 'border-survey-500',
    bg: 'bg-survey-50',
    pulse: true
  },
  ready: {
    label: 'Ready',
    text: 'text-survey-700',
    border: 'border-survey-600',
    bg: 'bg-survey-100'
  },
  failed: {
    label: 'Failed',
    text: 'text-rust-600',
    border: 'border-rust-500',
    bg: 'bg-rust-100'
  }
};

export function StatusBadge({ status }: { status: DatasetStatus }): JSX.Element {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[11px] font-mono font-medium uppercase tracking-wide',
        style.border,
        style.bg,
        style.text
      ].join(' ')}
    >
      {style.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
      {style.label}
    </span>
  );
}
