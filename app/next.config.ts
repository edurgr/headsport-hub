import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable strict TypeScript checking in production builds
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable ESLint checking during builds
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Fix workspace root detection issue
  outputFileTracingRoot: __dirname,
  // Optimize images and enable other performance features
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  // Experimental features disabled to avoid chunk path issues in server runtime
  // experimental: {
  //   optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
  // },
  // Default output for Next.js Pages/SSR on Cloudflare Pages
  // output: 'standalone',
  trailingSlash: false,
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          }
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type,Authorization,X-Requested-With'
          },
        ],
      },
    ];
  },
};

export default nextConfig;
