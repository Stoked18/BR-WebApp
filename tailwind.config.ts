import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marke: {
          50: '#eef4fb', 100: '#d8e6f6', 200: '#b3cdec', 300: '#84ade0',
          400: '#5289cf', 500: '#316bb8', 600: '#245597', 700: '#1e447a',
          800: '#1b3a64', 900: '#193154',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
