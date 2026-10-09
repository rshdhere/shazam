import { withWorkflow } from "workflow/next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@shazam/lookup",
    "@shazam/drizzle",
    "@shazam/validators",
    "@shazam/types",
  ],
};

export default withWorkflow(nextConfig);
