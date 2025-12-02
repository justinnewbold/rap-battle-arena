import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fire: {
          50: '#fff5f5',
          100: '#ffe0e0',
          200: '#ffbdbd',
          300: '#ff8a8a',
          400: '#ff5252',
          500: '#ff3131',
          600: '#e01010',
          700: '#b80c0c',
          800: '#970e0e',
          900: '#7d1212',
        },
        ice: {
          50: '#f0feff',
          100: '#ccfbff',
          200: '#99f6ff',
          300: '#66f0ff',
          400: '#33e9ff',
          500: '#00d4ff',
          600: '#00b8e6',
          700: '#0093b8',
          800: '#007591',
          900: '#005c73',
        },
        gold: {
          50: '#fffef5',
          100: '#fffacc',
          200: '#fff599',
          300: '#ffef66',
          400: '#ffe833',
          500: '#ffd700',
          600: '#e6c200',
          700: '#b89800',
          800: '#917800',
          900: '#735f00',
        },
        dark: {
          50: '#f5f5f6',
          100: '#e5e5e7',
          200: '#cdcdd1',
          300: '#a9a9b0',
          400: '#7d7d87',
          500: '#62626c',
          600: '#53535c',
          700: '#46464d',
          800: '#1a1a1f',
          900: '#0d0d10',
          950: '#050507',
        }
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(255, 49, 49, 0.5)' },
          '100%': { boxShadow: '0 0 40px rgba(255, 49, 49, 0.8), 0 0 60px rgba(255, 49, 49, 0.4)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
      backgroundImage: {
        'gradient-fire': 'linear-gradient(135deg, #ff3131 0%, #ff8a8a 100%)',
        'gradient-ice': 'linear-gradient(135deg, #00d4ff 0%, #99f6ff 100%)',
        'gradient-gold': 'linear-gradient(135deg, #ffd700 0%, #ffef66 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1a1a1f 0%, #0d0d10 100%)',
        'gradient-versus': 'linear-gradient(90deg, #ff3131 0%, #0d0d10 50%, #00d4ff 100%)',
      },
    },
  },
  plugins: [],
}

export default config
