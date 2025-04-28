import type { NextConfig } from 'next';
import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';
import { API_URL } from '@/lib/const';

if (process.env.NODE_ENV === 'development') {
  setupDevPlatform();
}

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  redirects: async () => {
    return [
      {
        source: '/api/chat',
        destination: `${API_URL}/api/userchat`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
