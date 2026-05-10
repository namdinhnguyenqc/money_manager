/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/legacy/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1D8FE1",
        secondary: "#24C7A6",
        success: "#10b981",
        danger: "#ef4444",
        warning: "#f59e0b",
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #1D8FE1 0%, #24C7A6 100%)',
      },
    },
  },
  plugins: [],
};
