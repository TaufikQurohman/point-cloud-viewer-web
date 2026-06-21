import Link from 'next/link';

const FORMATS_DIRECT = ['las', 'laz'];
const FORMATS_PDAL = ['e57', 'ply', 'pts', 'xyz'];

export default function HomePage(): JSX.Element {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      {/* Field-sheet header strip, like the top of a survey record form. */}
      <div className="flex flex-wrap items-baseline justify-between gap-y-2 border-b border-grid-400 pb-3 mb-12 font-mono text-[11px] text-ink-500 uppercase tracking-wider">
        <span>Field Sheet No. PCV&#8209;001</span>
        <span>Datum: Local Filesystem</span>
        <span>Scale: 1 : 1</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-16 mb-20">
        <div>
          <h1 className="font-display text-[3.25rem] leading-[1.08] font-semibold text-ink-700 mb-6">
            Survey the cloud.
            <br />
            <span className="text-survey-600">Plot it in your browser.</span>
          </h1>

          <p className="text-[15px] text-ink-500 leading-relaxed mb-8 max-w-md">
            Upload a scan and the station handles the rest: PDAL normalizes
            the format, PotreeConverter builds the octree, and Potree
            Viewer renders the result — all stored as plain files, no
            database, nothing leaves your machine.
          </p>

          <div className="flex gap-3">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-ink-700 px-5 py-2.5 text-sm font-medium text-paper-100 hover:bg-ink-800 transition-colors"
            >
              Upload a dataset
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/datasets"
              className="inline-flex items-center justify-center border border-ink-400 px-5 py-2.5 text-sm font-medium text-ink-600 hover:border-ink-700 hover:text-ink-700 transition-colors"
            >
              View datasets
            </Link>
          </div>
        </div>

        {/* Format legend, styled like a map's key/legend box. */}
        <div className="border border-grid-400 bg-paper-50 p-5 self-start">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400 mb-4 pb-2 border-b border-grid-300">
            Legend — Accepted Formats
          </p>
          <div className="mb-4">
            <p className="text-[12px] text-ink-500 mb-2">Direct to PotreeConverter</p>
            <div className="flex gap-2">
              {FORMATS_DIRECT.map((fmt) => (
                <FormatChip key={fmt} fmt={fmt} variant="direct" />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] text-ink-500 mb-2">Normalized via PDAL first</p>
            <div className="flex flex-wrap gap-2">
              {FORMATS_PDAL.map((fmt) => (
                <FormatChip key={fmt} fmt={fmt} variant="pdal" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Signature element: the pipeline drawn as a survey cross-section /
          elevation profile, each stage a labeled station along a baseline,
          rather than a generic horizontal flow-chart. */}
      <ElevationProfile />
    </div>
  );
}

function FormatChip({ fmt, variant }: { fmt: string; variant: 'direct' | 'pdal' }): JSX.Element {
  return (
    <span
      className={[
        'font-mono text-[12px] font-medium px-2 py-0.5 border',
        variant === 'direct'
          ? 'border-survey-500 bg-survey-50 text-survey-700'
          : 'border-rust-400 bg-rust-50 text-rust-500'
      ].join(' ')}
    >
      .{fmt}
    </span>
  );
}

const STATIONS = [
  { code: 'BM-1', label: 'Upload', sub: 'multipart/form-data received', elevation: 20 },
  { code: 'BM-2', label: 'Validate', sub: 'format & size checked', elevation: 38 },
  { code: 'BM-3', label: 'PDAL', sub: 'E57 / PLY / PTS / XYZ → LAZ', elevation: 12 },
  { code: 'BM-4', label: 'PotreeConverter', sub: 'LAZ → octree', elevation: 55 },
  { code: 'BM-5', label: 'Viewer', sub: 'WebGL render, in browser', elevation: 30 }
];

function ElevationProfile(): JSX.Element {
  const width = 1040;
  const height = 220;
  const baseline = height - 40;
  const marginX = 120;
  const stepX = (width - marginX * 2) / (STATIONS.length - 1);

  const points = STATIONS.map((s, i) => ({
    ...s,
    x: marginX + i * stepX,
    y: baseline - s.elevation * 1.6
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <div className="border border-grid-400 bg-paper-50 px-2 pt-6 pb-2 overflow-x-auto">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-400 mb-1 px-4">
        Conversion Pipeline — Elevation Profile
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[720px]" style={{ height: 'auto' }}>
        {/* Baseline */}
        <line x1={20} y1={baseline} x2={width - 20} y2={baseline} stroke="#BBAF8E" strokeWidth={1} />

        {/* Profile path */}
        <path d={pathD} fill="none" stroke="#3D6B4F" strokeWidth={2} />

        {/* Traveling marker along the path */}
        <circle r={4} fill="#B5472B">
          <animateMotion dur="6s" repeatCount="indefinite" path={pathD} />
        </circle>

        {STATIONS.map((s, i) => {
          const p = points[i];
          if (!p) return null;
          return (
            <g key={s.code}>
              <line x1={p.x} y1={p.y} x2={p.x} y2={baseline} stroke="#D8CFB5" strokeWidth={1} strokeDasharray="2 3" />
              <circle cx={p.x} cy={p.y} r={4.5} fill="#FAF8F3" stroke="#3D6B4F" strokeWidth={1.5} />
              <text x={p.x} y={baseline + 18} textAnchor="middle" className="font-mono" fontSize={10} fill="#5C6B5F">
                {s.code}
              </text>
              <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize={13} fontWeight={600} fill="#1F2B24">
                {s.label}
              </text>
              <text x={p.x} y={p.y - 28} textAnchor="middle" fontSize={9} fill="#5C6B5F">
                {s.sub}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
