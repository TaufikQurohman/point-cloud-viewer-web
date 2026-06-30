'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/upload', label: 'Upload' },
  { href: '/datasets', label: 'Datasets' }
] as const;

export function NavBar(): JSX.Element | null {
  const pathname = usePathname();

  // The viewer page renders its own sidebar with a CloudScope mark and a
  // "back to datasets" link, so showing the floating pill navbar on top
  // of it would be a redundant second header competing for the same
  // space. Hide it there, the same way full-screen editor tools (Figma,
  // Blender) drop the marketing nav once you're inside the workspace.
  if (pathname?.startsWith('/viewer/')) {
    return null;
  }

  return (
    <div className="w-[min(1180px,calc(100%-48px))] mx-auto mt-[18px] sticky top-4 z-40">
      <header className="h-14 flex items-center justify-between rounded-full border border-black/[0.09] bg-white/[0.78] backdrop-blur-2xl pl-[18px] pr-[10px]">
        <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-neutral-800">
          <BrandMark />
          <span>CloudScope</span>
        </Link>

        <nav className="flex items-center gap-1 text-[0.94rem] text-neutral-600">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'px-3 py-2.5 rounded-full transition-colors',
                  active ? 'bg-black/[0.05] text-neutral-800' : 'hover:bg-black/[0.05] hover:text-neutral-800'
                ].join(' ')}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/upload"
            className="ml-1 inline-flex items-center justify-center rounded-full border border-black/[0.09] bg-white/[0.65] px-3.5 py-2 text-sm font-bold text-neutral-800 hover:bg-white transition-colors"
          >
            Open Viewer
          </Link>
        </nav>
      </header>
    </div>
  );
}

function BrandMark(): JSX.Element {
  return (
    <span
      className="h-[22px] w-[22px] rounded-[9px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.32)]"
      style={{ background: 'linear-gradient(145deg, #1d1d1f, #6e6e73)' }}
    />
  );
}
