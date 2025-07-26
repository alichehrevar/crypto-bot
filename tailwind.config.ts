import type { Config } from "tailwindcss";

import { heroui } from "@heroui/theme";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        primary: {
          DEFAULT: '#ffffff',
          50: '#F5F5F5',
          100: '#E5E5E5',
          200: '#D4D4D4',
          300: '#C4C4C4',
          400: '#B3B3B3',
          500: '#A3A3A3',
          600: '#939393',
          700: '#828282',
          800: '#717171',
        },
        green: {
          DEFAULT: "#9EF01A",
          50: "#E6F9E6",
          100: "#C6F5C6",
          200: "#A6F1A6",
          300: "#86EE86",
          400: "#66EB66",
          500: "#46E746",
          600: "#36E336",
          700: "#26DF26",
          800: "#16DB16",
        },
        greenSecondary: {
          DEFAULT: "#4CAF50",
          50: "#E8F5E9",
          100: "#C8E6C9",
          200: "#A5D6A7",
          300: "#81C784",
          400: "#66BB6A",
          500: "#4CAF50",
          600: "#43A047",
          700: "#38973D",
          800: "#2E8E34",
        },
        greenDark: {
          DEFAULT: "#4E9B10",
          50: "#E8F5E9",
          100: "#C8E6C9",
          200: "#A5D6A7",
          300: "#81C784",
          400: "#66BB6A",
          500: "#4CAF50",
          600: "#43A047",
          700: "#38973D",
        },
        cyan: {
          DEFAULT: "#1E5171",
          50: "#E8F5E9",
          100: "#C8E6C9",
          200: "#A5D6A7",
          300: "#81C784",
          400: "#66BB6A",
          500: "#4CAF50",
          600: "#43A047",
        },
        blue: {
          DEFAULT: "#5FA8D3",
          50: "#E8F5FF",
          100: "#C8E6FF",
          200: "#A5D6FF",
          300: "#81C7FF",
          400: "#66BBFF",
        }
      }
    },
  },
  darkMode: "class",
  plugins: [heroui()],
}

export default config;
