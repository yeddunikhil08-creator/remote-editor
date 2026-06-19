/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // We will force dark mode globally or support toggle
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0b0f19",
          darker: "#05070c",
          card: "#111827",
          border: "#1f2937",
          muted: "#9ca3af",
          accent: "#0ea5e9",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444"
        }
      }
    },
  },
  plugins: [],
}
