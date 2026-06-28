/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm terracotta is the "hand-raised, helping a neighbor" accent —
        // distinct from the generic blue/indigo SaaS palette, and read
        // culturally as warm/earthy rather than corporate.
        brand: {
          50: '#FBF3EC',
          100: '#F5E2D0',
          300: '#E5AD7C',
          500: '#C9682F', // primary accent
          600: '#AD5424',
          700: '#8A4119',
        },
        // Deep teal-green for "trust/verified" states — distinct from brand accent.
        trust: {
          50: '#EAF5F0',
          300: '#7EC9AB',
          500: '#2E8B6B',
          700: '#1F6049',
        },
        sos: {
          500: '#D43B2E',
          600: '#B82E22',
        },
        ink: {
          900: '#1B1815', // near-black warm ink, not pure #000
          700: '#3D3733',
          500: '#6B6258',
          300: '#A89E92',
          100: '#E8E2D8',
          50: '#F7F4EE',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '16px',
      },
    },
  },
  plugins: [],
};
