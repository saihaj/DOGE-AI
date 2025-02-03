// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwind from '@astrojs/tailwind';

import { loadEnv } from "vite";
const { PUBLIC_API_URL } = loadEnv(process.env.PUBLIC_API_URL, process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind({
			applyBaseStyles: false,
		}), 
  ],
  env: {
    schema: {
      PUBLIC_API_URL: envField.string({
        context: 'client',
        access: 'public',
        optional: false,
      }),
    },
  },
});
