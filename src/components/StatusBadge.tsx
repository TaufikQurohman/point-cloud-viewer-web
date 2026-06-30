import type { DatasetStatus } from '@/lib/types';

const STATUS_STYLES: Record<
  DatasetStatus,
  { label: string; text: string; bg: string; border: string; pulse?: boolean }
> = {
  uploaded: {
    label: 'Uploaded',
    text: 'text-neutral-600',
    bg: 'bg-neutral-200',
    border: 'border-black/[0.06]'
  },
  validating: {
    label: 'Validating',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    pulse: true
  },
  converting: {
    label: 'Converting · PDAL',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    pulse: true
  },
  processing: {
    label: 'Processing · Potree',
    text: 'text-accent-500',
    bg: 'bg-accent-50',
    border: 'border-accent-100',
    pulse: true
  },
  ready: {
    label: 'Ready',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200'
  },
  failed: {
    label: 'Failed',
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200'
  }
};

export function StatusBadge({ status }: { status: DatasetStatus }): JSX.Element {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.78rem] font-bold',
        style.bg,
        style.border,
        style.text
      ].join(' ')}
    >
      {style.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
      {style.label}
    </span>
  );
}
