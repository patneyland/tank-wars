/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Chakra Petch", "Rajdhani", "sans-serif"],
        body: ["Rajdhani", "sans-serif"]
      },
      colors: {
        steel: {
          50: "#f4f7fb",
          100: "#e2e9f3",
          200: "#c3cfdf",
          300: "#9db0c7",
          400: "#6e86a5",
          500: "#536a87",
          600: "#3f4f6a",
          700: "#2f3a4f",
          800: "#1f2736",
          900: "#111722",
          950: "#0a0f17"
        }
      }
    }
  },
  plugins: []
};
