/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          400: "#f0b429",
          500: "#d97706",
        },
        surface: {
          DEFAULT: "#111827",
          2: "#1f2937",
          3: "#374151",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Courier New'", "monospace"],
      },
    },
  },
  plugins: [],
};
