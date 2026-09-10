/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  safelist: ['bg-brand-500/15', 'bg-warning/15', 'bg-success/15', 'bg-danger/15'],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#ECF9FA',100:'#D5F2F4',200:'#AFE5E8',300:'#75CCD2',400:'#35B1BA',500:'#078F9B',600:'#067887',700:'#075E70',800:'#07485A',900:'#063548' },
        accent: { 50:'#FFF4EB',100:'#FFE4CF',200:'#FFC89F',300:'#FFAA6A',400:'#FF8A32',500:'#FF6A00',600:'#E85C00',700:'#C94F00',800:'#A44200',900:'#843600' },
        ink: { 900:'#0F1729',700:'#33415C',500:'#64748B',400:'#8996AA',300:'#A6B0C3' },
        surface: { 0:'#FFFFFF',50:'#F7F9FC',100:'#EEF1F7' },
        line: '#E4E9F2',
        success: '#16A34A',
        warning: '#F5A524',
        danger: '#EF4444',
        gold: '#F5A524',
        dark: { bg:'#0A0F1D', surface:'#121A2E', surface2:'#17203A', border:'#232D48' },
      },
      fontFamily: {
        display: ['"Manrope"', 'sans-serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: { xl: '1rem', '2xl': '1.25rem', '3xl': '1.75rem' },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 23, 41, 0.04), 0 8px 24px -8px rgba(15, 23, 41, 0.08)',
        softer: '0 1px 2px rgba(15, 23, 41, 0.03), 0 4px 12px -4px rgba(15, 23, 41, 0.06)',
        lift: '0 12px 32px -12px rgba(7, 143, 155, 0.35)',
        'soft-dark': '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px -8px rgba(0,0,0,0.45)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: { 'fade-up': 'fade-up 0.5s ease-out both' },
    },
  },
  plugins: [],
}
