/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        Inter: 'Inter',
        Orbit: 'Orbit',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ['light', 'dark']
  }
}