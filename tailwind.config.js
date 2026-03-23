/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#1241a1",
        "dark-charcoal": "#222222",
        "deep-slate-grey": "#4A5568",
        "background-light": "#FFFFFF",
        "surface-light": "#F8F9FA",
        "border-light": "#EEEEEE"
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"],
        "sans": ["Manrope", "sans-serif"]
      },
      borderRadius: {
        "lg": "2rem",
        "xl": "3rem",
      },
    },
  },
  plugins: [],
}
