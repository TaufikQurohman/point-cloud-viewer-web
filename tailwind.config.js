/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        // Signal accent: inspired by LiDAR elevation color ramps
        // (low -> high points rendered blue -> green -> amber in viewers).
        signal: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63'
        },
        // Alias kept for components written against the old `brand-*` scale;
        // same accent family as `signal`.
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63'
        },
        elev: {
          400: '#5eead4',
          500: '#2dd4bf'
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b'
        },
        // Base: deep instrument-panel slate, not pure black.
        ink: {
          50: '#f4f6f8',
          100: '#e7eaee',
          200: '#cdd3db',
          300: '#9aa4b2',
          400: '#6b7585',
          500: '#4a5363',
          600: '#363e4c',
          700: '#262c38',
          800: '#1a1f29',
          850: '#141821',
          900: '#0f1218',
          950: '#0b0e14'
        },
        // Alias kept for components written against the old `surface-*` scale.
        surface: {
          50: '#f4f6f8',
          100: '#e7eaee',
          200: '#cdd3db',
          800: '#1a1f29',
          900: '#0f1218'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      backgroundImage: {
        'grid-fine':
          'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)'
      },
      backgroundSize: {
        'grid-fine': '24px 24px'
      }
    }
  },
  plugins: []
};

