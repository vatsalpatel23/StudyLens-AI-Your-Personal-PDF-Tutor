/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FBFBFA',
          100: '#F8F7F4',   // Core warm off-white background
          200: '#F2F0EB',   // Subtle secondary background
          300: '#E7E5E1',   // Standard subtle border
          400: '#D5D2CA',   // Prominent border
          500: '#B8B4AA',
        },
        ink: {
          900: '#1A1C1E',   // Primary text
          800: '#2A2D32',   // Secondary headings
          700: '#444850',   // Long-form body reading text
          600: '#5E636E',   // Supporting secondary text
          500: '#7A808C',   // Metadata & muted captions
          400: '#9CA3AF',   // Placeholders
          300: '#CBD5E1',
        },
        accent: {
          DEFAULT: '#4F46E5', // Deep indigo primary accent
          hover: '#4338CA',   // Accent hover state
          light: '#EEF2FF',   // Subtle accent tint background
          dark: '#3730A3',    // High-contrast accent text
          muted: '#6366F1',
        },
        sage: {
          DEFAULT: '#16845B', // Verified success green
          light: '#EBF6F1',
          border: '#BFE4D3',
          dark: '#0E5C3E',
        },
        amber: {
          DEFAULT: '#B7791F', // Scholarly highlight amber
          light: '#FEF9EE',
          border: '#FDE6B4',
          dark: '#784E10',
        },
        crimson: {
          DEFAULT: '#C24141', // Error red
          light: '#FDF2F2',
          border: '#F8C8C8',
          dark: '#8E2828',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'Cambria', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 2px 8px -2px rgba(0, 0, 0, 0.03)',
        'elevated': '0 4px 20px -2px rgba(26, 28, 30, 0.08), 0 2px 6px -1px rgba(26, 28, 30, 0.04)',
        'modal': '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'highlight-pulse': 'highlightPulse 2s cubic-bezier(0.4, 0, 0.6, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        highlightPulse: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '20%, 60%': { backgroundColor: 'rgba(254, 249, 238, 0.95)' },
        },
      },
    },
  },
  plugins: [],
}
