/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C63FF',
          dark: '#5B52E0',
          light: '#8A82FF',
          soft: '#F0EFFF',
        },
        background: {
          DEFAULT: '#0F0E17',
          light: '#F8FAFC',
          card: '#1F1D2B',
        },
        surface: {
          DEFAULT: '#1F1D2B',
          alt: '#2A2839',
        },
        text: {
          main: '#FFFFFF',
          sub: '#A0A0B2',
          muted: '#6C6C80',
        },
        border: {
          DEFAULT: '#2E2B3E',
          light: '#E2E8F0',
        },
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
      },
      borderRadius: {
        card: '18px',
        md: '14px',
      },
    },
  },
  plugins: [],
};

