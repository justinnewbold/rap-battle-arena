/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/lib': './libs',
    };
    return config;
  },
};

export default nextConfig;