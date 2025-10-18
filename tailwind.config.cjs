/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern Gold Palette
        gold: {
          primary: '#D4AF37',
          secondary: '#A67C00',
          light: '#E5C878',
          dark: '#8B6914',
        },
        // Backgrounds (permanent dark theme)
        'bg-dark': '#0d1117',
        'bg-light': '#161b22',
        // Text (light text for dark theme)
        'text-dark': '#e6edf3',
        'text-light': '#c9d1d9',
      },
      transitionDuration: {
        '600': '600ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(to bottom, #D4AF37, #A67C00)',
        'gold-gradient-hover': 'linear-gradient(to bottom, #E5C878, #D4AF37)',
        'gold-shimmer': 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent)',
      },
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(212, 175, 55, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.5)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};


