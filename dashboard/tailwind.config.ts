import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{astro,js,ts,tsx,md,mdx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  corePlugins: {
    preflight: true,
    boxShadow: true,
    borderColor: true,

    // We disable those because they add stuff to the CSS file even when unused
    filter: false,
    backdropFilter: false,
    ringWidth: false,
    ringColor: false,
    ringOffsetWidth: false,
    ringOffsetColor: false,
    transform: false,
    touchAction: false,
    scrollSnapType: false,
    borderOpacity: false,
    textOpacity: false,

    // Things we might need in the future but disable for now as they also add stuff
    fontVariantNumeric: false,
  },

  theme: {
    extend: {
      keyframes: {
        'transform-in': {
          '0%': {
            transform: 'translateY(60px) scale(1.5) translateZ(0)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0) scale(1) translateZ(0)',
            opacity: '1',
          },
        },
        'loading-pulse': {
          '0%, 100%': {
            transform: 'translateY(0) scale(1) translateZ(0)',
            opacity: '1',
          },
          '50%': {
            transform: 'translateY(60px) scale(1.3) translateZ(0)',
            opacity: '0.5',
          },
        },
      },
      animation: {
        'transform-in': 'transform-in 2.0s ease-out forwards',
        'loading-pulse': 'loading-pulse 4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('daisyui'), require('tailwindcss-animate')],
};

export default config;
