import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: false,
  },
  async redirects() {
    return [
      {
        source: "/join/:path*",
        has: [
          {
            type: "host",
            value: "po-wp7jbhs5z-vbaddams-projects.vercel.app",
          },
        ],
        destination: "https://po-v-six.vercel.app/join/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
