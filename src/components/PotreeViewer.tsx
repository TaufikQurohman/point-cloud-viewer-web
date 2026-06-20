'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadScriptsInOrder, loadStylesheet } from '@/lib/utils/script-loader';

/**
 * Loosely-typed shape of the global `Potree` object exposed by
 * /public/potree/build/potree/potree.js. Potree does not ship official
 * TypeScript types, so we declare only the surface this component uses.
 */
interface PotreePointCloud {
  position: { set: (x: number, y: number, z: number) => void };
  material: { size: number; pointSizeType: number };
}

interface PotreeViewerInstance {
  setEDLEnabled: (enabled: boolean) => void;
  setFOV: (fov: number) => void;
  setPointBudget: (budget: number) => void;
  getPointBudget?: () => number;
  loadGUI?: (callback?: () => void) => void;
  scene: {
    addPointCloud: (pointcloud: PotreePointCloud) => void;
    view: {
      position: { set: (x: number, y: number, z: number) => void };
      lookAt: (x: number, y: number, z: number) => void;
    };
  };
  fitToScreen: () => void;
}

interface PotreeGlobal {
  Viewer: new (element: HTMLElement) => PotreeViewerInstance;
  loadPointCloud: (
    url: string,
    name: string,
    callback: (event: { type: string; pointcloud?: PotreePointCloud }) => void
  ) => void;
  PointSizeType: { ADAPTIVE: number };
}

declare global {
  interface Window {
    Potree?: PotreeGlobal;
    THREE?: unknown;
    $?: unknown;
  }
}

/**
 * Library assets are vendored under /public/potree/ following the layout
 * of the official Potree build output. See README.md / setup docs for how
 * to populate this directory ("npm run build" inside the potree repo, or
 * downloading a release build).
 *
 * IMPORTANT: modern Potree builds (the "develop" branch / any build
 * produced by a recent `npm run build` in the potree repo) bundle THREE.js,
 * OrbitControls, and the COPC/EPT loaders directly inside potree.js as a
 * UMD bundle. Loading libs/three.js/build/three.js as a *separate* global
 * script — as older Potree example pages did — creates a second,
 * conflicting `THREE` global and breaks Potree's internal references,
 * which is what previously caused "Potree library failed to initialize".
 * Do NOT add three.js back to this list.
 */
const POTREE_BASE = '/potree';

const SCRIPT_SOURCES = [
  `${POTREE_BASE}/libs/jquery/jquery-3.1.1.min.js`,
  `${POTREE_BASE}/libs/spectrum/spectrum.js`,
  `${POTREE_BASE}/libs/jquery-ui/jquery-ui.min.js`,
  `${POTREE_BASE}/libs/other/BinaryHeap.js`,
  `${POTREE_BASE}/libs/tween/tween.min.js`,
  `${POTREE_BASE}/libs/d3/d3.js`,
  `${POTREE_BASE}/libs/proj4/proj4.js`,
  `${POTREE_BASE}/libs/openlayers3/ol.js`,
  `${POTREE_BASE}/libs/i18next/i18next.js`,
  `${POTREE_BASE}/libs/jstree/jstree.js`,
  `${POTREE_BASE}/build/potree/potree.js`
];

const STYLE_SOURCES = [
  `${POTREE_BASE}/libs/jquery-ui/jquery-ui.min.css`,
  `${POTREE_BASE}/libs/openlayers3/ol.css`,
  `${POTREE_BASE}/libs/spectrum/spectrum.css`,
  `${POTREE_BASE}/libs/jstree/themes/mixed/style.css`,
  `${POTREE_BASE}/build/potree/potree.css`
];

export type ViewerLoadState = 'loading-library' | 'loading-dataset' | 'ready' | 'error';

interface PotreeViewerProps {
  metadataUrl: string;
  datasetName: string;
  onStateChange?: (state: ViewerLoadState, error?: string) => void;
}

const POINT_BUDGET_PRESETS = [500_000, 1_000_000, 2_000_000, 5_000_000] as const;

export function PotreeViewer({
  metadataUrl,
  datasetName,
  onStateChange
}: PotreeViewerProps): JSX.Element {
  const renderAreaRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<PotreeViewerInstance | null>(null);
  const potreeRef = useRef<PotreeGlobal | null>(null);
  const pointcloudRef = useRef<PotreePointCloud | null>(null);

  const [state, setState] = useState<ViewerLoadState>('loading-library');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [edlEnabled, setEdlEnabled] = useState(true);
  const [pointBudget, setPointBudget] = useState<number>(2_000_000);

  useEffect(() => {
    let cancelled = false;

    function updateState(next: ViewerLoadState, error?: string) {
      if (cancelled) return;
      setState(next);
      if (error) setErrorMessage(error);
      onStateChange?.(next, error);
    }

    async function bootstrap() {
      if (!renderAreaRef.current) return;

      try {
        updateState('loading-library');

        try {
          await Promise.all(STYLE_SOURCES.map(loadStylesheet));
        } catch (styleErr) {
          throw new Error(
            (styleErr as Error).message +
              ' — a stylesheet failed to load. Check that public/potree/ contains the full Potree build (see public/potree/README.md).'
          );
        }

        try {
          await loadScriptsInOrder([...SCRIPT_SOURCES]);
        } catch (scriptErr) {
          throw new Error(
            (scriptErr as Error).message +
              ' — verify this exact file exists under public/potree/. See public/potree/README.md for the expected layout.'
          );
        }

        if (cancelled) return;

        const Potree = window.Potree;
        if (!Potree) {
          throw new Error(
            'potree.js loaded but did not register window.Potree. The build under public/potree/build/potree/potree.js may be corrupted or incomplete — try rebuilding it ("npm run build" in the potree repo) and re-copying build/ and libs/.'
          );
        }
        potreeRef.current = Potree;

        updateState('loading-dataset');

        const viewer = new Potree.Viewer(renderAreaRef.current);
        viewerInstanceRef.current = viewer;

        viewer.setEDLEnabled(true);
        viewer.setFOV(60);
        viewer.setPointBudget(pointBudget);

        Potree.loadPointCloud(metadataUrl, datasetName, (event) => {
          if (cancelled) return;

          if (event.type !== 'loaded' && event.type !== 'pointcloud_loaded') {
            return;
          }

          const pointcloud = event.pointcloud;
          if (!pointcloud) {
            updateState(
              'error',
              "Potree returned no point cloud data. The dataset's metadata.json may be missing or malformed."
            );
            return;
          }

          pointcloudRef.current = pointcloud;
          pointcloud.position.set(0, 0, 0);
          pointcloud.material.pointSizeType = Potree.PointSizeType.ADAPTIVE;

          viewer.scene.addPointCloud(pointcloud);
          // Automatically fit the camera to the loaded dataset, per the
          // viewer requirements.
          viewer.fitToScreen();

          updateState('ready');
        });
      } catch (err) {
        updateState('error', err instanceof Error ? err.message : 'Failed to load viewer');
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      viewerInstanceRef.current = null;
      potreeRef.current = null;
      pointcloudRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metadataUrl, datasetName]);

  const handleResetView = useCallback(() => {
    viewerInstanceRef.current?.fitToScreen();
  }, []);

  const handleToggleEdl = useCallback(() => {
    setEdlEnabled((prev) => {
      const next = !prev;
      viewerInstanceRef.current?.setEDLEnabled(next);
      return next;
    });
  }, []);

  const handlePointBudgetChange = useCallback((value: number) => {
    setPointBudget(value);
    viewerInstanceRef.current?.setPointBudget(value);
  }, []);

  const isReady = state === 'ready';

  return (
    <div className="potree-container">
      <div ref={renderAreaRef} id="potree_render_area" />

      {isReady && (
        <ViewerToolbar
          edlEnabled={edlEnabled}
          onToggleEdl={handleToggleEdl}
          pointBudget={pointBudget}
          onPointBudgetChange={handlePointBudgetChange}
          onResetView={handleResetView}
        />
      )}

      {state !== 'ready' && state !== 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0d14]/95 text-white text-sm pointer-events-none">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-12 w-12">
              <span className="absolute inset-0 rounded-full border-2 border-white/10" />
              <span className="absolute inset-0 rounded-full border-2 border-t-brand-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
            <span className="text-white/70 tracking-wide">
              {state === 'loading-library' ? 'Loading Potree Viewer…' : 'Loading point cloud data…'}
            </span>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0d14] text-white text-sm px-8 text-center">
          <div className="max-w-md">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <p className="font-semibold mb-2 text-white">Failed to load viewer</p>
            <p className="text-white/60 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface ViewerToolbarProps {
  edlEnabled: boolean;
  onToggleEdl: () => void;
  pointBudget: number;
  onPointBudgetChange: (value: number) => void;
  onResetView: () => void;
}

function ViewerToolbar({
  edlEnabled,
  onToggleEdl,
  pointBudget,
  onPointBudgetChange,
  onResetView
}: ViewerToolbarProps): JSX.Element {
  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-[#11151c]/80 backdrop-blur-md px-2 py-1.5 shadow-lg shadow-black/30">
      <ToolbarButton onClick={onResetView} label="Reset view">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      </ToolbarButton>

      <div className="h-5 w-px bg-white/10" />

      <ToolbarToggle active={edlEnabled} onClick={onToggleEdl} label="Eye Dome Lighting">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        </svg>
      </ToolbarToggle>

      <div className="h-5 w-px bg-white/10" />

      <div className="flex items-center gap-1.5 px-1">
        <span className="text-[11px] font-medium text-white/50 select-none">Points</span>
        <select
          value={pointBudget}
          onChange={(e) => onPointBudgetChange(Number(e.target.value))}
          className="bg-transparent text-[11px] font-medium text-white/90 focus:outline-none cursor-pointer [&>option]:bg-[#11151c] [&>option]:text-white"
        >
          {POINT_BUDGET_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {(preset / 1_000_000).toFixed(preset < 1_000_000 ? 1 : 0)}M
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  children
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
    >
      {children}
    </button>
  );
}

function ToolbarToggle({
  active,
  onClick,
  label,
  children
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={[
        'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
        active ? 'text-brand-300 bg-brand-500/15' : 'text-white/70 hover:text-white hover:bg-white/10'
      ].join(' ')}
    >
      {children}
    </button>
  );
}
