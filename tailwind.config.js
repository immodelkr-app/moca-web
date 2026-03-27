/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Legacy
        "primary": "#9333EA",
        "dark-charcoal": "#1F1235",
        "deep-slate-grey": "#5B4E7A",
        // A-Plan Moca palette
        "moca-bg":       "#F3F0FF",
        "moca-bg-alt":   "#EDE8FF",
        "moca-surface":  "#FFFFFF",
        "moca-surface-2":"#F8F5FF",
        "moca-border":   "#E8E0FA",
        "moca-primary":  "#9333EA",
        "moca-primary-2":"#7C3AED",
        "moca-primary-lt":"#F3E8FF",
        "moca-accent":   "#C084FC",
        "moca-text":     "#1F1235",
        "moca-text-2":   "#5B4E7A",
        "moca-text-3":   "#9CA3AF",
        "moca-gold":     "#D97706",
      },
      fontFamily: {
        "display": ["Manrope", "sans-serif"],
        "sans": ["Manrope", "sans-serif"]
      },
      borderRadius: {
        "lg": "1rem",
        "xl": "1.5rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        "moca":    "0 4px 24px rgba(147, 51, 234, 0.12)",
        "moca-lg": "0 8px 40px rgba(147, 51, 234, 0.18)",
      }
    },
  },
  plugins: [],
}
