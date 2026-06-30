/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        // Apple-style neutral scale, matching CloudScope's --bg / --surface / --text / --muted.
        neutral: {
          50: '#FBFBFD',
          100: '#F5F5F7',
          200: '#EDEDF2',
          300: '#E8E8ED',
          400: '#DEDEE4',
          500: '#C7C7CC',
          600: '#6E6E73',
          700: '#3A3A3C',
          800: '#1D1D1F',
          900: '#0F0F10'
        },
        // Primary accent: Apple system blue.
        accent: {
          50: '#EFF6FF',
          100: '#DCEBFF',
          400: '#0071E3',
          500: '#0064C8',
          600: '#0050A0'
        },
        // Viewer surfaces stay dark regardless of the light theme.
        viewer: {
          bg: '#15171C',
          panel: '#1D2028',
          sidebar: '#F7F7F9'
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Inter',
          'Roboto',
          'Arial',
          'sans-serif'
        ],
        mono: ['"SF Mono"', 'Consolas', 'ui-monospace', 'monospace']
      },
      borderRadius: {
        xl2: '32px',
        lg2: '24px',
        md2: '16px'
      },
      boxShadow: {
        soft: '0 14px 36px rgba(0,0,0,0.07)',
        elevated: '0 24px 60px rgba(0,0,0,0.10)'
      }
    }
  },
  plugins: []
};
