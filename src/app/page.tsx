import Link from 'next/link';
import dynamic from 'next/dynamic';

// Canvas animation touches the DOM directly; keep it client-only.
const HeroCanvas = dynamic(() => import('@/components/HeroCanvas').then((m) => m.HeroCanvas), {
  ssr: false
});

const FORMATS_DIRECT = ['las', 'laz'];
const FORMATS_PDAL = ['e57', 'ply', 'pts', 'xyz'];

export default function HomePage(): JSX.Element {
  return (
    <main>
      <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-16 items-center w-[min(1180px,calc(100%-48px))] mx-auto pt-[88px] pb-[54px]">
        <div>
          <p className="text-[0.78rem] font-extrabold uppercase tracking-[0.13em] text-neutral-600 mb-2.5">
            Local Conversion Pipeline
          </p>
          <h1 className="text-[clamp(3.2rem,8vw,5.4rem)] leading-[0.95] tracking-[-0.06em] text-neutral-800 mb-6 max-w-[680px]">
            Upload, convert, and present point cloud data, locally.
          </h1>
          <p className="text-[clamp(1.08rem,2vw,1.25rem)] text-neutral-600 max-w-[560px] mb-7">
            Drop in a LAS, LAZ, E57, PLY, PTS, or XYZ scan. PDAL normalizes
            the format, PotreeConverter builds the octree, and Potree
            Viewer renders it &mdash; all on disk, nothing in the cloud.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-400 px-[18px] py-3 font-bold text-white shadow-[0_10px_28px_rgba(0,113,227,0.24)] hover:bg-accent-500 transition-colors"
            >
              Upload a dataset
            </Link>
            <Link
              href="/datasets"
              className="inline-flex items-center justify-center rounded-full bg-neutral-300 px-[18px] py-3 font-bold text-neutral-800 hover:bg-neutral-400 transition-colors"
            >
              View datasets
            </Link>
          </div>
        </div>

        <div className="relative min-h-[420px] lg:min-h-[500px] rounded-xl2 border border-black/[0.09] shadow-elevated overflow-hidden bg-gradient-to-b from-white to-neutral-200">
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 25% 20%, rgba(52,199,89,0.18), transparent 30%), radial-gradient(circle at 78% 26%, rgba(10,132,255,0.14), transparent 28%), radial-gradient(circle at 60% 76%, rgba(255,214,10,0.16), transparent 34%)'
            }}
          />
          <div className="absolute inset-0 z-[1]">
            <HeroCanvas />
          </div>
          <div className="absolute left-6 right-6 bottom-6 z-[2] flex items-center justify-between rounded-[22px] border border-black/[0.09] bg-white/[0.76] backdrop-blur-xl px-[18px] py-4 text-neutral-600">
            <span>Local WebGL</span>
            <strong className="text-neutral-800">Potree Viewer ready</strong>
          </div>
        </div>
      </section>

      <section className="w-[min(1180px,calc(100%-48px))] mx-auto grid grid-cols-1 md:grid-cols-3 gap-[18px] pb-[62px]">
        <FeatureCard number="01" title="Run the station" body="Start the app locally with npm run dev, no cloud account or deployment needed." />
        <FeatureCard number="02" title="Upload a scan" body="Drop a point cloud file. PDAL and PotreeConverter handle the conversion in the background." />
        <FeatureCard number="03" title="Inspect the result" body="Orbit, pan, and zoom the dataset in Potree Viewer, with eye-dome lighting and point budget control." />
      </section>

      <section className="w-[min(1180px,calc(100%-48px))] mx-auto flex flex-col md:flex-row justify-between gap-8 items-start bg-white border border-black/[0.09] rounded-xl2 p-[34px] shadow-soft mb-[62px]">
        <div>
          <p className="text-[0.78rem] font-extrabold uppercase tracking-[0.13em] text-neutral-600 mb-2.5">
            Supported in this pipeline
          </p>
          <h2 className="text-[2.2rem] leading-[1.05] tracking-[-0.045em] text-neutral-800">
            Six formats, two conversion paths.
          </h2>
        </div>
        <div className="max-w-[560px] text-neutral-600">
          <p className="mb-3">
            <span className="font-bold text-neutral-800">Direct to PotreeConverter:</span>{' '}
            {FORMATS_DIRECT.map((f) => (
              <code key={f} className="mx-0.5">.{f}</code>
            ))}
          </p>
          <p>
            <span className="font-bold text-neutral-800">Normalized via PDAL first:</span>{' '}
            {FORMATS_PDAL.map((f) => (
              <code key={f} className="mx-0.5">.{f}</code>
            ))}
          </p>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ number, title, body }: { number: string; title: string; body: string }): JSX.Element {
  return (
    <article className="rounded-[26px] border border-black/[0.09] bg-white/70 p-[26px] transition-all hover:-translate-y-1 hover:shadow-soft hover:border-accent-400/30">
      <span className="block font-extrabold text-neutral-600 mb-8">{number}</span>
      <h3 className="text-[1.35rem] mb-2 text-neutral-800">{title}</h3>
      <p className="text-neutral-600">{body}</p>
    </article>
  );
}
