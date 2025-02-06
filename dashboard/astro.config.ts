import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import { config } from 'dotenv';
import react from '@astrojs/react';
config();

// https://astro.build/config
export default defineConfig({
  vite: {
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
  ],
});
