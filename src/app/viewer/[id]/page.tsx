'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { StatusBadge } from '@/components/StatusBadge';
import type { DatasetDetailResponse, PointCloudCapabilities } from '@/lib/types';
import type { BackgroundMode, ColorMode, PotreeViewerHandle, ViewerLoadState } from '@/components/PotreeViewer';

// PotreeViewer touches `window` and the DOM directly (script injection,
// WebGL canvas), so it must never run during server-side rendering.
const PotreeViewer = dynamic(
  () => import('@/components/PotreeViewer').then((mod) => mod.PotreeViewer),
  { ssr: false }
);

const POINT_BUDGET_PRESETS = [500_000, 1_000_000, 2_000_000, 5_000_000] as const;

const COLOR_MODES: { value: ColorMode; label: string; hint: string }[] = [
  { value: 'rgb', label: 'RGB', hint: 'True color, if the scan includes color data' },
  { value: 'height', label: 'Height', hint: 'Gradient by elevation (low → high)' },
  { value: 'intensity', label: 'Intensity', hint: 'Grayscale by laser return strength' },
  { value: 'classification', label: 'Classification', hint: 'By point category, if classified' }
];

const BACKGROUND_MODES: { value: BackgroundMode; label: string }[] = [
  { value: 'gradient', label: 'Gradient' },
  { value: 'black', label: 'Black' },
  { value: 'white', label: 'White' }
];

export default function ViewerPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const datasetId = params.id;
  // Store the handle delivered by PotreeViewer's onReady callback.
  // Using a plain ref avoids the next/dynamic forwardRef bug where the
  // ref is never assigned to the dynamically-loaded component.
  const viewerHandleRef = useRef<PotreeViewerHandle | null>(null);

  const [detail, setDetail] = useState<DatasetDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewerState, setViewerState] = useState<ViewerLoadState>('loading-library');
  const [edlEnabled, setEdlEnabled] = useState(true);
  const [pointBudget, setPointBudget] = useState<number>(2_000_000);
  const [pointSize, setPointSizeState] = useState<number>(1.5);
  const [colorMode, setColorModeState] = useState<ColorMode>('height');
  const [background, setBackgroundState] = useState<BackgroundMode>('gradient');
  // Capabilities from Smart Pipeline — undefined for legacy datasets
  const [capabilities, setCapabilities] = useState<PointCloudCapabilities | undefined>(undefined);
  const [pointCount, setPointCount] = useState<number | undefined>(undefined);

  const handleViewerReady = useCallback((handle: PotreeViewerHandle) => {
    viewerHandleRef.current = handle;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      try {
        const response = await fetch(`/api/v1/datasets/${datasetId}`, { cache: 'no-store' });
        const data: DatasetDetailResponse = await response.json();
        if (cancelled) return;

        if (!response.ok || !data.success) {
          setError(data.error ?? 'Dataset not found');
          return;
        }
        setDetail(data);

        // ── Smart Pipeline: sync initial sidebar state from capabilities ──
        // This keeps the sidebar UI in sync with what the viewer will
        // auto-select, so controls reflect the actual initial state.
        if (data.capabilities) {
          setCapabilities(data.capabilities);
          // Mirror the same priority logic used in PotreeViewer.tsx
          if (data.capabilities.hasRGB) {
            setColorModeState('rgb');
          } else if (data.capabilities.hasIntensity) {
            setColorModeState('intensity');
          } else {
            setColorModeState('height'); // elevation fallback
          }
        } else {
          // Legacy dataset: no capabilities — default to height
          setColorModeState('height');
        }

        if (data.point_count !== undefined) {
          setPointCount(data.point_count);
          // Mirror point size auto-detect from PotreeViewer.tsx
          if (data.point_count < 100_000) {
            setPointSizeState(2.0);
          } else if (data.point_count > 1_000_000) {
            setPointSizeState(1.0);
          } else {
            setPointSizeState(1.5);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dataset');
        }
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  const handleResetView = useCallback(() => {
    viewerHandleRef.current?.resetView();
  }, []);

  const handleToggleEdl = useCallback(() => {
    setEdlEnabled((prev) => {
      const next = !prev;
      viewerHandleRef.current?.setEdlEnabled(next);
      return next;
    });
  }, []);

  const handlePointBudgetChange = useCallback((value: number) => {
    setPointBudget(value);
    viewerHandleRef.current?.setPointBudget(value);
  }, []);

  const handlePointSizeChange = useCallback((value: number) => {
    setPointSizeState(value);
    viewerHandleRef.current?.setPointSize(value);
  }, []);

  const handleColorModeChange = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    viewerHandleRef.current?.setColorMode(mode);
  }, []);

  const handleBackgroundChange = useCallback((mode: BackgroundMode) => {
    setBackgroundState(mode);
    viewerHandleRef.current?.setBackground(mode);
  }, []);

  const isReady = !error && detail?.status === 'ready' && viewerState === 'ready';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] h-screen">
      {/* Sidebar: every control here maps to a real Potree Viewer API call
          (material.size, material.pointColorType, viewer.setBackground,
          viewer.setPointBudget, viewer.setEDLEnabled) — no controls for
          things Potree can't actually do, like custom/arbitrary color
          layers or turning the cloud into a solid mesh. */}
      <aside className="bg-neutral-50 border-r border-black/[0.08] p-[18px] overflow-auto hidden lg:block">
        <Link href="/datasets" className="flex items-center gap-2.5 font-bold tracking-tight text-neutral-800 mb-4">
          <span
            className="h-[22px] w-[22px] rounded-[9px]"
            style={{ background: 'linear-gradient(145deg, #1d1d1f, #6e6e73)' }}
          />
          <span>CloudScope</span>
        </Link>

        <ControlCard label="Dataset">
          <p className="font-mono text-sm text-neutral-800 break-words">{datasetId}</p>
          {detail?.status && (
            <div className="mt-2.5">
              <StatusBadge status={detail.status} />
            </div>
          )}
        </ControlCard>

        <ControlCard label="Point density">
          <p className="text-[0.78rem] text-neutral-500 mb-1.5">Points rendered</p>
          <select
            value={pointBudget}
            onChange={(e) => handlePointBudgetChange(Number(e.target.value))}
            disabled={!isReady}
            className="w-full rounded-md2 border border-black/[0.09] bg-[#f8f8fa] px-3.5 py-3 text-neutral-800 outline-none disabled:opacity-50 mb-4"
          >
            {POINT_BUDGET_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {(preset / 1_000_000).toFixed(preset < 1_000_000 ? 1 : 0)}M points
              </option>
            ))}
          </select>

          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[0.78rem] text-neutral-500">Point size</p>
            <span className="text-[0.78rem] font-bold text-neutral-700">{pointSize.toFixed(1)}px</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.5}
            value={pointSize}
            onChange={(e) => handlePointSizeChange(Number(e.target.value))}
            disabled={!isReady}
            className="w-full accent-accent-400 disabled:opacity-50"
          />
          <p className="text-[0.72rem] text-neutral-500 mt-2 leading-relaxed">
            Larger, denser points can make surfaces look more solid from a
            distance — but a point cloud always stays made of points up
            close. Turning it into an actual solid surface needs a
            separate meshing step, not just a display setting.
          </p>
        </ControlCard>

        <ControlCard label="Color">
          <select
            value={colorMode}
            onChange={(e) => handleColorModeChange(e.target.value as ColorMode)}
            disabled={!isReady}
            className="w-full rounded-md2 border border-black/[0.09] bg-[#f8f8fa] px-3.5 py-3 text-neutral-800 outline-none disabled:opacity-50"
          >
            {COLOR_MODES.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
          <p className="text-[0.72rem] text-neutral-500 mt-2 leading-relaxed">
            {COLOR_MODES.find((m) => m.value === colorMode)?.hint}
          </p>
        </ControlCard>

        <ControlCard label="Background">
          <div className="flex gap-2">
            {BACKGROUND_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => handleBackgroundChange(mode.value)}
                disabled={!isReady}
                className={[
                  'flex-1 rounded-full px-3 py-2 text-xs font-bold transition-colors disabled:opacity-50',
                  background === mode.value
                    ? 'bg-accent-50 text-accent-500 border border-accent-100'
                    : 'bg-neutral-200 text-neutral-700'
                ].join(' ')}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </ControlCard>

        <ControlCard label="Display">
          <button
            type="button"
            onClick={handleToggleEdl}
            disabled={!isReady}
            className={[
              'w-full rounded-full px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50',
              edlEnabled ? 'bg-accent-50 text-accent-500 border border-accent-100' : 'bg-neutral-200 text-neutral-700'
            ].join(' ')}
          >
            Eye Dome Lighting: {edlEnabled ? 'On' : 'Off'}
          </button>
        </ControlCard>

        <ControlCard label="Camera">
          <button
            type="button"
            onClick={handleResetView}
            disabled={!isReady}
            className="w-full rounded-full bg-neutral-300 px-4 py-2.5 text-sm font-bold text-neutral-800 hover:bg-neutral-400 transition-colors disabled:opacity-50"
          >
            Fit to screen
          </button>
        </ControlCard>

        <ControlCard label="Info">
          <dl className="space-y-2 text-sm">
            <InfoRow label="Status" value={detail?.status ?? '—'} />
            <InfoRow label="File" value={detail?.original_file_name ?? '—'} />
            <InfoRow label="Metadata" value={detail?.metadata_url ?? '—'} />
          </dl>
        </ControlCard>
      </aside>

      {/* Main viewer surface */}
      <main className="relative bg-[#15171c] min-w-0">
        <header className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-4 rounded-[26px] border border-white/[0.08] bg-white/[0.06] backdrop-blur-xl px-5 py-3.5 lg:hidden">
          <Link href="/datasets" className="text-sm text-white/70 hover:text-white transition-colors">
            ← Datasets
          </Link>
          <h1 className="font-mono text-sm text-white truncate">{datasetId}</h1>
        </header>

        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-8">
            <div>
              <p className="text-white font-semibold mb-1">Unable to open viewer</p>
              <p className="text-white/60 text-sm font-mono">{error}</p>
            </div>
          </div>
        )}

        {!error && detail && detail.status === 'ready' && detail.metadata_url && (
          <PotreeViewer
            metadataUrl={detail.metadata_url}
            datasetName={datasetId}
            capabilities={capabilities}
            pointCount={pointCount}
            onStateChange={setViewerState}
            onReady={handleViewerReady}
          />
        )}

        {!error && detail && detail.status !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-8">
            <div>
              <p className="text-white font-semibold mb-1">Dataset is not ready yet</p>
              <p className="text-white/60 text-sm font-mono mb-4">
                status: {detail.status}
                {detail.error ? ` — ${detail.error}` : ''}
              </p>
              <Link
                href="/datasets"
                className="inline-flex items-center justify-center rounded-full bg-white px-[18px] py-2.5 text-sm font-bold text-neutral-800 hover:bg-neutral-100 transition-colors"
              >
                Back to datasets
              </Link>
            </div>
          </div>
        )}

        {!error && !detail && (
          <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
            Loading dataset…
          </div>
        )}
      </main>
    </div>
  );
}

function ControlCard({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="rounded-[24px] border border-black/[0.09] bg-white p-[18px] mb-3.5 shadow-[0_10px_28px_rgba(0,0,0,0.05)]">
      <p className="text-[0.78rem] font-extrabold uppercase tracking-[0.11em] text-neutral-500 mb-2.5">{label}</p>
      {children}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-2 border-t border-black/[0.06] pt-2.5 first:border-t-0 first:pt-0">
      <dt className="text-neutral-500 font-bold">{label}</dt>
      <dd className="text-neutral-800 break-words m-0">{value}</dd>
    </div>
  );
}
