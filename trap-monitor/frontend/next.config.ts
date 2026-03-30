import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@trackline/supabase-config", "@trackline/ui"],
};

export default nextConfig;
