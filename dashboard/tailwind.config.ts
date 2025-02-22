import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{astro,js,ts,tsx,md,mdx}'],
  darkMode: ['selector', '[data-theme="dark"]', 'class'],
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
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
    },
  },
  plugins: [require('daisyui'), require('tailwindcss-animate')],
};

export default config;
