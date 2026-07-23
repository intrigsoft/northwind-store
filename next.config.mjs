import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle (.next/standalone) so the Docker
  // runtime stage needs only that output + .next/static + public — no full
  // node_modules. The standalone server.js honours PORT and HOSTNAME env vars.
  output: 'standalone',
  // This sample is self-contained; pin the tracing root to silence the
  // "multiple lockfiles" warning from the monorepo root's package-lock.json.
  outputFileTracingRoot: __dirname,
  // The storefront renders product imagery via plain <img> pointing at our own
  // `/api/images/[key]` route, which proxies the upstream CDN. Nothing in the
  // client bundle references an external image host directly, so no
  // `images.remotePatterns` config is required.
};

export default nextConfig;
