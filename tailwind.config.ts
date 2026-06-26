/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background_primary: "rgb(var(--bg-primary) / <alpha-value>)",
        background_secondary: "rgb(var(--bg-secondary) / <alpha-value>)",
        background_card: "rgba(var(--bg-card) / var(--card-alpha))",
        background_card_hover: "rgba(var(--bg-card-hover) / var(--card-hover-alpha))",
        primary_blue: "rgb(var(--primary-blue) / <alpha-value>)",
        primary_blue_hover: "rgb(var(--primary-blue-hover) / <alpha-value>)",
        success_green: "rgb(var(--success-green) / <alpha-value>)",
        success_green_hover: "rgb(var(--success-green-hover) / <alpha-value>)",
        danger_red: "rgb(var(--danger-red) / <alpha-value>)",
        warning_amber: "rgb(var(--warning-amber) / <alpha-value>)",
        info_cyan: "rgb(var(--info-cyan) / <alpha-value>)",
        text_primary: "rgb(var(--text-primary) / <alpha-value>)",
        text_secondary: "rgb(var(--text-secondary) / <alpha-value>)",
        text_muted: "rgb(var(--text-muted) / <alpha-value>)",
        border_default: "rgb(var(--border-default) / var(--border-alpha))",
        border_custom: "rgb(var(--border-default) / <alpha-value>)",
        border_light: "rgb(var(--border-light) / 0.05)",
        sidebar_bg: "rgb(var(--sidebar-bg) / <alpha-value>)",
        topbar_bg: "rgb(var(--topbar-bg) / <alpha-value>)",
        bg_footer: "rgb(var(--bg-footer) / <alpha-value>)",
        table_header_from: "rgb(var(--bg-table-header-from) / <alpha-value>)",
        table_header_to: "rgb(var(--bg-table-header-to) / <alpha-value>)",
      },
      fontFamily: {
        arabic: ['Cairo', 'Noto Kufi Arabic', 'sans-serif'],
        french: ['Inter', 'sans-serif'],
        numbers: ['JetBrains Mono', 'monospace'],
        vazirmatn: ['Vazirmatn', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
      },
      spacing: {
        '11': '2.75rem',
        '13': '3.25rem',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glass-modal': '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        'glow-emerald': '0 0 20px rgba(16, 185, 129, 0.15)',
        'glow-blue': '0 0 20px rgba(37, 99, 235, 0.15)',
        'glow-rose': '0 0 20px rgba(244, 63, 94, 0.15)'
      }
    },
  },
  plugins: [],
}
