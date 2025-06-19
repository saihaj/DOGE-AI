import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  transpilePackages: ['react-tweet'],
  async redirects() {
    return [
      {
        source: '/store',
        destination: 'https://dogeai.printify.me',
        permanent: false,
      },
      {
        source: '/white-label',
        destination:
          'https://rhetor.ai?utm_source=dogeai&utm_medium=website&utm_campaign=redirect',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
