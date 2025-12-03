import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/lib/store': path.resolve(__dirname, './lib/modules/store.ts'),
      '@/lib/utils': path.resolve(__dirname, './lib/modules/utils.ts'),
      '@/lib/supabase': path.resolve(__dirname, './lib/modules/supabaseClient.ts'),
    };
    return config;
  },
};

export default nextConfig;
