/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        canvas: '#FAFAFA',
        surface: '#FFFFFF',
        'surface-hover': '#F5F5F7',
        'text-primary': '#111111',
        'text-secondary': '#737373',
        'text-muted': '#A3A3A3',
        border: '#E5E5E5',
        'border-hover': '#D4D4D4',
        divider: '#F0F0F0',
        accent: '#000000',
        'accent-hover': '#262626',
        
        // Greyscale semantic colors
        green: {
          dark: '#171717',
          mid: '#262626',
          bright: '#404040',
          muted: '#737373',
          light: '#E5E5E5',
          tint: '#F5F5F7',
        },
        pink: {
          dark: '#262626',
          mid: '#404040',
          light: '#737373',
          tint: '#F5F5F7',
        },
        warning: '#404040',
        danger: '#525252',
        chip: {
          bg: '#F5F5F7',
          text: '#737373',
        },
      },
      maxWidth: {
        page: '1080px', // slightly wider layout for better spacing with sidebar
      },
      borderRadius: {
        card: '20px',
        btn: '12px',
        input: '12px',
        chip: '8px',
        modal: '24px',
      },
      spacing: {
        'section': '32px',
        'card-y': '24px',
        'card-x': '28px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(0,0,0,0.01), 0 8px 24px rgba(0,0,0,0.03)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
};
