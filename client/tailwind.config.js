/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.tsx",
  ],
  theme: {
    extend: {
        colors: {
            primary: "#F8C4D4",
            secondary: "#301D16",
        }
    },
  },
  plugins: [],
}

