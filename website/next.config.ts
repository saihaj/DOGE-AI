import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/store',
        destination: 'https://dogeai.printify.me',
        permanent: false,
      },
    ];
  },
  typescript: {
    // we run this in a monorepo, so we need to ignore build errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
