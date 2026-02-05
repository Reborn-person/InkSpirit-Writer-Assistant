import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['react-markdown', 'remark-gfm'],

  // Disable ESLint during builds to save memory
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Disable source maps in production to save memory and disk space
  productionBrowserSourceMaps: false,
  
  // Experimental options for low memory environments
  experimental: {
    // Limit to 1 CPU to reduce parallel memory usage
    cpus: 1,
    // Disable worker threads to save overhead
    workerThreads: false,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  // 独立输出模式，优化 Docker 镜像体积和运行性能
  output: 'standalone',
  // outputFileTracingRoot: path.join(__dirname, '..', '..', '..'),
};

export default nextConfig;
