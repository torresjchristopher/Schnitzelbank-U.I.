/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#020617',
          900: '#0a1120',
          800: '#1e293b',
          700: '#334155',
        },
        gold: {
          400: '#fbbf24',
          500: '#c5a059',
          600: '#b48a3e',
        },
        cream: {
          50: '#f8fafc',
          100: '#f1f5f9',
        },
        background: '#000000',
        foreground: '#ffffff',
        primary: '#FFC700',
        'primary-foreground': '#ffffff',
        border: '#424242',
        card: '#1a1a1a',
        'card-foreground': '#ffffff',
        secondary: '#666666',
        'secondary-foreground': '#ffffff',
        muted: '#808080',
        'muted-foreground': '#cccccc',
        accent: '#FFC700',
        'accent-foreground': '#000000',
        input: '#1a1a1a',
        ring: '#FFC700',
        destructive: '#ef4444',
        'destructive-foreground': '#fca5a5',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['Fira Code', 'Courier New', 'monospace'],
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(59, 130, 246, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
