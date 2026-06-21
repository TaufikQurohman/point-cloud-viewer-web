'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/upload', label: 'Upload', code: '01' },
  { href: '/datasets', label: 'Datasets', code: '02' }
] as const;

export function NavBar(): JSX.Element {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-paper-100/95 backdrop-blur-sm border-b-2 border-ink-700">
      <div className="mx-auto max-w-6xl px-6">
        <div className="h-[4.5rem] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <BenchmarkMark />
            <span className="flex flex-col leading-none">
              <span className="font-display font-semibold text-ink-700 text-[17px] tracking-tight">
                Point Cloud Viewer
              </span>
              <span className="font-mono text-[10px] text-ink-500 tracking-[0.15em] uppercase mt-1">
                Survey &amp; Conversion Station
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-8">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname?.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex items-center gap-2"
                >
                  <span
                    className={[
                      'font-mono text-[10px] tracking-wider transition-colors',
                      active ? 'text-rust-400' : 'text-ink-400 group-hover:text-rust-400'
                    ].join(' ')}
                  >
                    {link.code}
                  </span>
                  <span
                    className={[
                      'text-sm font-medium transition-colors border-b-[1.5px] pb-0.5',
                      active
                        ? 'text-ink-700 border-rust-400'
                        : 'text-ink-500 border-transparent group-hover:text-ink-700 group-hover:border-ink-400'
                    ].join(' ')}
                  >
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

/** Signature mark: a survey benchmark disc with a centered sight cross. */
function BenchmarkMark(): JSX.Element {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink-700 bg-paper-50">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="9" cy="9" r="7.5" stroke="#3D6B4F" strokeWidth="1" />
        <circle cx="9" cy="9" r="2.5" fill="#B5472B" />
        <line x1="9" y1="0.5" x2="9" y2="3.5" stroke="#1F2B24" strokeWidth="1" />
        <line x1="9" y1="14.5" x2="9" y2="17.5" stroke="#1F2B24" strokeWidth="1" />
        <line x1="0.5" y1="9" x2="3.5" y2="9" stroke="#1F2B24" strokeWidth="1" />
        <line x1="14.5" y1="9" x2="17.5" y2="9" stroke="#1F2B24" strokeWidth="1" />
      </svg>
    </span>
  );
}
