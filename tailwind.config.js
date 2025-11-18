/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        matrixGreen: "#00ff41",
        matrixDark: "#000000"
      },
      fontFamily: {
        matrix: ["Courier New", "monospace"]
      }
    }
  },
  plugins: []
};

