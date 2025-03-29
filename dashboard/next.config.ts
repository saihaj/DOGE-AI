import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // we run this in a monorepo, so we need to ignore build errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
