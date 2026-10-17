/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ceylon: {
          dark: '#123D2B',
          leaf: '#286B45',
          emerald: '#3D8B62',
          ivory: '#F8F5ED',
          palegreen: '#E8F0E5',
          gold: '#C6A15B',
          charcoal: '#202922',
          muted: '#778278',
        },
      },
    },
  },
  plugins: [],
};
