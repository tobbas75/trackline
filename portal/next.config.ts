import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@trackline/supabase-config", "@trackline/ui"],
};

export default nextConfig;
