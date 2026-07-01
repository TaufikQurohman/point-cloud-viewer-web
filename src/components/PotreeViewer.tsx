'use client';

import { useEffect, useRef, useState } from 'react';
import { loadScriptsInOrder, loadStylesheet } from '@/lib/utils/script-loader';

/**
 * Loosely-typed shape of the global `Potree` object exposed by
 * /public/potree/build/potree/potree.js. Potree does not ship official
 * TypeScript types, so we declare only the surface this component uses.
 *
 * IMPORTANT API NOTE: point size and color are NOT controlled through
 * methods on the Viewer instance (there is no `viewer.setPointSize()` —
 * that method does not exist in Potree, confirmed against the official
 * examples and a GitHub issue asking for exactly that feature). They are
 * controlled through properties on `pointcloud.material`, the object
 * handed back in the `loadPointCloud` callback:
 *   material.size                -> point size in pixels
 *   material.pointSizeType       -> Potree.PointSizeType.FIXED / ADAPTIVE / ATTENUATED
 *   material.activeAttributeName -> 'rgba' / 'elevation' / 'intensity' / 'classification'
 *   material.shape               -> Potree.PointShape.SQUARE / CIRCLE
 *
 * NOTE ON REF FORWARDING: next/dynamic breaks React's forwardRef mechanism —
 * the ref passed to a dynamic()-wrapped component is never assigned, so
 * viewerRef.current stays null indefinitely. We solve this by using an
 * `onReady` callback prop instead: PotreeViewer calls `onReady(handle)` once
 * the point cloud finishes loading, handing the live handle object directly
 * to the parent without going through the broken ref channel.
 */
interface PotreePointCloudMaterial {
  size: number;
  pointSizeType: number;
  activeAttributeName: string;
  shape: number;
}

interface PotreePointCloud {
  position: { set: (x: number, y: number, z: number) => void };
  material: PotreePointCloudMaterial;
  pcoGeometry?: {
    pointAttributes?: {
      attributes?: Array<{ name: string }>;
    };
  };
}

interface PotreeViewerInstance {
  setEDLEnabled: (enabled: boolean) => void;
  setFOV: (fov: number) => void;
  setPointBudget: (budget: number) => void;
  setBackground?: (background: 'skybox' | 'gradient' | 'black' | 'white') => void;
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
  PointSizeType: { FIXED: number; ADAPTIVE: number; ATTENUATED: number };
  PointShape: { SQUARE: number; CIRCLE: number };
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
 * which previously caused "Potree library failed to initialize".
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

/** The color modes this UI exposes, mapped to Potree activeAttributeName strings. */
export type ColorMode = 'rgb' | 'height' | 'intensity' | 'classification';

/** The background modes this UI exposes, mapped to real viewer.setBackground() values. */
export type BackgroundMode = 'gradient' | 'black' | 'white';

/**
 * Live imperative controls over the Potree viewer, delivered to the parent
 * via the `onReady` callback prop once the point cloud finishes loading.
 * Using a callback instead of forwardRef avoids the next/dynamic ref
 * forwarding bug (the wrapped component's ref is never assigned).
 */
export interface PotreeViewerHandle {
  resetView: () => void;
  setEdlEnabled: (enabled: boolean) => void;
  setPointBudget: (budget: number) => void;
  setPointSize: (size: number) => void;
  setColorMode: (mode: ColorMode) => void;
  setBackground: (mode: BackgroundMode) => void;
}

interface PotreeViewerProps {
  metadataUrl: string;
  datasetName: string;
  onStateChange?: (state: ViewerLoadState, error?: string) => void;
  /** Called once with a live handle object as soon as the point cloud is ready. */
  onReady?: (handle: PotreeViewerHandle) => void;
}

export function PotreeViewer({ metadataUrl, datasetName, onStateChange, onReady }: PotreeViewerProps) {
  const renderAreaRef = useRef<HTMLDivElement>(null);
  const viewerInstanceRef = useRef<PotreeViewerInstance | null>(null);
  const potreeRef = useRef<PotreeGlobal | null>(null);
  // The loaded point cloud's `material` is where size/color/shape actually
  // live — kept in a ref so the handle methods can reach it without
  // re-triggering the load effect.
  const pointcloudRef = useRef<PotreePointCloud | null>(null);
  // Stable ref to onReady so the effect closure never captures a stale copy.
  const onReadyRef = useRef(onReady);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);

  const [state, setState] = useState<ViewerLoadState>('loading-library');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        viewer.setPointBudget(2_000_000);

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
          pointcloud.material.activeAttributeName = 'rgba';
          pointcloud.material.size = 1;

          viewer.scene.addPointCloud(pointcloud);
          viewer.fitToScreen();

          // Build the handle object and pass it directly to the parent.
          // This sidesteps the next/dynamic forwardRef bug entirely.
          const handle: PotreeViewerHandle = {
            resetView: () => {
              viewerInstanceRef.current?.fitToScreen();
            },
            setEdlEnabled: (enabled: boolean) => {
              viewerInstanceRef.current?.setEDLEnabled(enabled);
            },
            setPointBudget: (budget: number) => {
              viewerInstanceRef.current?.setPointBudget(budget);
            },
            setPointSize: (size: number) => {
              if (pointcloudRef.current) {
                pointcloudRef.current.material.size = size;
              }
            },
            setColorMode: (mode: ColorMode) => {
              const material = pointcloudRef.current?.material;
              if (!material) return;
              const map: Record<ColorMode, string> = {
                rgb: 'rgba',
                height: 'elevation',
                intensity: 'intensity',
                classification: 'classification'
              };
              material.activeAttributeName = map[mode];
            },
            setBackground: (mode: BackgroundMode) => {
              viewerInstanceRef.current?.setBackground?.(mode);
            }
          };

          onReadyRef.current?.(handle);
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

  return (
    <div className="potree-container">
      <div ref={renderAreaRef} id="potree_render_area" />

      {state !== 'ready' && state !== 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#15171c]/95 text-white text-sm pointer-events-none">
          <div className="text-center">
            <div className="h-[42px] w-[42px] mx-auto mb-3.5 rounded-full border-[3px] border-white/[0.16] border-t-white animate-spin" />
            <p className="text-white/80">
              {state === 'loading-library' ? 'Loading Potree Viewer…' : 'Loading point cloud data…'}
            </p>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#15171c] text-white text-sm px-8 text-center">
          <div className="max-w-md">
            <p className="font-semibold mb-2 text-white">Failed to load viewer</p>
            <p className="text-white/60 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
