import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
    // If serving local images via next/image from a non-standard path,
    // you might need to configure domains or pathnames here.
    // However, files in `public` are served statically and should work by default.
    // domains: ['localhost'], // Example for local development if needed.
  },
};

export default nextConfig;
