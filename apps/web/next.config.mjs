/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@sarta/shared'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
