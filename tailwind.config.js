/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Menambahkan palet warna merah PMR yang lebih lengkap
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          700: '#b91c1c',
          800: '#991b1b', // Warna utama PMR
          900: '#7f1d1d',
        },
        // Warna pendukung untuk elemen dashboard
        slate: {
          900: '#0f172a',
        }
      },
      // Menambahkan konfigurasi animasi dasar jika plugin animasi tidak terinstal
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'zoom-in': 'zoomIn 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        zoomIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}