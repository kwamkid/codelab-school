import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'profile.line-scdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sprofile.line-scdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // อนุญาต ngrok domain สำหรับ development
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*' // หรือระบุ ngrok domain ของคุณ
          },
        ],
      },
      {
        source: '/liff/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
        ],
      },
    ]
  },
  
  // เพิ่ม experimental config สำหรับ allowed origins
  experimental: {
    // อนุญาต ngrok domains
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.ngrok.app',
        '*.ngrok-free.app',
        'a3b8-2405-9800-b670-c34-1945-f2ac-abc9-a72e.ngrok-free.app'
      ]
    }
  },
  
  reactStrictMode: true
};

export default nextConfig;