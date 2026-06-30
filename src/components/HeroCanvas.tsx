'use client';

import { useEffect, useRef } from 'react';

/**
 * Decorative animated point-cloud preview for the home page hero.
 * Ported from the team's vanilla-JS `drawHeroPreview` (assets/js/upload.js)
 * into a React-managed canvas with proper cleanup on unmount.
 */
export function HeroCanvas(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let cancelled = false;

    function resize() {
      if (!canvas) return;
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      if (cancelled || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx!.clearRect(0, 0, w, h);

      const t = Date.now() * 0.00025;
      const cx = w * 0.5;
      const cy = h * 0.52;

      for (let i = 0; i < 4200; i++) {
        const a = i * 0.034 + t;
        const ring = Math.sqrt(i / 4200);
        const x = Math.cos(a) * ring * 220;
        const y = Math.sin(a * 1.7) * ring * 60 + Math.sin(i * 0.01 + t * 2) * 28;
        const z = Math.sin(a) * ring * 180;
        const px = cx + x + z * 0.32;
        const py = cy + y - z * 0.18;
        const shade = Math.max(0, Math.min(1, (y + 90) / 180));
        ctx!.fillStyle = `rgba(${Math.floor(40 + 80 * shade)},${Math.floor(90 + 110 * shade)},${Math.floor(150 + 80 * shade)},${0.32 + 0.5 * ring})`;
        ctx!.fillRect(px, py, 1.35, 1.35);
      }

      rafId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}
