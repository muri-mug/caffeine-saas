import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sarta/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
