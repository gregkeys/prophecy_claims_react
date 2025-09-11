/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        prophecy: {
          'deep-blue': '#1e3a5f',
          'teal': '#2c5f6f',
          'golden': '#d4a574',
          'amber': '#e6b887',
          'orange': '#e89547',
          'warm-yellow': '#f4d03f',
          'cream': '#faf6f0',
          'earth-brown': '#8b6f47',
          'dark-brown': '#5d4e37',
          'light-blue': '#87ceeb',
        }
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'sans': ['Inter', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.8s ease-out forwards',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        fadeInUp: {
          'from': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'prophecy-sky': 'linear-gradient(135deg, #1e3a5f 0%, #2c5f6f 50%, #87ceeb 100%)',
        'prophecy-sunset': 'linear-gradient(135deg, #e89547 0%, #d4a574 50%, #f4d03f 100%)',
        'prophecy-divine': 'linear-gradient(135deg, #1e3a5f 0%, #d4a574 100%)',
      },
    },
  },
  plugins: [],
}
