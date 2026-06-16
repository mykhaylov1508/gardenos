/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Палітра GardenOS — земляні, теплі кольори
        garden: {
          green: '#2d4a27',      // темний зелений (дерево)
          cream: '#f5f0e8',      // кремовий (папір)
          terracotta: '#c4603a', // теракот (глина)
          harvest: '#d4a839',    // жовтий (пшениця)
          water: '#4a7fa5',      // синій (вода)
          alert: '#e8533a',      // червоний (тривога)
          leaf: '#7ba05b',       // світло-зелений (листя)
        }
      },
      fontFamily: {
        sans: ['Nunito Sans', 'sans-serif'],
        display: ['Nunito', 'sans-serif'],
      }
    },
  },
  plugins: [],
}