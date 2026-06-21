/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        // Paper: warm cream base, like survey field-book paper, not sterile white.
        paper: {
          50: '#FFFFFF',
          100: '#FAF8F3',
          200: '#F2EEE3',
          300: '#E8E1D1',
          400: '#D6CCB3'
        },
        // Ink: dark green-black, like classic surveyor's drafting ink.
        ink: {
          400: '#5C6B5F',
          500: '#3F4D42',
          600: '#2C382F',
          700: '#1F2B24',
          800: '#16201A',
          900: '#0F1712'
        },
        // Survey green: the primary accent, color of old theodolites and
        // engineering instrument enamel.
        survey: {
          50: '#EEF4F0',
          100: '#D6E5DA',
          200: '#AFCBB7',
          300: '#7FA98C',
          400: '#528763',
          500: '#3D6B4F',
          600: '#2F5440',
          700: '#244033',
          800: '#1B3026'
        },
        // Rust/terracotta: secondary accent, the color of a benchmark stamp
        // or surveyor's chalk line.
        rust: {
          50: '#FBEEE9',
          100: '#F4D4C6',
          200: '#E5AC92',
          300: '#D17F5C',
          400: '#B5472B',
          500: '#9A3A22',
          600: '#7C2E1B'
        },
        // Grid/border lines: muted brown-gray, like faded blueprint lines.
        grid: {
          200: '#E5DFCE',
          300: '#D8CFB5',
          400: '#BBAF8E'
        }
      },
      fontFamily: {
        display: ['"Spectral"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      backgroundImage: {
        'grid-mm':
          'linear-gradient(rgba(63,107,79,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(63,107,79,0.08) 1px, transparent 1px)',
        'grid-mm-fine':
          'linear-gradient(rgba(63,107,79,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(63,107,79,0.04) 1px, transparent 1px)'
      },
      backgroundSize: {
        'grid-mm': '32px 32px',
        'grid-mm-fine': '8px 8px'
      }
    }
  },
  plugins: []
};
