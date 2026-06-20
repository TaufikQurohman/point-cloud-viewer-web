import Link from 'next/link';

const FORMATS_DIRECT = ['las', 'laz'];
const FORMATS_PDAL = ['e57', 'ply', 'pts', 'xyz'];

export default function HomePage(): JSX.Element {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-signal-300/90 mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-elev-400" />
          local · no database · no auth
        </div>

        <h1 className="text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-ink-50 mb-5">
          Point clouds in,
          <br />
          <span className="text-signal-300">octrees out.</span>
        </h1>

        <p className="text-[15px] text-ink-300 leading-relaxed mb-9 max-w-lg">
          Upload a scan. PDAL normalizes the format, PotreeConverter builds
          the octree, and Potree Viewer streams it straight into your
          browser — everything stored on disk, nothing in a database.
        </p>

        <div className="flex gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-md bg-signal-400 px-5 py-2.5 text-sm font-semibold text-ink-950 hover:bg-signal-300 transition-colors"
          >
            Upload a dataset
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0-4 4m4-4H3" />
            </svg>
          </Link>
          <Link
            href="/datasets"
            className="inline-flex items-center justify-center rounded-md border border-white/10 bg-white/[0.02] px-5 py-2.5 text-sm font-medium text-ink-100 hover:bg-white/[0.06] hover:border-white/20 transition-colors"
          >
            View datasets
          </Link>
        </div>
      </div>

      {/* Signature element: the actual conversion pipeline, rendered as a
          live-feeling diagram rather than a generic numbered card grid. */}
      <PipelineDiagram />

      <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-[13px]">
        <span className="font-mono text-ink-500 uppercase tracking-widest text-[11px]">
          Supported formats
        </span>
        <div className="flex items-center gap-2">
          <span className="text-ink-400">direct →</span>
          {FORMATS_DIRECT.map((fmt) => (
            <FormatChip key={fmt} fmt={fmt} variant="direct" />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-ink-400">via PDAL →</span>
          {FORMATS_PDAL.map((fmt) => (
            <FormatChip key={fmt} fmt={fmt} variant="pdal" />
          ))}
        </div>
      </div>
    </div>
  );
}

function FormatChip({ fmt, variant }: { fmt: string; variant: 'direct' | 'pdal' }): JSX.Element {
  return (
    <span
      className={[
        'font-mono text-[12px] font-medium px-2 py-0.5 rounded border',
        variant === 'direct'
          ? 'border-elev-400/30 bg-elev-400/10 text-elev-400'
          : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
      ].join(' ')}
    >
      .{fmt}
    </span>
  );
}

/**
 * The page's signature: the literal data pipeline (upload -> validate ->
 * PDAL -> PotreeConverter -> storage -> viewer) rendered as a connected
 * diagram with a traveling pulse, instead of a generic 4-card "how it
 * works" grid. The stages are a real, ordered sequence — so the numbering
 * here actually encodes something true about the content.
 */
function PipelineDiagram(): JSX.Element {
  const stages = [
    { id: 'upload', label: 'Upload', sub: 'multipart/form-data' },
    { id: 'pdal', label: 'PDAL', sub: 'E57 / PLY / PTS / XYZ → LAZ' },
    { id: 'potree', label: 'PotreeConverter', sub: 'LAZ → octree' },
    { id: 'viewer', label: 'Potree Viewer', sub: 'WebGL, in-browser' }
  ];

  return (
    <div className="mt-20 rounded-xl border border-white/[0.08] bg-ink-900/60 px-6 py-8 sm:px-10 overflow-x-auto">
      <div className="flex items-center min-w-[640px]">
        {stages.map((stage, index) => (
          <div key={stage.id} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-start gap-2 shrink-0">
              <span className="font-mono text-[10px] text-ink-500 tracking-widest">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-sm font-semibold text-ink-50">{stage.label}</span>
              <span className="text-[11px] text-ink-400 font-mono whitespace-nowrap">
                {stage.sub}
              </span>
            </div>

            {index < stages.length - 1 && (
              <div className="relative flex-1 h-px mx-4 bg-white/10 min-w-[40px] overflow-hidden">
                <span
                  className="absolute top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-signal-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                  style={{
                    animation: `travel 2.4s ${index * 0.6}s linear infinite`
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
