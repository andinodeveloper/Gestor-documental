import type { NextConfig, SizeLimit } from "next";

const serverActionsBodySizeLimit = (
  process.env.SERVER_ACTIONS_BODY_SIZE_LIMIT?.trim() || "64mb"
) as SizeLimit;
const proxyClientMaxBodySize = (
  process.env.PROXY_CLIENT_MAX_BODY_SIZE?.trim() || serverActionsBodySizeLimit
) as SizeLimit;

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Next.js 16 buffers request bodies at the proxy layer before the Server Action
    // receives them. Keep this aligned with the server action body limit so uploads
    // larger than the proxy default 10 MB are not truncated mid-form.
    proxyClientMaxBodySize,
    serverActions: {
      // The request form allows multiple attachments and the app already enforces
      // per-file validation separately. Next.js defaults server action bodies to 1 MB,
      // which rejects valid submissions before our own attachment rules run.
      bodySizeLimit: serverActionsBodySizeLimit,
    },
  },
};

export default nextConfig;
