import type { DatasetStatus } from '@/lib/types';

const STATUS_STYLES: Record<
  DatasetStatus,
  { label: string; dot: string; text: string; bg: string; pulse?: boolean }
> = {
  uploaded: {
    label: 'Uploaded',
    dot: 'bg-ink-300',
    text: 'text-ink-200',
    bg: 'bg-white/[0.04] border border-white/[0.08]'
  },
  validating: {
    label: 'Validating',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    bg: 'bg-amber-400/10 border border-amber-400/20',
    pulse: true
  },
  converting: {
    label: 'Converting · PDAL',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    bg: 'bg-amber-400/10 border border-amber-400/20',
    pulse: true
  },
  processing: {
    label: 'Processing · Potree',
    dot: 'bg-signal-400',
    text: 'text-signal-300',
    bg: 'bg-signal-400/10 border border-signal-400/20',
    pulse: true
  },
  ready: {
    label: 'Ready',
    dot: 'bg-elev-400',
    text: 'text-elev-400',
    bg: 'bg-elev-400/10 border border-elev-400/20'
  },
  failed: {
    label: 'Failed',
    dot: 'bg-red-400',
    text: 'text-red-300',
    bg: 'bg-red-400/10 border border-red-400/20'
  }
};

export function StatusBadge({ status }: { status: DatasetStatus }): JSX.Element {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium uppercase tracking-wide',
        style.bg,
        style.text
      ].join(' ')}
    >
      <span className="relative flex h-1.5 w-1.5">
        {style.pulse && (
          <span className={`absolute inset-0 rounded-full ${style.dot} opacity-60 animate-ping`} />
        )}
        <span className={`relative h-1.5 w-1.5 rounded-full ${style.dot}`} />
      </span>
      {style.label}
    </span>
  );
}
