/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17233c",
        teal: "#006b73",
        sea: "#11a6a6",
        leaf: "#43b35a",
        sun: "#ffc247",
        coral: "#ff6147",
        cloud: "#f5f9fb"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(23, 35, 60, 0.10)"
      },
      fontFamily: {
        sans: ["Nunito", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};
