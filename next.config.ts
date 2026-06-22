import type { NextConfig, SizeLimit } from "next";

const serverActionsBodySizeLimit = (
  process.env.SERVER_ACTIONS_BODY_SIZE_LIMIT?.trim() || "64mb"
) as SizeLimit;

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      // The request form allows multiple attachments and the app already enforces
      // per-file validation separately. Next.js defaults server action bodies to 1 MB,
      // which rejects valid submissions before our own attachment rules run.
      bodySizeLimit: serverActionsBodySizeLimit,
    },
  },
};

export default nextConfig;
