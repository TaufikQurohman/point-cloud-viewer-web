'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/upload', label: 'Upload' },
  { href: '/datasets', label: 'Datasets' }
] as const;

export function NavBar(): JSX.Element {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <OctreeMark />
          <span className="flex flex-col leading-none">
            <span className="font-semibold text-ink-50 tracking-tight text-[15px]">
              Point&nbsp;Cloud&nbsp;Viewer
            </span>
            <span className="font-mono text-[10px] text-ink-400 tracking-widest uppercase mt-0.5">
              local · filesystem
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'relative px-3.5 py-2 rounded-md text-sm font-medium transition-colors',
                  active ? 'text-signal-300' : 'text-ink-300 hover:text-ink-50'
                ].join(' ')}
              >
                {link.label}
                {active && (
                  <span className="absolute left-3.5 right-3.5 -bottom-px h-px bg-signal-400" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/** Small signature mark: an octree subdivision motif (root + recursive split). */
function OctreeMark(): JSX.Element {
  return (
    <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-ink-850 border border-white/[0.08]">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="0.5" y="0.5" width="15" height="15" rx="1.5" stroke="#2dd4bf" strokeOpacity="0.5" />
        <rect x="0.5" y="0.5" width="7" height="7" rx="1" fill="#22d3ee" fillOpacity="0.85" />
        <rect x="8.5" y="0.5" width="7" height="7" rx="1" stroke="#22d3ee" strokeOpacity="0.45" />
        <rect x="0.5" y="8.5" width="7" height="7" rx="1" stroke="#22d3ee" strokeOpacity="0.45" />
        <rect x="9" y="9" width="3" height="3" rx="0.5" fill="#5eead4" />
      </svg>
    </span>
  );
}
