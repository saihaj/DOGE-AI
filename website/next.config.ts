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
};

export default nextConfig;
