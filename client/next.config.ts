import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow fetching from the Express backend during server-side rendering
  experimental: {},
  // Silence the "API key in env" warning for NEXT_PUBLIC_ vars
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  },
};

export default nextConfig;
