import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ['react-markdown', 'remark-gfm'],
  // 忽略 TypeScript 错误，加快构建速度
  typescript: {
    ignoreBuildErrors: true,
  },
  // 独立输出模式，优化 Docker 镜像体积和运行性能
  output: 'standalone',
  // outputFileTracingRoot: path.join(__dirname, '..', '..', '..'),
};

export default nextConfig;
